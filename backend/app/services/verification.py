"""
Candidate Verification Service
================================
Handles the onboarding verification interview flow.

Flow:
  1. Candidate registers + uploads resume
  2. System creates a verification_interview record (not job-specific)
  3. Candidate completes AI voice interview (general skills + communication)
  4. Assessment generated → verification_score + badge stored on profile
  5. Candidate is now "verified" — badge travels with every job application

Verification is done ONCE. Recruiters see the badge + score on every application.
"""
import uuid
import asyncio
from datetime import datetime
from typing import Optional

from app.core.database import get_pg_pool
from app.core.config import settings
from app.services.email_service import _send_resend_email


# ── Verification status values ────────────────────────────────────────────────
class VerificationStatus:
    PENDING = "pending"          # registered, no resume yet
    RESUME_UPLOADED = "resume_uploaded"  # resume parsed, interview not started
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_IN_PROGRESS = "in_progress"
    COMPLETED = "completed"      # interview done, score assigned
    FAILED = "failed"            # score below threshold or tab_guard


VERIFICATION_PASS_THRESHOLD = 40.0  # minimum overall_score to get verified badge


async def get_verification_status(candidate_id: str) -> dict:
    """Return the candidate's current verification state."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                p.verification_status,
                p.verification_score,
                p.verified_at,
                p.verification_interview_id,
                p.resume_url,
                p.parsed_data
            FROM profiles p
            WHERE p.id = $1
            """,
            candidate_id,
        )
    if not row:
        return {"status": VerificationStatus.PENDING, "score": None, "verified": False}

    status = row["verification_status"] or VerificationStatus.PENDING
    score = row["verification_score"]
    verified = status == VerificationStatus.COMPLETED and score is not None and score >= VERIFICATION_PASS_THRESHOLD

    return {
        "status": status,
        "score": score,
        "verified": verified,
        "verified_at": row["verified_at"].isoformat() if row["verified_at"] else None,
        "interview_id": str(row["verification_interview_id"]) if row["verification_interview_id"] else None,
        "has_resume": bool(row["resume_url"]),
    }


async def create_verification_interview(candidate_id: str) -> str:
    """
    Create a verification_interview record for the candidate.
    Returns the interview_id to use for the WebSocket room.
    """
    pool = await get_pg_pool()
    interview_id = str(uuid.uuid4())
    token = str(uuid.uuid4()).replace("-", "")

    async with pool.acquire() as conn:
        # Create a special "verification" application-less interview
        await conn.execute(
            """
            INSERT INTO verification_interviews
                (id, candidate_id, status, unique_link, created_at)
            VALUES ($1, $2, 'scheduled', $3, NOW())
            ON CONFLICT (candidate_id)
            DO UPDATE SET
                id = EXCLUDED.id,
                status = 'scheduled',
                unique_link = EXCLUDED.unique_link,
                created_at = NOW()
            """,
            interview_id, candidate_id, token,
        )
        # Update profile to reflect interview is scheduled
        await conn.execute(
            """
            UPDATE profiles
            SET verification_status = $1,
                verification_interview_id = $2
            WHERE id = $3
            """,
            VerificationStatus.INTERVIEW_SCHEDULED, interview_id, candidate_id,
        )

    return interview_id


async def save_verification_result(
    interview_id: str,
    candidate_id: str,
    overall_score: float,
    assessment: dict,
):
    """
    Persist the verification assessment result to the candidate's profile.
    Called by the assessment generator after a verification interview completes.
    """
    pool = await get_pg_pool()
    passed = overall_score >= VERIFICATION_PASS_THRESHOLD
    status = VerificationStatus.COMPLETED if passed else VerificationStatus.FAILED

    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE profiles SET
                verification_status = $1,
                verification_score = $2,
                verified_at = $3,
                verification_assessment = $4
            WHERE id = $5
            """,
            status,
            overall_score,
            datetime.utcnow() if passed else None,
            assessment,  # stored as JSONB
            candidate_id,
        )
        await conn.execute(
            """
            UPDATE verification_interviews
            SET status = 'completed', completed_at = NOW()
            WHERE id = $1
            """,
            interview_id,
        )


async def send_verification_complete_email(
    to_email: str,
    candidate_name: str,
    overall_score: float,
    passed: bool,
    interview_id: str,
):
    """Notify candidate of their verification result."""
    first_name = candidate_name.split()[0] if candidate_name else "Candidate"
    scorecard_link = f"{settings.FRONTEND_URL}/candidate/verification/{interview_id}"

    if passed:
        header_gradient = "linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)"
        badge_emoji = "✅"
        headline = f"You're Verified, {first_name}!"
        subline = f"Verification Score: {int(overall_score)}/100"
        body_text = (
            f"Congratulations! You've passed the HireAI verification interview with a score of "
            f"<strong style='color:#059669;'>{int(overall_score)}/100</strong>. "
            "Your profile now carries a <strong>Verified ✓</strong> badge — recruiters can see "
            "you're a proven professional, not just a resume in a pile."
        )
        cta_text = "View Your Verification Badge"
        cta_color = "linear-gradient(135deg,#059669,#10b981)"
    else:
        header_gradient = "linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)"
        badge_emoji = "📋"
        headline = f"Interview Complete, {first_name}"
        subline = f"Score: {int(overall_score)}/100"
        body_text = (
            f"You completed the verification interview with a score of "
            f"<strong>{int(overall_score)}/100</strong>. "
            "You can review your detailed scorecard and retake the interview to improve your score. "
            "Keep going — verified candidates get significantly more recruiter attention."
        )
        cta_text = "View Scorecard & Retake"
        cta_color = "linear-gradient(135deg,#4f46e5,#7c3aed)"

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:{header_gradient};padding:40px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">{badge_emoji}</div>
            <h1 style="color:#fff;margin:0 0 8px;font-size:26px;font-weight:700;">{headline}</h1>
            <p style="color:rgba(255,255,255,0.85);margin:0;font-size:15px;">{subline}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#334155;font-size:15px;line-height:1.75;margin:0 0 28px;">{body_text}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="{scorecard_link}" style="display:inline-block;background:{cta_color};color:#fff;text-decoration:none;padding:16px 48px;border-radius:12px;font-weight:700;font-size:16px;">{cta_text}</a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#64748b;font-size:13px;margin:0;">Powered by <strong>HireAI</strong> &bull; AI-Powered Recruitment Platform</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    subject = (
        f"You're Verified on HireAI! Score: {int(overall_score)}/100"
        if passed
        else f"Your HireAI Verification Score: {int(overall_score)}/100"
    )
    await _send_resend_email(to_email, subject, html_body)
