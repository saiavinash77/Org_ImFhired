"""
Interview Chat Endpoint — Groq-powered voice interview
=======================================================
Replaces OpenAI Realtime API with:
  - Groq Whisper (whisper-large-v3-turbo) for STT via httpx
  - Groq LLaMA for AI interviewer responses
  - Browser speechSynthesis for TTS (handled on frontend)
"""
import json
import uuid
import tempfile
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import httpx
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import get_pg_pool
from app.api.v1.endpoints.auth import get_current_user
from app.services.ai_interviewer import InterviewStateMachine, InterviewPhase

router = APIRouter()

# Groq client for LLM
groq = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

# In-memory session store
_sessions: dict = {}


# ── Transcribe audio via Groq Whisper (httpx — more reliable than SDK) ───────

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    interview_id: str = Form(...),
):
    """Receive audio blob, transcribe with Groq Whisper."""
    content = await audio.read()
    if len(content) < 500:
        return JSONResponse({"text": "", "error": "Audio too short"})

    # Determine file extension
    suffix = ".webm"
    ct = audio.content_type or ""
    if "wav" in ct:
        suffix = ".wav"
    elif "mp4" in ct or "m4a" in ct:
        suffix = ".m4a"
    elif "ogg" in ct:
        suffix = ".ogg"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files={"file": (f"audio{suffix}", content, ct or "audio/webm")},
                data={
                    "model": "whisper-large-v3-turbo",
                    "language": "en",
                    "response_format": "text",
                },
            )
        if r.status_code == 200:
            text = r.text.strip()
            print(f"[Whisper] '{text[:100]}'")
            return JSONResponse({"text": text})
        else:
            print(f"[Whisper] Error {r.status_code}: {r.text[:200]}")
            return JSONResponse({"text": "", "error": r.text[:200]})
    except Exception as e:
        print(f"[Whisper] Exception: {e}")
        return JSONResponse({"text": "", "error": str(e)})


# ── Get AI response via Groq LLaMA ───────────────────────────────────────────

class RespondRequest(BaseModel):
    interview_id: str
    candidate_text: str
    is_text_input: bool = False  # True if typed, False if spoken


