"""
Stories of Work API — Candidates post daily work stories, recruiters discover talent.
"""
import json
import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.database import get_pg_pool, row_to_dict
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user, get_current_user_optional
from app.services.profile_vector_service import get_profile_vector_service
from openai import AsyncOpenAI

router = APIRouter()

groq_client = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)


class StoryCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=300)


async def extract_tags_from_story(content: str) -> list[str]:
    """Use Groq LLaMA to extract skill/tech tags from a story."""
    try:
        response = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": (
                    "You extract technical skills, tools, and domain tags from a work story. "
                    "Return ONLY a JSON array of strings. Max 8 tags. "
                    "Tags should be concise (e.g. 'Python', 'FastAPI', 'Machine Learning', 'AWS S3'). "
                    "No explanations, just the JSON array."
                )},
                {"role": "user", "content": f"Story: {content}"}
            ],
            temperature=0.2,
            max_tokens=150,
        )
        raw = response.choices[0].message.content.strip()
        # Extract JSON array from response
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start >= 0 and end > start:
            tags = json.loads(raw[start:end])
            return [t for t in tags if isinstance(t, str)][:8]
    except Exception as e:
        print(f"Tag extraction failed: {e}")
    return []


# ── Create Story ──────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_story(
    body: StoryCreate,
    current_user: dict = Depends(get_current_user),
):
    """Candidate posts their daily work story. One story per day."""
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can post stories.")

    pool = await get_pg_pool()

    # Check: only one story per day per candidate
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM work_stories WHERE user_id = $1 AND date = CURRENT_DATE",
            current_user["sub"],
        )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You've already posted a story today. Come back tomorrow!"
        )

    # AI: extract tags
    tags = await extract_tags_from_story(body.content)

    story_id = str(uuid.uuid4())

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO work_stories (id, user_id, content, tags, date)
            VALUES ($1, $2, $3, $4, CURRENT_DATE)
            RETURNING *
            """,
            story_id,
            current_user["sub"],
            body.content,
            tags,
        )

    # Automatically trigger composite search vector update!
    try:
        vector_svc = get_profile_vector_service()
        await vector_svc.update_candidate_embedding(current_user["sub"])
    except Exception as ex:
        print(f"Failed to update candidate search embedding: {ex}")

    return {**row_to_dict(row), "tags": tags}


# ── Get My Stories ────────────────────────────────────────────────────────────
@router.get("/me")
async def get_my_stories(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(30, le=100),
):
    """Candidate views their own story history."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT s.*, p.full_name, p.headline, p.skills
            FROM work_stories s
            LEFT JOIN profiles p ON p.id = s.user_id
            WHERE s.user_id = $1
            ORDER BY s.date DESC
            LIMIT $2
            """,
            current_user["sub"],
            limit,
        )
    return [row_to_dict(r) for r in rows]


# ── Check Today's Story ───────────────────────────────────────────────────────
@router.get("/today")
async def get_today_story(
    current_user: dict = Depends(get_current_user),
):
    """Check if candidate has posted a story today."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM work_stories WHERE user_id = $1 AND date = CURRENT_DATE",
            current_user["sub"],
        )
    return {"posted_today": row is not None, "story": row_to_dict(row) if row else None}


# ── Recruiter Feed ────────────────────────────────────────────────────────────
@router.get("/feed")
async def get_stories_feed(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(20, le=50),
    offset: int = 0,
    tag: Optional[str] = None,
):
    """
    Recruiter sees a feed of recent work stories from all candidates.
    Each story is scored against the recruiter's active open jobs.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    pool = await get_pg_pool()

    # Get recruiter's active job titles/requirements for match scoring
    async with pool.acquire() as conn:
        jobs_rows = await conn.fetch(
            "SELECT id, title, requirements FROM jobs WHERE recruiter_id = $1 AND is_active = TRUE",
            current_user["sub"],
        )
    active_jobs = [row_to_dict(r) for r in jobs_rows]
    all_job_skills = set()
    for j in active_jobs:
        reqs = j.get("requirements") or []
        all_job_skills.update([r.lower() for r in reqs])

    # Fetch recent stories with candidate profile info
    where = "WHERE s.date >= CURRENT_DATE - INTERVAL '30 days'"
    params: list = []
    idx = 1

    if tag:
        where += f" AND ${idx} = ANY(s.tags)"
        params.append(tag)
        idx += 1

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT
                s.id, s.content, s.tags, s.date, s.created_at,
                s.user_id,
                p.full_name, p.headline, p.skills, p.experience_years,
                p.resume_url
            FROM work_stories s
            LEFT JOIN profiles p ON p.id = s.user_id
            JOIN users u ON u.id = s.user_id AND u.role = 'candidate'
            {where}
            ORDER BY s.created_at DESC
            LIMIT ${idx} OFFSET ${idx + 1}
            """,
            *params, limit, offset,
        )

    stories = []
    for r in rows:
        s = row_to_dict(r)
        tags = s.get("tags") or []

        # Calculate match score against recruiter's open jobs
        if all_job_skills and tags:
            story_skills = set([t.lower() for t in tags])
            candidate_skills = set([sk.lower() for sk in (s.get("skills") or [])])
            all_candidate_signals = story_skills | candidate_skills
            overlap = len(all_candidate_signals & all_job_skills)
            match_pct = min(100, int((overlap / max(len(all_job_skills), 1)) * 100))
        else:
            match_pct = 0

        # Find best matching job title
        best_job = None
        if active_jobs and tags:
            story_text_lower = s["content"].lower()
            for job in active_jobs:
                job_reqs = [r.lower() for r in (job.get("requirements") or [])]
                if any(req in story_text_lower or req in [t.lower() for t in tags]
                       for req in job_reqs):
                    best_job = job["title"]
                    break

        s["match_score"] = match_pct
        s["matched_job"] = best_job
        s["resume_url"] = None  # Privacy
        stories.append(s)

    # Sort by match score (highest first), then by date
    stories.sort(key=lambda x: (-x["match_score"], x["created_at"]), reverse=False)

    return stories


# ── Public Profile Stories ────────────────────────────────────────────────────
@router.get("/candidate/{candidate_id}")
async def get_candidate_stories(
    candidate_id: str,
    limit: int = Query(30, le=100),
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    """Public: view a candidate's story history."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT s.*, p.full_name, p.headline
            FROM work_stories s
            LEFT JOIN profiles p ON p.id = s.user_id
            WHERE s.user_id = $1
            ORDER BY s.date DESC
            LIMIT $2
            """,
            candidate_id,
            limit,
        )
    return [row_to_dict(r) for r in rows]


# ── Delete Story ──────────────────────────────────────────────────────────────
@router.delete("/{story_id}", status_code=204)
async def delete_story(
    story_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Candidate deletes their own story."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM work_stories WHERE id = $1 AND user_id = $2",
            story_id,
            current_user["sub"],
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Story not found.")

    # Automatically trigger composite search vector update!
    try:
        vector_svc = get_profile_vector_service()
        await vector_svc.update_candidate_embedding(current_user["sub"])
    except Exception as ex:
        print(f"Failed to update candidate search embedding: {ex}")
