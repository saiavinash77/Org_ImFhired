"""
Applications API — Resume Upload, AI Parsing, JD Matching, Auto-Invite.
Core screening pipeline.
"""
import uuid
import os
import tempfile
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, BackgroundTasks
from typing import Optional

from app.core.database import get_pg_pool, get_redis, row_to_dict
from app.core.config import settings
from app.schemas.schemas import ApplicationResponse, ApplyResponse, ApplicationStatus
from app.services.resume_parser import resume_parser
from app.services.matching_engine import get_matching_engine
from app.services.email_service import send_interview_invite
from app.services.s3_utils import generate_presigned_url_if_s3
from app.services.verification import VerificationStatus, VERIFICATION_PASS_THRESHOLD
from app.api.v1.endpoints.auth import get_current_user
import boto3

router = APIRouter()


async def upload_resume_to_s3(file: UploadFile, application_id: str) -> str:
    """Upload resume file to AWS S3 and return public URL."""
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        
        extension = file.filename.split(".")[-1].lower()
        key = f"resumes/{application_id}/{uuid.uuid4()}.{extension}"
        
        content = await file.read()
        s3.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=file.content_type,
            ServerSideEncryption="AES256",
        )
        
        return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    except Exception as e:
        print(f"DEBUG: S3 Upload failed: {e}")
        return f"/api/v1/applications/dummy-resume/{application_id}/{file.filename}"


