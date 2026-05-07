import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_supabase

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

def build_context_prompt() -> str:
    """Fetch recent data from Supabase to provide context for the AI."""
    supabase = get_supabase()
    
    try:
        # Fetch Active Jobs
        jobs_res = supabase.table("jobs").select("id, title, department, type, salary_range").eq("is_active", True).execute()
        jobs_text = "None"
        if jobs_res.data:
            jobs_text = "\n".join([
                f"- {j.get('title')} ({j.get('department')}): {j.get('type')}, Salary: {j.get('salary_range') or 'N/A'}"
                for j in jobs_res.data
            ])

        # Fetch Recent Assessments to summarize candidates
        assess_res = supabase.table("assessments").select(
            "*, interviews(applications(candidate_id, jobs(title)))"
        ).order("created_at", desc=True).limit(10).execute()
        
        candidates_text = "None"
        if assess_res.data:
            candidate_lines = []
            
            # Fetch names via profiles just like assessment listing
            user_ids = []
            for a in assess_res.data:
                app = a.get("interviews", {}).get("applications", {})
                if app.get("candidate_id"):
                    user_ids.append(app["candidate_id"])
            
            profiles_map = {}
            if user_ids:
                prof_res = supabase.table("profiles").select("id, full_name").in_("id", list(set(user_ids))).execute()
                for p in prof_res.data:
                    profiles_map[p["id"]] = p.get("full_name") or "Unknown Candidate"

            for a in assess_res.data:
                app = a.get("interviews", {}).get("applications", {})
                job_title = app.get("jobs", {}).get("title", "Unknown Role")
                candidate_id = app.get("candidate_id", "")
                c_name = profiles_map.get(candidate_id, "Unknown Candidate")
                
                score = a.get("overall_score", 0)
                verdict = a.get("verdict", "N/A")
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
        system_prompt = build_context_prompt()
        
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
