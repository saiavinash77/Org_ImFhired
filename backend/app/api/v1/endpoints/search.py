"""
AI Candidate Search — Natural language search over all candidate profiles.
Recruiter types what they need, AI finds the best matches.
"""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.database import get_pg_pool, row_to_dict
from app.core.config import settings
from app.api.v1.endpoints.auth import get_current_user
from app.services.s3_utils import generate_presigned_url_if_s3
from openai import AsyncOpenAI

router = APIRouter()

groq_client = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)


class CandidateSearchQuery(BaseModel):
    query: str
    limit: int = 20


async def extract_search_intent(query: str) -> dict:
    """Use Groq LLaMA to parse natural language query into structured intent."""
    try:
        response = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": (
                    "You parse a recruiter's natural language candidate search query. "
                    "Return ONLY a JSON object with these keys:\n"
                    "- skills: list of technical skills mentioned (e.g. ['Python', 'React'])\n"
                    "- role_keywords: list of role/title keywords (e.g. ['engineer', 'data scientist'])\n"
                    "- min_years: minimum years of experience (integer, null if not specified)\n"
                    "- domains: industry domains (e.g. ['fintech', 'healthcare'], empty list if none)\n"
                    "- soft_signals: personality/work style signals (e.g. ['fast learner', 'leadership'])\n"
                    "Return ONLY the JSON object, no explanation."
                )},
                {"role": "user", "content": f"Query: {query}"}
            ],
            temperature=0.1,
            max_tokens=300,
        )
        raw = response.choices[0].message.content.strip()
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(raw[start:end])
    except Exception as e:
        print(f"Intent extraction failed: {e}")
    return {"skills": [], "role_keywords": [], "min_years": None, "domains": [], "soft_signals": []}