@router.post("/respond")
async def get_ai_response(
    data: RespondRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Given candidate's transcribed text, generate AI interviewer response.
    Uses the interview state machine to track rounds and context.
    """
    session = _sessions.get(data.interview_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found. Please start the interview first.")

    state_machine: InterviewStateMachine = session["state_machine"]
    transcript: list = session["transcript"]

    # Add candidate turn to transcript
    candidate_turn = {
        "speaker": "candidate",
        "text": data.candidate_text,
        "round": state_machine.current_phase.value,
    }
    transcript.append(candidate_turn)
    state_machine.transcript.append(candidate_turn)

    # Count turns in current phase
    phase_turns = sum(1 for t in transcript if t.get("round") == state_machine.current_phase.value)

    # Check if we should advance phase
    phase_min_turns = {"intro": 4, "technical": 8, "behavioral": 6, "salary": 4}
    min_turns = phase_min_turns.get(state_machine.current_phase.value, 4)

    if phase_turns >= min_turns and state_machine.current_phase != InterviewPhase.COMPLETED:
        old_phase = state_machine.current_phase.value
        state_machine.advance_phase()
        print(f"[Interview] Phase advanced: {old_phase} → {state_machine.current_phase.value}")

    if state_machine.current_phase == InterviewPhase.COMPLETED:
        # End the interview
        session["completed"] = True
        return JSONResponse({
            "text": f"Thank you so much for your time today. It was a pleasure speaking with you. Our hiring team will review your assessment and be in touch within 3 to 5 business days. We appreciate your time and wish you all the best!",
            "phase": "completed",
            "should_end": True,
        })

    # Build messages for LLaMA
    system_prompt = state_machine.get_system_prompt()

    # Build conversation history (last 10 turns)
    messages = [{"role": "system", "content": system_prompt}]
    for turn in transcript[-10:]:
        role = "assistant" if turn["speaker"] == "ai" else "user"
        messages.append({"role": role, "content": turn["text"]})

    try:
        response = await groq.chat.completions.create(
            model=settings.OPENAI_MODEL,  # uses openai/gpt-oss-20b via Groq
            messages=messages,
            max_tokens=300,
            temperature=0.4,
        )
        ai_text = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[LLaMA] Error: {e}")
        ai_text = "I apologize for the brief interruption. Could you please repeat your last response?"

    # Add AI turn to transcript
    ai_turn = {
        "speaker": "ai",
        "text": ai_text,
        "round": state_machine.current_phase.value,
    }
    transcript.append(ai_turn)
    state_machine.transcript.append(ai_turn)

    # Save updated session
    session["transcript"] = transcript

    return JSONResponse({
        "text": ai_text,
        "phase": state_machine.current_phase.value,
        "should_end": False,
    })


# ── Start interview session ───────────────────────────────────────────────────

@router.post("/start/{interview_id}")
async def start_interview_session(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Initialize an interview session in memory.
    Loads job + resume data from DB and builds the state machine.
    """
    pool = await get_pg_pool()

    # Check if verification interview
    async with pool.acquire() as conn:
        vi_row = await conn.fetchrow(
            """
            SELECT vi.*, p.parsed_data, p.full_name, u.email
            FROM verification_interviews vi
            JOIN profiles p ON p.id = vi.candidate_id
            JOIN users u ON u.id = vi.candidate_id
            WHERE vi.id = $1
            """,
            interview_id,
        )

    if vi_row:
        resume_data = vi_row["parsed_data"] or {}
        if isinstance(resume_data, str):
            try:
                resume_data = json.loads(resume_data)
            except Exception:
                resume_data = {}
        candidate_name = (
            (resume_data.get("name") or "").strip()
            or (vi_row["full_name"] or "").strip()
            or vi_row["email"].split("@")[0].title()
        )
        resume_data.setdefault("name", candidate_name)
        job_data = {
            "title": "Verification Interview",
            "description": "General skills verification interview.",
            "requirements": resume_data.get("skills", [])[:8],
            "required_skills": resume_data.get("skills", [])[:8],
            "salary_min": 0,
            "salary_max": 0,
        }
        is_verification = True
    else:
        # Regular job interview
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT i.*, a.parsed_data, a.candidate_id,
                       j.title AS job_title, j.description AS job_description,
                       j.requirements AS job_requirements,
                       j.salary_min, j.salary_max,
                       u.email AS candidate_email,
                       p.full_name AS candidate_full_name
                FROM interviews i
                JOIN applications a ON a.id = i.application_id
                JOIN jobs j ON j.id = a.job_id
                JOIN users u ON u.id = a.candidate_id
                LEFT JOIN profiles p ON p.id = a.candidate_id
                WHERE i.id = $1
                """,
                interview_id,
            )
        if not row:
            raise HTTPException(status_code=404, detail="Interview not found.")

        resume_data = row["parsed_data"] or {}
        if isinstance(resume_data, str):
            try:
                resume_data = json.loads(resume_data)
            except Exception:
                resume_data = {}

        candidate_name = (
            (resume_data.get("name") or "").strip()
            or (row["candidate_full_name"] or "").strip()
            or row["candidate_email"].split("@")[0].title()
        )
        resume_data.setdefault("name", candidate_name)
        job_data = {
            "title": row["job_title"],
            "description": row["job_description"],
            "requirements": list(row["job_requirements"] or []),
            "required_skills": list(row["job_requirements"] or []),
            "salary_min": row["salary_min"],
            "salary_max": row["salary_max"],
        }
        is_verification = False

    # Build state machine
    state_machine = InterviewStateMachine(
        interview_id=interview_id,
        resume_data=resume_data,
        job_data=job_data,
    )

    # Store session
    _sessions[interview_id] = {
        "state_machine": state_machine,
        "transcript": [],
        "is_verification": is_verification,
        "completed": False,
        "candidate_name": candidate_name,
    }

    # Generate opening message
    system_prompt = state_machine.get_system_prompt()
    opening_instruction = (
        f"The candidate ({candidate_name}) just joined. "
        "Greet them warmly by name in English, confirm you have their resume on file, "
        "and ask one short opening question about what drew them to this role. "
        "Keep it under 3 sentences. Speak naturally."
    )

    try:
        response = await groq.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": opening_instruction},
            ],
            max_tokens=150,
            temperature=0.4,
        )
        opening_text = response.choices[0].message.content.strip()
    except Exception as e:
        opening_text = f"Hello {candidate_name}! Welcome to your interview. I've reviewed your resume and I'm excited to learn more about you. Could you start by telling me a bit about yourself and what brought you here today?"

    # Add to transcript
    ai_turn = {"speaker": "ai", "text": opening_text, "round": "intro"}
    _sessions[interview_id]["transcript"].append(ai_turn)
    state_machine.transcript.append(ai_turn)

    return JSONResponse({
        "opening_message": opening_text,
        "phase": "intro",
        "candidate_name": candidate_name,
    })


# ── Get session state ─────────────────────────────────────────────────────────

@router.get("/state/{interview_id}")
async def get_session_state(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    session = _sessions.get(interview_id)
    if not session:
        return JSONResponse({"exists": False})
    return JSONResponse({
        "exists": True,
        "phase": session["state_machine"].current_phase.value,
        "transcript_length": len(session["transcript"]),
        "completed": session.get("completed", False),
    })


# ── End interview and trigger assessment ──────────────────────────────────────

class EndRequest(BaseModel):
    interview_id: str
    termination_reason: str = "completed"


@router.post("/end")
async def end_interview(
    data: EndRequest,
    current_user: dict = Depends(get_current_user),
):
    """Save transcript to DB and trigger assessment generation."""
    session = _sessions.get(data.interview_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    transcript = session["transcript"]
    is_verification = session.get("is_verification", False)
    pool = await get_pg_pool()

    # Save transcript to DB
    table = "verification_interviews" if is_verification else "interviews"
    db_status = "cancelled" if data.termination_reason == "tab_guard" else "completed"

    try:
        async with pool.acquire() as conn:
            await conn.execute(
                f"UPDATE {table} SET status = $1, transcript = $2 WHERE id = $3",
                db_status, transcript, data.interview_id,
            )
    except Exception as e:
        print(f"[Interview] DB save error: {e}")

    # Trigger assessment
    try:
        from app.services.assessment_generator import generate_assessment
        import asyncio
        asyncio.create_task(
            generate_assessment(
                data.interview_id,
                transcript,
                [],
                termination_reason=data.termination_reason,
                is_verification=is_verification,
            )
        )
    except Exception as e:
        print(f"[Interview] Assessment trigger error: {e}")

    # Clean up session
    _sessions.pop(data.interview_id, None)

    return JSONResponse({"ok": True, "message": "Interview ended. Assessment generating."})