async def run_screening_pipeline(
    application_id: str,
    job_id: str,
    resume_text: str,
    candidate_email: str,
    candidate_name: str,
):
    """
    Background task: Parse resume → Match with JD → Update DB → Send invite.
    """
    debug_log = os.path.join(tempfile.gettempdir(), f"screening_debug_{application_id}.log")
    
    def log(msg: str):
        try:
            with open(debug_log, "a", encoding="utf-8") as f:
                f.write(f"[{datetime.now().isoformat()}] {msg}\n")
        except Exception:
            pass  # Fallback to print if file write fails
        print(f"DEBUG_PIPELINE: {msg}")

    log(f"🚀 STARTING SCREENING for {candidate_email}")
    pool = await get_pg_pool()

    try:
        # Update status to screening
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE applications SET status = 'screening' WHERE id = $1",
                    application_id,
                )
        except Exception as e:
            print(f"WARN: Failed to set screening status: {e}")
        
        # 1. Parse resume
        log(f"Step 1: Parsing resume ({len(resume_text)} chars)")
        parsed_data = await resume_parser.parse_resume(resume_text)
        log(f"Step 1 COMPLETE: Parsed data for {candidate_email}")
        
        # 2. Fetch JD from DB (NOT Redis — Redis may be down)
        jd_data = {}
        redis_client = await get_redis()
        jd_cache_key = f"jd:embedding:{job_id}"
        
        # Try Redis cache first (only if Redis is available)
        if redis_client is not None:
            try:
                cached = await redis_client.get(jd_cache_key)
                if cached:
                    jd_data = json.loads(cached)
            except Exception as e:
                print(f"WARN: Redis cache read failed: {e}")
        
        # If no cached data, fetch from DB
        if not jd_data:
            try:
                # NOTE: Column is "embedding" in DB, not "requirements_embedding"
                async with pool.acquire() as conn:
                    job = await conn.fetchrow(
                        "SELECT title, description, requirements, experience_min FROM jobs WHERE id = $1 LIMIT 1",
                        job_id,
                    )
                if job:
                    jd_data = row_to_dict(job)
                else:
                    print(f"WARN: Job {job_id} not found during screening")
            except Exception as e:
                print(f"WARN: Job fetch failed: {e}")
            
            # Cache for next time (only if Redis is available)
            if jd_data and redis_client is not None:
                try:
                    await redis_client.setex(jd_cache_key, settings.REDIS_TTL, json.dumps(jd_data))
                except Exception:
                    pass  # Caching failure is non-fatal
        
        # 3. Compute match score
        engine = get_matching_engine()
        req_skills = jd_data.get("requirements") or []
        if not isinstance(req_skills, list):
            req_skills = [str(req_skills)] if req_skills else []

        match_score = await engine.compute_match_score(
            parsed_resume=parsed_data,
            job_id=job_id,
            job_description=jd_data.get("description") or "",
            required_skills=req_skills,
            min_experience=jd_data.get("experience_min") or 0,
        )
        print(f"DEBUG: Match score for {candidate_email}: {match_score}")
        
        # 4. Status stays 'screening' — recruiter decides who to invite
        # We just store the AI score for the recruiter to review
        new_status = "screening"
        
        # 5. Update application
        update_data = {
            "ai_score": match_score,
            "status": new_status,
        }
        if parsed_data:
            try:
                update_data["parsed_data"] = parsed_data.model_dump()
                update_data["resume_summary"] = parsed_data.summary
            except Exception:
                pass
            
        try:
            log(f"Step 5: Updating database with score {match_score}")
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE applications
                    SET ai_score = $1, status = $2, parsed_data = COALESCE($3, parsed_data), resume_summary = COALESCE($4, resume_summary)
                    WHERE id = $5
                    """,
                    update_data.get("ai_score"),
                    update_data.get("status"),
                    update_data.get("parsed_data"),
                    update_data.get("resume_summary"),
                    application_id,
                )
            log("Step 5 COMPLETE: Database updated")
        except Exception as e:
            log(f"Step 5 ERROR: {e}")
            print(f"ERROR: Failed to update application: {e}")
        
        # No auto-invite — recruiter reviews AI scores and decides who to invite
        # The recruiter can then click "Invite to Interview" from the candidates page

    except Exception as e:
        log(f"❌ CRITICAL PIPELINE FAILURE: {e}")
        import traceback
        log(traceback.format_exc())
        print(f"ERROR: Screening pipeline failed for {application_id}: {e}")
        traceback.print_exc()
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE applications SET status = 'applied' WHERE id = $1",
                    application_id,
                )
        except Exception:
            pass


@router.post("/apply", response_model=ApplyResponse, status_code=201)
async def apply_for_job(
    background_tasks: BackgroundTasks,
    job_id: str = Form(...),
    candidate_name: str = Form(...),
    candidate_email: str = Form(...),
    candidate_phone: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    use_saved_profile: str = Form("false"),
):
    """
    Submit job application with resume.
    Triggers identity/profile creation if needed.
    """
    use_saved = (use_saved_profile or "").strip().lower() in ("true", "1", "yes", "on")
    pool = await get_pg_pool()
    
    # 1. Validate inputs based on mode
    if not use_saved and not resume:
        raise HTTPException(status_code=400, detail="Either a resume file or use_saved_profile must be provided.")
        
    if resume:
        allowed_types = {
            "application/pdf", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "application/octet-stream"
        }
        if resume.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {resume.content_type}. Only PDF and DOCX are accepted."
            )
    
    # 2. Check job exists and is active
    async with pool.acquire() as conn:
        job = await conn.fetchrow("SELECT id, is_active FROM jobs WHERE id = $1 LIMIT 1", job_id)
    if not job or not job["is_active"]:
        raise HTTPException(status_code=400, detail="Job not found or inactive.")
    
    # 3. Create identity/profile if not exists (guest apply)
    async with pool.acquire() as conn:
        user_res = await conn.fetchrow("SELECT id FROM users WHERE email = $1 LIMIT 1", candidate_email)
    if user_res:
        candidate_id = user_res["id"]
    else:
        candidate_id = str(uuid.uuid4())
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO users (id, email, role) VALUES ($1, $2, $3)",
                    candidate_id,
                    candidate_email,
                    "candidate",
                )
        except Exception as e:
            err = str(e).lower()
            if "duplicate" in err or "23505" in err or "unique" in err:
                async with pool.acquire() as conn:
                    retry = await conn.fetchrow("SELECT id FROM users WHERE email = $1 LIMIT 1", candidate_email)
                if retry:
                    candidate_id = retry["id"]
                else:
                    raise HTTPException(status_code=500, detail="Could not create or resolve candidate account.")
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"User registration failed: {e!s}",
                ) from e

    # ALWAYS update/sync profile name and phone from the latest application
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO profiles (id, full_name, phone)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    phone = EXCLUDED.phone
                """,
                candidate_id,
                candidate_name,
                candidate_phone,
            )
    except Exception as e:
        print(f"WARN: Failed to sync profile for {candidate_id}: {e}")

    # Candidate must be verified ONCE before applying.
    # (Recruiter flow is unchanged; this gate is candidate-side only.)
    async with pool.acquire() as conn:
        prof = await conn.fetchrow(
            """
            SELECT verification_status, verification_score
            FROM profiles
            WHERE id = $1
            LIMIT 1
            """,
            candidate_id,
        )
    is_verified = (
        prof is not None
        and prof.get("verification_status") == VerificationStatus.COMPLETED
        and prof.get("verification_score") is not None
        and float(prof.get("verification_score")) >= float(VERIFICATION_PASS_THRESHOLD)
    )
    if not is_verified:
        raise HTTPException(
            status_code=403,
            detail="Verification required before applying. Please complete your verification interview first.",
        )
        
    # Check if using saved profile but profile has no resume
    saved_resume_url = None
    saved_parsed_data = None
    if use_saved:
        async with pool.acquire() as conn:
            prof_res = await conn.fetchrow(
                "SELECT resume_url, parsed_data FROM profiles WHERE id = $1 LIMIT 1",
                candidate_id,
            )
        if not prof_res or not prof_res.get("resume_url"):
            raise HTTPException(status_code=400, detail="Cannot use saved profile: no resume found on your profile.")
        saved_resume_url = prof_res.get("resume_url")
        saved_parsed_data = prof_res.get("parsed_data")
    
    # 4. Upload resume & create application record
    application_id = str(uuid.uuid4())
    if use_saved:
        resume_url = saved_resume_url
    else:
        resume_url = await upload_resume_to_s3(resume, application_id)
        # upload_resume_to_s3 reads the Spooled file; rewind for text extraction below
        try:
            await resume.seek(0)
        except Exception:
            pass

    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO applications (id, job_id, candidate_id, resume_url, status)
                VALUES ($1, $2, $3, $4, $5)
                """,
                application_id,
                job_id,
                candidate_id,
                resume_url,
                "applied",
            )
    except Exception as e:
        # Check if it's a duplicate key error
        err_str = str(e)
        if "duplicate key value" in err_str or "23505" in err_str:
            raise HTTPException(
                status_code=400, 
                detail="You have already applied for this job! Please check your email for the interview invite."
            )
        print(f"ERROR: Application insert failed: {e}")
        raise HTTPException(status_code=500, detail="Database failure. Please try again.")
    
    # 5. Extract text for screening (skip if using saved profile and already parsed)
    resume_text_str = ""
    if use_saved and saved_parsed_data:
        print(f"DEBUG: Using saved profile data for {candidate_email}, skipping document extraction.")
    elif resume:
        content = await resume.read()
        try:
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=os.path.splitext(resume.filename or ".txt")[1]
            ) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                resume_text_str = await resume_parser.extract_text_from_file(tmp_path)
                print(f"DEBUG: Extracted {len(resume_text_str)} chars from {resume.filename}")
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception as e:
            print(f"DEBUG: Text extraction failed: {e}")
            try:
                resume_text_str = content.decode("utf-8")
            except Exception:
                resume_text_str = "[Extraction Failed]"
    
    # Update application with saved parsed data if available BEFORE screening runs
    if use_saved and saved_parsed_data:
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE applications SET parsed_data = $1 WHERE id = $2",
                    saved_parsed_data,
                    application_id,
                )
        except Exception:
            pass
    
    # 6. Screening (must not roll back a successful application insert)
    print(f"DEBUG: Running screening for {candidate_email}")
    try:
        await run_screening_pipeline(
            application_id=application_id,
            job_id=job_id,
            resume_text=resume_text_str,
            candidate_email=candidate_email,
            candidate_name=candidate_name,
        )
    except Exception as e:
        print(f"ERROR: Screening failed after insert (application_id={application_id}): {e}")
        import traceback
        traceback.print_exc()

    # Notify recruiter of new application
    try:
        from app.api.v1.endpoints.notifications import create_notification
        async with pool.acquire() as conn:
            job_row = await conn.fetchrow(
                "SELECT title, recruiter_id FROM jobs WHERE id = $1", job_id
            )
        if job_row:
            await create_notification(
                user_id=str(job_row["recruiter_id"]),
                type="new_application",
                title="New Application Received",
                message=f"{candidate_name} applied for {job_row['title']}",
                link=f"/recruiter/candidates",
            )
    except Exception:
        pass
    
    # Fetch final updated data
    async with pool.acquire() as conn:
        final_row = await conn.fetchrow(
            "SELECT ai_score, status FROM applications WHERE id = $1 LIMIT 1",
            application_id,
        )
    final_score = final_row.get("ai_score") if final_row else 0.0
    final_status = (final_row.get("status") if final_row else None) or ApplicationStatus.APPLIED
    
    return ApplyResponse(
        application_id=application_id,
        ai_score=final_score,
        status=final_status,
        message="Application submitted successfully. The recruiter will review your profile.",
        interview_invited=False,  # recruiter decides — no auto-invite
    )


@router.get("/{application_id}/status", response_model=ApplicationResponse)
async def get_application_status(application_id: str):
    """Poll application status."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        result = await conn.fetchrow(
            """
            SELECT
                a.*,
                json_build_object('title', j.title) AS jobs
            FROM applications a
            LEFT JOIN jobs j ON j.id = a.job_id
            WHERE a.id = $1
            LIMIT 1
            """,
            application_id,
        )
    if not result:
        raise HTTPException(status_code=404, detail="Application not found.")
    app_data = row_to_dict(result)
    app_data["resume_url"] = generate_presigned_url_if_s3(app_data.get("resume_url"))
    return app_data


