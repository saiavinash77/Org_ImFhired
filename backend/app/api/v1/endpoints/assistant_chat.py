import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_pg_pool

logger = logging.getLogger(__name__)

router = APIRouter()
client = AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str

async def build_context_prompt(recruiter_id: str) -> str:
    """Fetch recent RDS data to provide context for the AI assistant."""
    pool = await get_pg_pool()
    
    try:
        # Fetch Active Jobs for this recruiter
        async with pool.acquire() as conn:
            jobs_rows = await conn.fetch(
                """
                SELECT title, department, type, salary_min, salary_max
                FROM jobs
                WHERE recruiter_id = $1 AND is_active = true
                ORDER BY created_at DESC
                LIMIT 20
                """,
                recruiter_id,
            )

        jobs_text = "None"
        if jobs_rows:
            jobs_text = "\n".join([
                f"- {j.get('title')} ({j.get('department')}): {j.get('type')}, Salary: {j.get('salary_min') or 0}–{j.get('salary_max') or 0}"
                for j in jobs_rows
            ])

        # Fetch Recent Assessments to summarize candidates
        async with pool.acquire() as conn:
            assess_rows = await conn.fetch(
                """
                SELECT
                    a.overall_score,
                    a.verdict,
                    p.full_name,
                    u.email,
                    j.title AS job_title
                FROM assessments a
                JOIN interviews i ON i.id = a.interview_id
                JOIN applications app ON app.id = i.application_id
                JOIN jobs j ON j.id = app.job_id
                JOIN profiles p ON p.id = app.candidate_id
                JOIN users u ON u.id = app.candidate_id
                WHERE j.recruiter_id = $1
                ORDER BY a.created_at DESC
                LIMIT 10
                """,
                recruiter_id,
            )

        candidates_text = "None"
        if assess_rows:
            candidate_lines = []
            for a in assess_rows:
                c_name = a.get("full_name") or None
                if not c_name:
                    email = a.get("email") or ""
                    c_name = email.split("@")[0].replace(".", " ").title() if email else "Unknown Candidate"

                score = a.get("overall_score", 0) or 0
                verdict = a.get("verdict") or "N/A"
                job_title = a.get("job_title") or "Unknown Role"
                candidate_lines.append(f"- {c_name} (Applied for {job_title}): AI Score: {score}, Verdict: {verdict}")

            if candidate_lines:
                candidates_text = "\n".join(candidate_lines)

        return f"""
You are the embedded AI Assistant inside the HireAI Recruiter Dashboard.
Your job is to provide instant, helpful insights directly to the recruiter based on their current active data.

CURRENT ACTIVE JOB POSTINGS:
{jobs_text}

RECENT CANDIDATE ASSESSMENTS:
{candidates_text}

Guidelines:
1. Be concise, professional, and act as a strategic talent advisor.
2. If asked about candidates, reference their AI scores and verdicts from the context above.
3. If asked about something not in the context, inform the user you are looking at a snapshot and can only see the latest active data.
4. Use markdown formatting to make your responses easy to read (bolding, lists).
"""

    except Exception as e:
        logger.error(f"Failed to fetch context for AI Assistant: {e}")
        return "You are the HireAI Assistant. An error occurred fetching current data, so you only have general knowledge."


@router.post("/", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Handle chat messages from the recruiter dashboard assistant.
    Appends live db context to the system prompt dynamically.
    """
    if current_user.get("role") not in ["recruiter", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized.")

    try:
        # Build the dynamic system instruction
        system_prompt = await build_context_prompt(current_user["sub"])
        
        # Format messages for OpenAI
        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in request.messages:
            api_messages.append({"role": msg.role, "content": msg.content})

        # Call OpenAI
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=api_messages,
            max_tokens=800,
            temperature=0.4,
        )

        reply_content = response.choices[0].message.content
        return ChatResponse(reply=reply_content)

    except Exception as e:
        logger.error(f"Assistant chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to communicate with AI Assistant")
