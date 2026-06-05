import logging
import asyncpg
from typing import Optional
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.database import get_pg_pool

logger = logging.getLogger(__name__)

class ProfileVectorService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "text-embedding-3-small"

    async def update_candidate_embedding(self, candidate_id: str) -> bool:
        """
        Compile candidate composite text and update their profile_embeddings.
        Composite Text = Resume + Work Stories + Skills + Interview Transcript.
        """
        pool = await get_pg_pool()
        async with pool.acquire() as conn:
            # 1. Fetch Profile and User
            profile = await conn.fetchrow(
                """
                SELECT p.*, u.email 
                FROM profiles p
                JOIN users u ON u.id = p.id
                WHERE p.id = $1
                """,
                candidate_id
            )
            if not profile:
                logger.warning(f"Profile not found for candidate: {candidate_id}")
                return False

            # 2. Fetch Work Stories
            stories_rows = await conn.fetch(
                """
                SELECT content, tags 
                FROM work_stories 
                WHERE user_id = $1
                ORDER BY created_at DESC
                """,
                candidate_id
            )
            stories_text = ""
            for r in stories_rows:
                tags_str = ", ".join(r["tags"] or [])
                stories_text += f"- {r['content']} (Tags: {tags_str})\n"

            # 3. Fetch Verification/Job Interview Transcripts
            # Verification Interview
            vi_row = await conn.fetchrow(
                "SELECT transcript FROM verification_interviews WHERE candidate_id = $1 AND status = 'completed'",
                candidate_id
            )
            vi_transcript = ""
            if vi_row and vi_row["transcript"]:
                try:
                    turns = vi_row["transcript"] if isinstance(vi_row["transcript"], list) else []
                    vi_transcript = " ".join([f"{t.get('role', 'speaker')}: {t.get('text', '')}" for t in turns])
                except Exception:
                    pass

            # Job Interviews
            ji_rows = await conn.fetch(
                """
                SELECT i.transcript 
                FROM interviews i
                JOIN applications a ON a.id = i.application_id
                WHERE a.candidate_id = $1 AND i.status = 'completed'
                """,
                candidate_id
            )
            ji_transcripts = []
            for r in ji_rows:
                if r["transcript"]:
                    try:
                        turns = r["transcript"] if isinstance(r["transcript"], list) else []
                        ji_transcripts.append(" ".join([f"{t.get('role', 'speaker')}: {t.get('text', '')}" for t in turns]))
                    except Exception:
                        pass
            ji_transcript = "\n".join(ji_transcripts)

            # 4. Compile Composite Text
            parsed = profile.get("parsed_data") or {}
            skills_list = list(set((profile.get("skills") or []) + (parsed.get("skills") or [])))
            
            comp_parts = [
                f"Candidate Name: {profile['full_name']}",
                f"Email: {profile['email']}",
                f"Headline: {profile['headline'] or parsed.get('summary', '')[:200]}",
                f"Bio: {profile['bio'] or ''}",
                f"Skills: {', '.join(skills_list)}",
                f"Experience: {profile['experience_years'] or 0} years",
                f"Location: {profile['location'] or ''}",
                f"Work Status: {profile['work_status'] or ''}",
                f"Current Company: {profile['current_company'] or ''}",
                f"Job Title: {profile['job_title'] or ''}",
                f"Department: {profile['department'] or ''}",
                f"Highest Qualification: {profile['highest_qualification'] or ''} from {profile['university'] or ''}",
                f"Resume Details: {parsed.get('summary', '')}"
            ]

            if stories_text:
                comp_parts.append(f"Daily/Weekly Logged Work Stories:\n{stories_text}")
            if vi_transcript:
                comp_parts.append(f"AI Verification Assessment Transcript:\n{vi_transcript}")
            if ji_transcript:
                comp_parts.append(f"Job Technical Interview Transcripts:\n{ji_transcript}")

            composite_text = "\n\n".join(comp_parts)

            # 5. Generate Vector Embedding using text-embedding-3-small
            try:
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=composite_text[:8000]
                )
                embedding = response.data[0].embedding
            except Exception as e:
                logger.error(f"Failed to generate composite profile embedding for {candidate_id}: {e}")
                return False

            # 6. Upsert into profile_embeddings
            await conn.execute(
                """
                INSERT INTO profile_embeddings (user_id, composite_text, embedding, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (user_id) DO UPDATE
                SET composite_text = EXCLUDED.composite_text,
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW()
                """,
                candidate_id,
                composite_text,
                embedding
            )
            logger.info(f"Successfully generated and saved composite search vector for {candidate_id}")
            return True

_service_instance = None

def get_profile_vector_service() -> ProfileVectorService:
    global _service_instance
    if _service_instance is None:
        _service_instance = ProfileVectorService()
    return _service_instance
