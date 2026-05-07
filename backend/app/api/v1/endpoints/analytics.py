"""
Analytics API — Connects dashboard and analytics pages to real database.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_pg_pool, row_to_dict
from app.api.v1.endpoints.auth import get_current_user
from app.services.s3_utils import generate_presigned_url_if_s3

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Fetch real-time stats for the Recruiter Dashboard."""
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    pool = await get_pg_pool()
    
    # Simple count fetching using select with count='exact' isn't totally clean in python client,
    # so we'll fetch all relevant rows and count, which is fine for this MVP size.
    
    # Active Jobs
    async with pool.acquire() as conn:
        jobs_rows = await conn.fetch(
            "SELECT id, status FROM jobs WHERE recruiter_id = $1 AND is_active = TRUE",
            current_user["sub"],
        )
    active_jobs_count = len(jobs_rows)
    
    # All applications for recruiter's jobs
    # First, get recruiter job ids
    async with pool.acquire() as conn:
        my_jobs = await conn.fetch("SELECT id FROM jobs WHERE recruiter_id = $1", current_user["sub"])
    job_ids = [j["id"] for j in my_jobs]
    
    if not job_ids:
        # Avoid empty IN clause
        job_ids = ["00000000-0000-0000-0000-000000000000"]

    async with pool.acquire() as conn:
        apps_rows = await conn.fetch(
            """
            SELECT
                a.id, a.status, a.ai_score, a.created_at, a.candidate_id, a.parsed_data,
                json_build_object('email', u.email) AS users,
                json_build_object('title', j.title) AS jobs
            FROM applications a
            LEFT JOIN users u ON u.id = a.candidate_id
            LEFT JOIN jobs j ON j.id = a.job_id
            WHERE a.job_id = ANY($1::uuid[])
            ORDER BY a.created_at DESC
            """,
            job_ids,
        )
    apps_data = [row_to_row_to_dict(r) for r in apps_rows]
    
    # Fetch candidate profiles
    candidate_ids = list({a["candidate_id"] for a in apps_data if a.get("candidate_id")})
    profiles_map = {}
    if candidate_ids:
        async with pool.acquire() as conn:
            profiles_rows = await conn.fetch(
                "SELECT id, full_name FROM profiles WHERE id = ANY($1::uuid[])",
                candidate_ids,
            )
        profiles_map = {p["id"]: p["full_name"] for p in profiles_rows}
    
    # Build a per-application name map: prefer resume parsed name over profile name
    # This handles cases where a candidate applies using someone else's account
    def resolve_candidate_name(app: dict) -> str:
        """Standardized name resolution: Parsed Resume > Profile > Email Prefix."""
        parsed = app.get("parsed_data") or {}
        # 1. Try name from parsed resume (most accurate)
        resume_name = parsed.get("name", "") if isinstance(parsed, dict) else ""
        if resume_name and len(resume_name) > 1:
            # Handle CamelCase if needed
            if " " not in resume_name:
                import re
                resume_name = re.sub(r'(?<!^)(?=[A-Z])', ' ', resume_name)
            return resume_name.strip()
        
        # 2. Try profile full_name
        profile_name = profiles_map.get(app.get("candidate_id"), "") or ""
        if profile_name and profile_name.lower() not in ("daya", "mock", "test"):
            return profile_name.strip()
            
        # 3. Fallback to email local part
        email = app.get("users", {}).get("email") or ""
        if email:
            return email.split("@")[0].replace(".", " ").title()
            
        return "Candidate"

    total_applications = len(apps_data)
    
    # Map applications to IDs
    app_ids = [a["id"] for a in apps_data]
    if not app_ids:
        app_ids = ["00000000-0000-0000-0000-000000000000"]
        
    app_map = {a["id"]: a for a in apps_data}
    
    # 1. Fetch assessments to filter out already-completed interviews from 'Upcoming'
    async with pool.acquire() as conn:
        assessments_rows = await conn.fetch("SELECT interview_id FROM assessments")
    assessed_interview_ids = {ass["interview_id"] for ass in assessments_rows}

    # Fetch real scheduled interviews
    async with pool.acquire() as conn:
        interviews_rows = await conn.fetch(
            """
            SELECT id, scheduled_at, status, application_id
            FROM interviews
            WHERE application_id = ANY($1::uuid[]) AND status = 'scheduled'
            ORDER BY scheduled_at ASC
            """,
            app_ids,
        )
    
    today = datetime.now().date()
    interviews_today = 0
    upcoming_interviews = []
    
    for iv in interviews_rows:
        # Skip if already assessed
        if iv["id"] in assessed_interview_ids:
            continue

        sched_str = iv.get("scheduled_at")
        if not sched_str: continue
            
        sched_dt = datetime.fromisoformat(sched_str.replace('Z', '+00:00'))
        
        if sched_dt.date() == today:
            interviews_today += 1
            
        if sched_dt.date() >= today:
            app_data = app_map.get(iv["application_id"], {})
            c_name = resolve_candidate_name(app_data)
            
            j_title = app_data.get("jobs", {}).get("title", "Unknown Role") if app_data.get("jobs") else "Unknown Role"
            initials = "".join([n[0] for n in c_name.split()[:2] if n]).upper() if c_name != "Unknown" else "U"
            
            time_str = sched_dt.strftime("%I:%M %p")
            date_str = sched_dt.strftime("%b %d")
            
            upcoming_interviews.append({
                "candidate": c_name,
                "role": j_title,
                "time": f"{date_str}, {time_str}",
                "type": "AI Eval",
                "initials": initials
            })
            
    upcoming_interviews = upcoming_interviews[:5]

    # Hired this month
    hired_count = sum(1 for a in apps_data if a.get("status") == "hired")
    
    # Recent candidates
    recent_candidates = []
    for app in apps_data[:5]:
        candidate_name = resolve_candidate_name(app)
        
        job_title = app.get("jobs", {}).get("title", "Unknown Role") if app.get("jobs") else "Unknown Role"
        # simple time diff
        created_dt = datetime.fromisoformat(app["created_at"].replace('Z', '+00:00'))
        hours_ago = int((datetime.now(created_dt.tzinfo) - created_dt).total_seconds() / 3600)
        time_str = f"{hours_ago}h ago" if hours_ago < 24 else f"{hours_ago // 24}d ago"
        
        avatar = "".join([n[0] for n in candidate_name.split()[:2]]).upper() if candidate_name else "U"
        
        raw_score = app.get("ai_score", 0)
        formatted_score = round(raw_score * 100, 1) if raw_score and raw_score < 1 else round(raw_score, 1)
        
        # Determine status for dashboard
        app_status = app.get("status", "applied")
        if app.get("id") in [iv["application_id"] for iv in interviews_rows if iv["id"] in assessed_interview_ids]:
            app_status = "interviewed"

        recent_candidates.append({
            "name": candidate_name,
            "role": job_title,
            "score": formatted_score, 
            "status": app_status,
            "time": time_str,
            "avatar": avatar
        })
        
    return {
        "stats": [
            {"label": "Active Jobs", "value": str(active_jobs_count), "change": "+0", "trend": "up", "icon": "Briefcase", "accent": "glass-stat-brand", "iconBg": "rgba(99,102,241,0.12)", "iconColor": "#6366f1"},
            {"label": "Applications", "value": str(total_applications), "change": "+0%", "trend": "up", "icon": "Users", "accent": "glass-stat-purple", "iconBg": "rgba(168,85,247,0.12)", "iconColor": "#a855f7"},
            {"label": "Upcoming Interviews", "value": str(len(upcoming_interviews)), "change": f"+{len(upcoming_interviews)}", "trend": "up", "icon": "Video", "accent": "glass-stat-blue", "iconBg": "rgba(59,130,246,0.12)", "iconColor": "#3b82f6"},
            {"label": "Hired This Month", "value": str(hired_count), "change": "+0%", "trend": "up", "icon": "CheckCircle", "accent": "glass-stat-green", "iconBg": "rgba(34,197,94,0.12)", "iconColor": "#22c55e"},
        ],
        "recentCandidates": recent_candidates,
        "upcomingInterviews": upcoming_interviews
    }