@router.get("/", response_model=list[ApplicationResponse])
async def list_applications(
    job_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """List applications with profile details."""
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied.")
    
    pool = await get_pg_pool()
    
    # Restrict to recruiter's jobs
    if current_user["role"] == "recruiter":
        async with pool.acquire() as conn:
            jobs_res = await conn.fetch("SELECT id FROM jobs WHERE recruiter_id = $1", current_user["sub"])
        job_ids = [j["id"] for j in jobs_res]
        if not job_ids:
            return []
        job_ids_filter = job_ids
    else:
        job_ids_filter = None

    where_parts = []
    params = []
    idx = 1
    if job_ids_filter is not None:
        where_parts.append(f"a.job_id = ANY(${idx}::uuid[])")
        params.append(job_ids_filter)
        idx += 1
    if job_id:
        where_parts.append(f"a.job_id = ${idx}")
        params.append(job_id)
        idx += 1
    if status:
        where_parts.append(f"a.status = ${idx}")
        params.append(status)
    where_sql = f"WHERE {' AND '.join(where_parts)}" if where_parts else ""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"""
            SELECT
                a.*,
                json_build_object('title', j.title, 'location', j.location) AS jobs,
                json_build_object('email', u.email) AS users,
                COALESCE((
                    SELECT json_agg(json_build_object('scheduled_at', i.scheduled_at))
                    FROM interviews i WHERE i.application_id = a.id
                ), '[]'::json) AS interviews
            FROM applications a
            LEFT JOIN jobs j ON j.id = a.job_id
            LEFT JOIN users u ON u.id = a.candidate_id
            {where_sql}
            ORDER BY a.created_at DESC
            """,
            *params,
        )
    apps = [row_to_dict(r) for r in rows]
    
    # 1. Fetch all assessment IDs for these applications to ensure status sync
    app_ids = [a["id"] for a in apps] if apps else []
    if app_ids:
        # Check assessments table for any assessments linked to these application IDs (via interviews)
        async with pool.acquire() as conn:
            assessments_res = await conn.fetch(
                """
                SELECT a.interview_id, i.application_id
                FROM assessments a
                LEFT JOIN interviews i ON i.id = a.interview_id
                WHERE i.application_id = ANY($1::uuid[])
                """,
                app_ids,
            )
        interviewed_app_ids = set()
        for ass in (assessments_res or []):
            if ass.get("application_id") in app_ids:
                interviewed_app_ids.add(ass["application_id"])
    else:
        interviewed_app_ids = set()

    # Enrich with candidate full_name from profiles
    candidate_ids = list({a["candidate_id"] for a in apps if a.get("candidate_id")})
    profiles_map = {}
    if candidate_ids:
        async with pool.acquire() as conn:
            profiles_res = await conn.fetch(
                "SELECT id, full_name, phone FROM profiles WHERE id = ANY($1::uuid[])",
                candidate_ids,
            )
        profiles_map = {p["id"]: row_to_dict(p) for p in profiles_res}
    
    for app in apps:
        app["resume_url"] = generate_presigned_url_if_s3(app.get("resume_url"))
        cid = app.get("candidate_id")
        profile = profiles_map.get(cid, {})
        
        # Override status to 'interviewed' if an assessment exists but DB status is lagging
        if app.get("id") in interviewed_app_ids and app.get("status") in ("applied", "screening", "invited", "scheduled", "interviewing"):
            app["status"] = "interviewed"

        # ── Standardized Name Resolution ──
        parsed = app.get("parsed_data") or {}
        resume_name = parsed.get("name", "").strip() if isinstance(parsed, dict) else ""
        profile_name = profile.get("full_name", "").strip() or ""
        email_prefix = (app.get("users") or {}).get("email", "").split("@")[0].replace(".", " ").title()
        
        final_name = "Candidate"
        if resume_name and len(resume_name) > 1:
            final_name = resume_name
        elif profile_name and profile_name.lower() not in ("daya", "mock", "test"):
            final_name = profile_name
        elif email_prefix:
            final_name = email_prefix
            
        # CamelCase fix if needed
        if " " not in final_name and any(c.isupper() for c in final_name[1:]):
            import re
            final_name = re.sub(r'(?<!^)(?=[A-Z])', ' ', final_name).strip()

        app["candidate_name"] = final_name
        app["candidate_phone"] = profile.get("phone") or ""
    
    return apps


