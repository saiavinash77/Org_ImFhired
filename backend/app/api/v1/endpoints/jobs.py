"""Jobs API — Create, list, update job postings with JD embedding generation."""
import uuid
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import get_pg_pool, get_redis, row_to_dict
from app.schemas.schemas import JobCreate, JobResponse, JDGenerationRequest, JDGenerationResponse
from app.api.v1.endpoints.auth import get_current_user, get_current_user_optional

router = APIRouter()
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
groq_client = AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")


async def generate_jd_embedding(job: JobCreate) -> list[float]:
    """Generate vector embedding for JD semantic matching."""
    jd_text = f"""
    Job Title: {job.title}
    Department: {job.department or ''}
    Description: {job.description}
    Requirements: {', '.join(job.requirements)}
    Experience Required: {job.experience_min}-{job.experience_max or '+'} years
    """
    try:
        response = await openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=jd_text.strip(),
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Embedding generation failed: {e}")
        return [0.0] * 1536


@router.post("/", response_model=JobResponse, status_code=201)
async def create_job(data: JobCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    embedding = await generate_jd_embedding(data)
    pool = await get_pg_pool()
    job_id = str(uuid.uuid4())

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO jobs (id, title, description, requirements, department, location,
                type, salary_min, salary_max, experience_min, experience_max,
                recruiter_id, embedding, is_active, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::vector,$14,$15)
            RETURNING *
            """,
            job_id, data.title, data.description, data.requirements,
            data.department, data.location, data.job_type,
            data.salary_min or 0, data.salary_max or 0,
            data.experience_min or 0, data.experience_max or 0,
            current_user["sub"], str(embedding), data.is_active, "active",
        )

    # Cache JD in Redis
    try:
        redis_client = await get_redis()
        if redis_client:
            await redis_client.setex(
                f"jd:embedding:{job_id}", settings.REDIS_TTL,
                json.dumps({"description": data.description, "requirements": data.requirements}),
            )
    except Exception:
        pass

    result = row_to_dict(row)
    result.pop("embedding", None)
    result.setdefault("applications_count", 0)
    result.setdefault("shortlisted_count", 0)
    result.setdefault("interviewed_count", 0)
    return result


@router.post("/generate-jd", response_model=JDGenerationResponse)
async def generate_job_description(data: JDGenerationRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    user_instructions = ""
    if data.user_input and data.user_input.strip():
        user_instructions = f'\nThe user has requested these specific lines/keywords be included:\n"{data.user_input}"\nIncorporate them naturally.\n'

    prompt = f"""You are an expert HR recruiter. Generate a professional job description.

Job Title: {data.title}
Department: {data.department}
Job Type: {data.job_type.replace('_', ' ').capitalize()}
Location: {data.location}
{user_instructions}

Structure:
1. Intro paragraph starting with "We are looking for an experienced {data.title}..."
2. Second paragraph about ideal candidate and collaboration.
3. "Responsibilities:" section with 5-6 bullet points using '•'.

CRITICAL: No markdown formatting. Plain text only.
"""
    try:
        response = await groq_client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional recruitment assistant."},
                {"role": "user", "content": prompt.strip()}
            ],
            temperature=0.7, max_tokens=600,
        )
        return JDGenerationResponse(description=response.choices[0].message.content.strip())
    except Exception as e:
        fallback = f"We are looking for an experienced {data.title} to join our {data.department} team.\n\nResponsibilities:\n• Develop and maintain software\n• Collaborate with cross-functional teams\n• Ensure code quality and performance"
        return JDGenerationResponse(description=fallback)


@router.get("/", response_model=list[JobResponse])
async def list_jobs(
    response: Response,
    is_active: Optional[bool] = Query(True),
    department: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    response.headers["Cache-Control"] = "no-store"
    pool = await get_pg_pool()

    conditions = ["status != 'archived'"]
    params: list = []
    idx = 1

    if current_user and current_user.get("role") in ("recruiter", "admin"):
        conditions.append(f"recruiter_id = ${idx}")
        params.append(current_user["sub"])
        idx += 1

    if is_active is not None:
        conditions.append(f"is_active = ${idx}")
        params.append(is_active)
        idx += 1

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    params.extend([limit, offset])

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT * FROM jobs {where} ORDER BY created_at DESC LIMIT ${idx} OFFSET ${idx+1}",
            *params,
        )

        # Fetch application counts
        job_ids = [str(r["id"]) for r in rows]
        counts_map: dict = {jid: {"applications_count": 0, "shortlisted_count": 0, "interviewed_count": 0} for jid in job_ids}

        if job_ids:
            app_rows = await conn.fetch(
                "SELECT id, job_id, status FROM applications WHERE job_id = ANY($1::uuid[])",
                [uuid.UUID(jid) for jid in job_ids],
            )
            for app in app_rows:
                jid = str(app["job_id"])
                counts_map[jid]["applications_count"] += 1
                if app["status"] in ("invited", "scheduled", "interviewing", "interviewed", "offered", "hired"):
                    counts_map[jid]["shortlisted_count"] += 1
                if app["status"] in ("interviewed", "offered", "hired"):
                    counts_map[jid]["interviewed_count"] += 1

    result = []
    for r in rows:
        d = row_to_dict(r)
        jid = d["id"]
        d.update(counts_map.get(jid, {}))
        d.pop("embedding", None)
        result.append(d)
    return result


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM jobs WHERE id = $1", uuid.UUID(job_id))
    if not row:
        raise HTTPException(status_code=404, detail="Job not found.")
    d = row_to_dict(row)
    d.pop("embedding", None)
    d.setdefault("applications_count", 0)
    d.setdefault("shortlisted_count", 0)
    d.setdefault("interviewed_count", 0)
    return d


@router.patch("/{job_id}")
async def update_job(job_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    allowed = {"status", "title", "description", "salary_min", "salary_max", "location", "is_active"}
    safe = {k: v for k, v in updates.items() if k in allowed}
    if not safe:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    pool = await get_pg_pool()
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(safe))
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE jobs SET {set_clause} WHERE id = $1 RETURNING *",
            uuid.UUID(job_id), *safe.values(),
        )
    if not row:
        raise HTTPException(status_code=404, detail="Job not found.")
    d = row_to_dict(row)
    d.pop("embedding", None)
    return d


@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE jobs SET status = 'archived', is_active = false WHERE id = $1",
            uuid.UUID(job_id),
        )


@router.get("/{job_id}/candidates")
async def get_job_candidates(job_id: str, current_user: dict = Depends(get_current_user), min_score: float = Query(0.0)):
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT a.*, u.email, p.full_name
            FROM applications a
            JOIN users u ON u.id = a.candidate_id
            LEFT JOIN profiles p ON p.id = a.candidate_id
            WHERE a.job_id = $1 AND a.ai_score >= $2
            ORDER BY a.ai_score DESC
            """,
            uuid.UUID(job_id), min_score,
        )
    return [row_to_dict(r) for r in rows]