@router.get("/talent-pool")
async def get_talent_pool(current_user: dict = Depends(get_current_user)):
    """
    Return passive candidates (profiles with resumes) who have NOT already
    applied to the recruiter's active jobs. Sorted by experience descending.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")

    pool = await get_pg_pool()

    # 1. Get recruiter's active job IDs
    async with pool.acquire() as conn:
        my_jobs = await conn.fetch(
            "SELECT id FROM jobs WHERE recruiter_id = $1 AND is_active = TRUE",
            current_user["sub"],
        )
    my_job_ids = [j["id"] for j in my_jobs]

    # 2. Get candidate IDs who already applied to recruiter's jobs
    already_applied_ids: set = set()
    if my_job_ids:
        async with pool.acquire() as conn:
            apps = await conn.fetch(
                "SELECT candidate_id FROM applications WHERE job_id = ANY($1::uuid[])",
                my_job_ids,
            )
        already_applied_ids = {a["candidate_id"] for a in apps}

    # 3. Get all profiles that have resume_url set (they have uploaded a resume)
    async with pool.acquire() as conn:
        profiles_res = await conn.fetch(
            """
            SELECT id, full_name, resume_url, parsed_data, experience_years, skills, headline
            FROM profiles
            WHERE resume_url IS NOT NULL
            """
        )

    # 4. Filter out already-applied candidates and also filter out recruiters
    async with pool.acquire() as conn:
        users_res = await conn.fetch("SELECT id, role FROM users")
    recruiter_ids = {u["id"] for u in users_res if u.get("role") in ("recruiter", "admin")}

    pool = []
    seen_names: set = set()
    for p in profiles_res:
        pid = p["id"]
        if pid in already_applied_ids:
            continue
        if pid in recruiter_ids:
            continue

        # Resolve display name — prefer parsed_data name
        parsed = p.get("parsed_data") or {}
        resume_name = parsed.get("name", "").strip() if isinstance(parsed, dict) else ""
        display_name = resume_name or p.get("full_name", "").strip() or "Unknown Candidate"

        # Skip totally empty profiles
        if display_name == "Unknown Candidate" and not p.get("skills"):
            continue

        # Deduplicate by normalized name (same person across multiple test accounts)
        name_key = display_name.lower().strip()
        if name_key in seen_names:
            continue
        seen_names.add(name_key)

        skills = p.get("skills") or (parsed.get("skills", []) if isinstance(parsed, dict) else [])
        exp = p.get("experience_years") or (parsed.get("total_years_experience", 0) if isinstance(parsed, dict) else 0)
        try:
            exp = float(exp or 0)
        except (TypeError, ValueError):
            exp = 0.0

        initials = "".join([n[0] for n in display_name.split()[:2] if n]).upper() or "U"

        resume_url = p.get("resume_url")
        # Convert raw S3 URL → presigned URL so browser can download it
        if resume_url and "amazonaws.com" in resume_url:
            resume_url = generate_presigned_url_if_s3(resume_url, expiry_seconds=3600)

        pool.append({
            "id": pid,
            "name": display_name,
            "initials": initials,
            "headline": p.get("headline") or (parsed.get("summary", "")[:80] if isinstance(parsed, dict) else ""),
            "skills": skills[:6],
            "experience_years": exp,
            "resume_url": resume_url,
            "match_indicator": "high" if exp >= 3 else "medium" if exp >= 1 else "entry",
        })

    # Sort by experience descending, cap at 20

    pool.sort(key=lambda x: x["experience_years"], reverse=True)
    return pool[:20]


@router.get("/metrics")
async def get_analytics_metrics(current_user: dict = Depends(get_current_user), time_range: str = Query("30d", alias="range")):
    """Get metrics for the Analytics page."""
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Recruiter access required.")
        
    pool = await get_pg_pool()
    
    # 1. Get Top Jobs
    async with pool.acquire() as conn:
        jobs_res = await conn.fetch(
            "SELECT id, title, department FROM jobs WHERE recruiter_id = $1",
            current_user["sub"],
        )
    job_ids = [j["id"] for j in jobs_res]
    if not job_ids:
        job_ids = ["00000000-0000-0000-0000-000000000000"]
        
    async with pool.acquire() as conn:
        apps_rows = await conn.fetch(
            """
            SELECT
                a.id, a.status, a.ai_score, a.created_at, a.job_id,
                json_build_object('title', j.title, 'department', j.department, 'is_active', j.is_active) AS jobs
            FROM applications a
            LEFT JOIN jobs j ON j.id = a.job_id
            WHERE a.job_id = ANY($1::uuid[])
            """,
            job_ids,
        )
    apps_data = [row_to_row_to_dict(r) for r in apps_rows]
    
    # Pipeline stages
    applied = len(apps_data)
    
    # 1. Fetch assessments to ensure 'Interviewed' status is accurate even if application status hasn't synced
    all_app_ids = [a["id"] for a in apps_data] if apps_data else ["00000000-0000-0000-0000-000000000000"]
    async with pool.acquire() as conn:
        assessments_res = await conn.fetch(
            """
            SELECT a.interview_id, i.application_id
            FROM assessments a
            LEFT JOIN interviews i ON i.id = a.interview_id
            """
        )
    interviewed_app_ids = set()
    for ass in assessments_res:
        if ass.get("application_id") in all_app_ids:
            interviewed_app_ids.add(ass["application_id"])

    # Pipeline counts
    screened_raw = sum(1 for a in apps_data if a.get('status') != 'applied')
    shortlisted_raw = sum(1 for a in apps_data if a.get("status") in ("invited", "scheduled", "interviewing", "interviewed", "offered", "hired"))
    interviewed_raw = sum(1 for a in apps_data if a.get("status") in ("interviewed", "offered", "hired") or a.get("id") in interviewed_app_ids)
    offered_raw = sum(1 for a in apps_data if a.get("status") in ("offered", "hired"))
    hired_raw = sum(1 for a in apps_data if a.get("status") == "hired")

    # Ensure logical pipeline drops (Stage N cannot be > Stage N-1)
    screened = max(screened_raw, shortlisted_raw, interviewed_raw, offered_raw, hired_raw)
    shortlisted = max(shortlisted_raw, interviewed_raw, offered_raw, hired_raw)
    interviewed = max(interviewed_raw, offered_raw, hired_raw)
    offered = max(offered_raw, hired_raw)
    hired = hired_raw

    # 2. Calculate AI Match Accuracy (Average of ai_score)
    scores = [a.get("ai_score") or 0 for a in apps_data if a.get("ai_score") is not None]
    # If scores are 0-1, convert to pct; if 0-100, keep as is
    def normalize_score(s):
        return s * 100 if s <= 1.0 else s
    
    normalized_scores = [normalize_score(s) for s in scores]
    avg_accuracy = int(sum(normalized_scores) / len(normalized_scores)) if normalized_scores else 0

    pipeline = [
        {"stage": "Applied", "count": applied, "pct": 100 if applied else 0, "color": "bg-brand-500"},
        {"stage": "AI Screened", "count": screened, "pct": int((screened/applied)*100) if applied else 0, "color": "bg-accent-500"},
        {"stage": "Shortlisted", "count": shortlisted, "pct": int((shortlisted/applied)*100) if applied else 0, "color": "bg-brand-400"},
        {"stage": "Interviewed", "count": interviewed, "pct": int((interviewed/applied)*100) if applied else 0, "color": "bg-warning-500"},
        {"stage": "Offer Sent", "count": offered, "pct": int((offered/applied)*100) if applied else 0, "color": "bg-success-500"},
        {"stage": "Hired", "count": hired, "pct": int((hired/applied)*100) if applied else 0, "color": "bg-emerald-600"},
    ]
    
    # Top Jobs
    job_stats = {}
    for a in apps_data:
        jid = a["job_id"]
        if jid not in job_stats:
            jdata = a.get("jobs") or {}
            job_stats[jid] = {
                "title": jdata.get("title", "Unknown"),
                "dept": jdata.get("department", "Engineering"),
                "apps": 0,
                "score_sum": 0,
                "urgency": "medium",  # defaulting as column does not exist in db
                "filled": not jdata.get("is_active", True)
            }
            
        job_stats[jid]["apps"] += 1
        job_stats[jid]["score_sum"] += (a.get("ai_score") or 0)
        
    top_jobs = []
    for jid, st in job_stats.items():
        avg_score = int((st["score_sum"] / st["apps"]) * 100) if (st["apps"] > 0 and st["score_sum"] < st["apps"]) else int(st["score_sum"] / st["apps"]) if (st["apps"] > 0 and st["score_sum"] >= st["apps"]) else 0
        if avg_score < 0: avg_score = 0
        if avg_score > 100: avg_score = 100
        
        top_jobs.append({
            "title": st["title"],
            "dept": st["dept"],
            "apps": st["apps"],
            "filled": st["filled"],
            "score": avg_score,
            "urgency": st["urgency"]
        })
        
    top_jobs = sorted(top_jobs, key=lambda x: x["apps"], reverse=True)[:5]
    
    # Real Interviews Done count
    # We use assessment count as the source of truth for "Interviews Done"
    interviews_done_count = len(interviewed_app_ids)

    # KPIs
    kpis = [
        {"label": "Total Applications", "value": str(applied), "change": "+0%", "positive": True, "icon": "Users", "color": "brand", "sub": "vs last period"},
        {"label": "AI Interviews Done", "value": str(interviews_done_count), "change": "+0%", "positive": True, "icon": "Video", "color": "purple", "sub": "this month"},
        {"label": "Avg. Time to Hire", "value": "14d", "change": "-0d", "positive": True, "icon": "Clock", "color": "amber", "sub": "days"},
        {"label": "Offer Acceptance", "value": f"{int((hired/offered)*100) if offered else 0}%", "change": "+0%", "positive": True, "icon": "CheckCircle", "color": "green", "sub": "rate"},
        {"label": "AI Match Accuracy", "value": f"{avg_accuracy}%", "change": "+0%", "positive": True, "icon": "Brain", "color": "accent", "sub": "precision"},
        {"label": "Rejected Candidates", "value": str(sum(1 for a in apps_data if a.get("status") == "rejected")), "change": "+0", "positive": False, "icon": "XCircle", "color": "red", "sub": "this period"},
    ]

    # ── Real Weekly Activity (last 7 days from application created_at) ──
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekly_apps = {d: 0 for d in range(7)}    # 0=Mon … 6=Sun (weekday index)
    weekly_intv = {d: 0 for d in range(7)}

    # Also fetch interviews for this recruiter's apps within the last 7 days
    if apps_data:
        all_app_ids = [a["id"] for a in apps_data]
        if not all_app_ids:
            all_app_ids = ["00000000-0000-0000-0000-000000000000"]
        async with pool.acquire() as conn:
            intv_res = await conn.fetch(
                "SELECT id, scheduled_at, application_id FROM interviews WHERE application_id = ANY($1::uuid[])",
                all_app_ids,
            )
    else:
        intv_res = []

    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)

    for a in apps_data:
        try:
            created_at_str = a.get("created_at", "")
            if not created_at_str:
                continue
            created_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00")).replace(tzinfo=None)
            if created_dt >= seven_days_ago:
                weekday = created_dt.weekday()  # 0=Mon, 6=Sun
                weekly_apps[weekday] += 1
        except Exception:
            pass

    for iv in intv_res:
        try:
            sched_str = iv.get("scheduled_at", "")
            if not sched_str:
                continue
            sched_dt = datetime.fromisoformat(sched_str.replace("Z", "+00:00")).replace(tzinfo=None)
            if sched_dt >= seven_days_ago:
                weekday = sched_dt.weekday()
                weekly_intv[weekday] += 1
        except Exception:
            pass

    weekly_activity = [
        {"day": day_labels[i], "apps": weekly_apps[i], "interviews": weekly_intv[i]}
        for i in range(7)
    ]

    # ── Sourcing Channels: based on how candidates came in ──
    # Since we don't track utm_source yet, distribute by application count per job
    # as a proxy — "Direct Apply" (Careers Page) is our platform, rest is unknown
    total_apps = len(apps_data)
    if total_apps > 0:
        sourcing_channels = [
            {"name": "Direct Apply", "count": total_apps, "pct": 100, "color": "bg-brand-500"},
        ]
    else:
        sourcing_channels = []

    return {
        "kpis": kpis,
        "pipeline": pipeline,
        "topJobs": top_jobs,
        "topCandidates": [],
        "weeklyActivity": weekly_activity,
        "sourcingChannels": sourcing_channels,
    }