@router.get("/me", response_model=list[ApplicationResponse])
async def list_my_applications(
    current_user: dict = Depends(get_current_user),
):
    """List applications for the current candidate."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                a.*,
                json_build_object('title', j.title, 'location', j.location) AS jobs
            FROM applications a
            LEFT JOIN jobs j ON j.id = a.job_id
            WHERE a.candidate_id = $1
            ORDER BY a.created_at DESC
            """,
            current_user["sub"],
        )
    apps = [row_to_dict(r) for r in rows]
    for app in apps:
        app["resume_url"] = generate_presigned_url_if_s3(app.get("resume_url"))
    return apps


@router.post("/{application_id}/invite")
async def invite_to_interview(
    application_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Recruiter manually invites a candidate to schedule their interview.
    Sends the invite email and sets status to 'invited'.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    pool = await get_pg_pool()

    async with pool.acquire() as conn:
        app_row = await conn.fetchrow(
            """
            SELECT a.id, a.candidate_id, a.job_id, a.status,
                   u.email AS candidate_email,
                   p.full_name AS candidate_name,
                   j.title AS job_title, j.recruiter_id
            FROM applications a
            JOIN users u ON u.id = a.candidate_id
            LEFT JOIN profiles p ON p.id = a.candidate_id
            JOIN jobs j ON j.id = a.job_id
            WHERE a.id = $1
            LIMIT 1
            """,
            application_id,
        )

    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Only the job's recruiter can invite
    if str(app_row["recruiter_id"]) != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Not your job posting.")

    candidate_email = app_row["candidate_email"]
    candidate_name = app_row["candidate_name"] or candidate_email.split("@")[0].title()
    job_title = app_row["job_title"]
    schedule_link = f"{settings.FRONTEND_URL}/candidate/schedule?app_id={application_id}"

    # Send invite email
    try:
        await send_interview_invite(
            to_email=candidate_email,
            candidate_name=candidate_name,
            match_score=0,  # not shown in email
            schedule_link=schedule_link,
            job_title=job_title,
        )
    except Exception as e:
        print(f"WARN: Invite email failed: {e}")

    # Update status to invited
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE applications SET status = 'invited' WHERE id = $1",
            application_id,
        )

    # Notify candidate in-app
    try:
        from app.api.v1.endpoints.notifications import create_notification
        await create_notification(
            user_id=str(app_row["candidate_id"]),
            type="interview_scheduled",
            title="Interview Invitation",
            message=f"You've been invited to interview for {job_title}. Schedule your slot now.",
            link=f"/candidate/schedule?app_id={application_id}",
        )
    except Exception:
        pass

    return {"ok": True, "message": f"Invite sent to {candidate_email}"}