@router.post("/candidates")
async def search_candidates(
    body: CandidateSearchQuery,
    current_user: dict = Depends(get_current_user),
):
    """
    AI-powered natural language candidate search.
    Recruiter describes what they need → AI finds best matching candidates.
    Uses hybrid pgvector similarity + SQL constraint filtering.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    if len(body.query.strip()) < 5:
        raise HTTPException(status_code=400, detail="Query too short. Describe what you're looking for.")

    pool = await get_pg_pool()

    # Step 1: Parse intent from query using LLaMA
    intent = await extract_search_intent(body.query)

    # Step 2: Generate Query Embedding using OpenAI text-embedding-3-small (as standard)
    openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    query_vector = None
    try:
        embed_resp = await openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=body.query[:1000]
        )
        query_vector = embed_resp.data[0].embedding
    except Exception as e:
        print(f"Failed to generate query embedding: {e}")

    # Step 3: Fetch candidate profiles
    async with pool.acquire() as conn:
        if query_vector:
            # Query composite profile_embeddings table
            candidates_rows = await conn.fetch(
                """
                SELECT
                    p.id, p.full_name, p.headline, p.skills, p.experience_years,
                    p.resume_url, p.parsed_data, p.location, p.verification_status, p.verification_score,
                    u.email,
                    (1 - (pe.embedding <=> $1::vector)) as vector_similarity,
                    (SELECT COUNT(*) FROM applications a WHERE a.candidate_id = p.id) as app_count,
                    (SELECT COUNT(*) FROM work_stories s WHERE s.user_id = p.id) as story_count,
                    (SELECT array_agg(tag_arr) FROM (SELECT s.tags as tag_arr FROM work_stories s WHERE s.user_id = p.id ORDER BY s.created_at DESC LIMIT 5) sub) as recent_story_tags
                FROM profile_embeddings pe
                JOIN profiles p ON p.id = pe.user_id
                JOIN users u ON u.id = p.id
                ORDER BY pe.embedding <=> $1::vector
                LIMIT $2
                """,
                query_vector,
                body.limit * 2
            )
        else:
            # Fallback if OpenAI fails or is not configured
            candidates_rows = await conn.fetch(
                """
                SELECT
                    p.id, p.full_name, p.headline, p.skills, p.experience_years,
                    p.resume_url, p.parsed_data, p.location, p.verification_status, p.verification_score,
                    u.email,
                    0.5 as vector_similarity,
                    (SELECT COUNT(*) FROM applications a WHERE a.candidate_id = p.id) as app_count,
                    (SELECT COUNT(*) FROM work_stories s WHERE s.user_id = p.id) as story_count,
                    (SELECT array_agg(tag_arr) FROM (SELECT s.tags as tag_arr FROM work_stories s WHERE s.user_id = p.id ORDER BY s.created_at DESC LIMIT 5) sub) as recent_story_tags
                FROM profiles p
                JOIN users u ON u.id = p.id AND u.role = 'candidate'
                LIMIT $1
                """,
                body.limit * 2
            )

    candidates = [row_to_dict(r) for r in candidates_rows]

    # Step 4: Score candidates and construct explainability (WHY they matched)
    results = []
    for c in candidates:
        similarity = c.get("vector_similarity") or 0.5
        score = int(similarity * 100)

        # Rule-based filters
        min_years = intent.get("min_years")
        exp_years = float(c.get("experience_years") or 0)
        exp_satisfied = True
        if min_years:
            if exp_years >= min_years:
                score += 10
            elif exp_years >= min_years * 0.7:
                score += 5
            else:
                score -= 15
                exp_satisfied = False

        # Skills overlap scoring
        search_skills = [s.lower() for s in (intent.get("skills") or [])]
        cand_skills = [s.lower() for s in (c.get("skills") or [])]
        matched_skills = [s for s in search_skills if any(s in cs or cs in s for cs in cand_skills)]
        if search_skills:
            overlap_pct = len(matched_skills) / len(search_skills)
            score += int(overlap_pct * 15)

        # Badge verification bonus
        is_verified = c.get("verification_status") in ("completed", "verified")
        if is_verified:
            score += 10
            ver_score = c.get("verification_score") or 80.0
            if ver_score >= 90:
                score += 5

        score = min(100, max(0, score))

        # Generate human-readable "WHY" match reasons
        reasons = []
        if exp_satisfied:
            reasons.append(f"Strong experience fit ({exp_years:.1f} years).")
        else:
            reasons.append(f"Has {exp_years:.1f} years of experience (desired: {min_years} years).")

        if matched_skills:
            reasons.append(f"Demonstrates technical skills in: {', '.join(matched_skills[:3])}.")

        raw_story_tags = c.get("recent_story_tags") or []
        story_tags = []
        for tag_group in raw_story_tags:
            if isinstance(tag_group, list):
                story_tags.extend(tag_group)
            elif isinstance(tag_group, str):
                story_tags.append(tag_group)
        story_tags = list(set(story_tags))[:6]

        if story_tags:
            reasons.append(f"Active daily/weekly shipped work history containing: {', '.join(story_tags[:3])}.")

        if is_verified:
            reasons.append(f"FiredIn-Verified interview badge with a score of {c.get('verification_score') or 80.0:.1f}%.")

        match_reason = " ".join(reasons) or "Matches semantic parameters in search query."

        parsed = c.get("parsed_data") or {}
        if isinstance(parsed, str):
            try:
                import json
                parsed = json.loads(parsed)
            except Exception:
                parsed = {}
                
        display_name = (
            (parsed.get("name") or "").strip() or
            (c.get("full_name") or "").strip() or
            c.get("email", "").split("@")[0].title()
        )

        results.append({
            "id": c["id"],
            "name": display_name,
            "headline": c.get("headline") or parsed.get("summary", "")[:80],
            "email": c.get("email"),
            "skills": [s.title() for s in cand_skills[:8]],
            "experience_years": exp_years,
            "location": c.get("location") or "Remote",
            "match_score": score,
            "match_reason": match_reason,
            "verification_status": c.get("verification_status"),
            "verification_score": c.get("verification_score"),
            "app_count": int(c.get("app_count") or 0),
            "story_count": int(c.get("story_count") or 0),
            "story_tags": story_tags,
            "resume_url": generate_presigned_url_if_s3(c.get("resume_url")),
            "initials": "".join([n[0] for n in display_name.split()[:2] if n]).upper() or "C",
        })

    # Sort by match score descending and slice to limit
    results.sort(key=lambda x: x["match_score"], reverse=True)
    top = results[:body.limit]

    return {
        "query": body.query,
        "intent": intent,
        "total_found": len(results),
        "results": top,
    }


@router.get("/boss-recommendations")
async def get_boss_recommendations(
    current_user: dict = Depends(get_current_user),
):
    """
    The 'Boss Agent' logic:
    1. Fetches recruiter's active jobs.
    2. Fetches candidates with recent work stories.
    3. AI matches them to find high-signal talent.
    """
    if current_user["role"] != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters get recommendations.")

    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        # 1. Get active jobs
        jobs = await conn.fetch(
            "SELECT id, title, requirements as required_skills, experience_min as min_experience FROM jobs WHERE recruiter_id = $1 AND is_active = true",
            current_user["sub"]
        )
        if not jobs:
            return {"recommendations": [], "message": "Post a job to get AI recommendations!"}

        # 2. Get recent stories (last 7 days)
        stories = await conn.fetch(
            """
            SELECT s.content, s.tags as ai_tags, s.user_id as candidate_id, p.full_name, p.headline, p.skills, p.experience_years
            FROM work_stories s
            JOIN profiles p ON p.id = s.user_id
            WHERE s.created_at > NOW() - INTERVAL '7 days'
            ORDER BY s.created_at DESC
            LIMIT 50
            """
        )

        # 3. AI Match Logic
        recommendations = []
        seen_candidates = set()

        for job in jobs:
            job_title = job["title"]
            job_skills = set([s.lower() for s in (job["required_skills"] or [])])
            min_exp = job["min_experience"] or 0

            for story in stories:
                cid = story["candidate_id"]
                if cid in seen_candidates:
                    continue

                story_tags = set([t.lower() for t in (story["ai_tags"] or [])])
                cand_skills = set([s.lower() for s in (story["skills"] or [])])
                all_signals = story_tags | cand_skills

                # Check skill overlap
                overlap = len(all_signals & job_skills)
                if overlap >= 1:
                    match_score = int((overlap / max(len(job_skills), 1)) * 100)
                    if (story["experience_years"] or 0) >= min_exp:
                        match_score += 10

                    if match_score >= 50:
                        recommendations.append({
                            "candidate_id": str(cid),
                            "name": story["full_name"],
                            "headline": story["headline"],
                            "match_score": min(match_score, 100),
                            "matched_job": job_title,
                            "reason": f"Expertise in {', '.join(list(all_signals & job_skills)[:3])} surfaced in their recent work story.",
                            "recent_story": story["content"][:100] + "..."
                        })
                        seen_candidates.add(cid)

        recommendations.sort(key=lambda x: x["match_score"], reverse=True)

        return {
            "recommendations": recommendations[:5],
            "agent_message": f"Boss, I scanned {len(stories)} work stories and found {len(recommendations)} matches for your active roles."
        }
