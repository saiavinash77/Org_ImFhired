"""
Candidate Verification Endpoints
==================================
Handles the onboarding verification interview flow.

Routes:
  GET  /verification/status          — get current verification state
  POST /verification/start           — create verification interview room
  GET  /verification/{interview_id}  — get verification scorecard
  POST /verification/retake          — reset and start a new verification
"""
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_pg_pool
from app.services.verification import (
    get_verification_status,
    create_verification_interview,
    VerificationStatus,
    VERIFICATION_PASS_THRESHOLD,
)

router = APIRouter()


@router.get("/status")
async def verification_status(current_user: dict = Depends(get_current_user)):
    """
    Return the candidate's current verification state.
    Frontend uses this to decide which onboarding step to show.
    """
    if current_user.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only.")

    status = await get_verification_status(current_user["sub"])
    return status


@router.post("/start")
async def start_verification(current_user: dict = Depends(get_current_user)):
    """
    Trigger the verification interview for a candidate.
    Requires resume to be uploaded first.
    Returns the interview_id + room URL.
    """
    if current_user.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only.")

    candidate_id = current_user["sub"]
    pool = await get_pg_pool()

    # Check resume is uploaded
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            "SELECT resume_url, verification_status FROM profiles WHERE id = $1",
            candidate_id,
        )

    if not profile or not profile["resume_url"]:
        raise HTTPException(
            status_code=400,
            detail="Please upload your resume before starting the verification interview.",
        )

    # Don't allow restart if already verified
    if profile["verification_status"] == VerificationStatus.COMPLETED:
        status = await get_verification_status(candidate_id)
        if status["verified"]:
            raise HTTPException(
                status_code=400,
                detail="You are already verified. No need to retake.",
            )

    interview_id = await create_verification_interview(candidate_id)

    return {
        "interview_id": interview_id,
        "room_url": f"/candidate/verify/{interview_id}",
        "message": "Verification interview room created. You can join now.",
    }


@router.post("/retake")
async def retake_verification(current_user: dict = Depends(get_current_user)):
    """
    Allow a candidate to retake the verification interview if they failed.
    Verified candidates cannot retake.
    """
    if current_user.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only.")

    candidate_id = current_user["sub"]
    status = await get_verification_status(candidate_id)

    if status["verified"]:
        raise HTTPException(status_code=400, detail="You are already verified.")

    if not status["has_resume"]:
        raise HTTPException(status_code=400, detail="Please upload your resume first.")

    interview_id = await create_verification_interview(candidate_id)

    return {
        "interview_id": interview_id,
        "room_url": f"/candidate/verify/{interview_id}",
        "message": "New verification interview created.",
    }


@router.get("/{interview_id}")
async def get_verification_result(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetch the verification scorecard for a completed verification interview.
    Accessible by the candidate themselves or any recruiter.
    """
    pool = await get_pg_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                vi.id,
                vi.candidate_id,
                vi.status,
                vi.completed_at,
                p.verification_score,
                p.verification_status,
                p.verification_assessment,
                p.verified_at,
                p.full_name
            FROM verification_interviews vi
            JOIN profiles p ON p.id = vi.candidate_id
            WHERE vi.id = $1
            """,
            interview_id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Verification interview not found.")

    # Candidates can only see their own; recruiters can see anyone's
    role = current_user.get("role")
    if role == "candidate" and str(row["candidate_id"]) != current_user["sub"]:
        raise HTTPException(status_code=403, detail="Access denied.")

    score = row["verification_score"]
    passed = score is not None and score >= VERIFICATION_PASS_THRESHOLD

    return JSONResponse(content={
        "interview_id": str(row["id"]),
        "candidate_id": str(row["candidate_id"]),
        "candidate_name": row["full_name"],
        "status": row["verification_status"],
        "score": score,
        "passed": passed,
        "verified_at": row["verified_at"].isoformat() if row["verified_at"] else None,
        "assessment": row["verification_assessment"] or {},
        "pass_threshold": VERIFICATION_PASS_THRESHOLD,
    })


@router.get("/badge/{candidate_id}")
async def get_verification_badge(candidate_id: str):
    """
    Public endpoint — returns the verification badge info for a candidate.
    Used on job applications so recruiters can see verified status inline.
    No auth required (badge is public signal).
    """
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                verification_status,
                verification_score,
                verified_at
            FROM profiles
            WHERE id = $1
            """,
            candidate_id,
        )

    if not row:
        return {"verified": False, "score": None, "verified_at": None}

    score = row["verification_score"]
    verified = (
        row["verification_status"] == VerificationStatus.COMPLETED
        and score is not None
        and score >= VERIFICATION_PASS_THRESHOLD
    )

    return {
        "verified": verified,
        "score": score,
        "verified_at": row["verified_at"].isoformat() if row["verified_at"] else None,
    }
