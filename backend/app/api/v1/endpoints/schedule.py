"""Scheduling endpoints — slot listing and booking."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.schemas import TimeSlot, BookSlotRequest, ScheduleResponse
from app.services.email_service import send_calendar_invite
from app.core.database import get_pg_pool
from app.core.config import settings

router = APIRouter()


def generate_slots(days_ahead: int = 7) -> List[TimeSlot]:
    """Generate available 45-min interview slots for the next N days (9 AM – 6 PM IST)."""
    slots = []
    now = datetime.utcnow()
    
    for day_offset in range(1, days_ahead + 1):
        day = now + timedelta(days=day_offset)
        if day.weekday() >= 5:  # Skip weekends
            continue
        
        for hour in range(9, 18):  # 9 AM to 5 PM
            for minute in [0, 30]:  # Every 30 mins
                start = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
                slots.append(TimeSlot(
                    slot_id=f"{start.strftime('%Y%m%d-%H%M')}",
                    start_time=start,
                    end_time=start + timedelta(minutes=45),
                    available=True,
                ))
    
    return slots[:20]  # Return first 20 slots


@router.get("/slots", response_model=List[TimeSlot])
async def get_available_slots(application_id: str):
    """Get available interview time slots."""
    pool = await get_pg_pool()

    # Verify application exists and meets threshold
    async with pool.acquire() as conn:
        app_row = await conn.fetchrow(
            "SELECT id, status, ai_score FROM applications WHERE id = $1 LIMIT 1",
            application_id,
        )

    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found.")

    ai_score = app_row.get("ai_score") or 0.0
    status = app_row.get("status")
    
    # Recruiter explicitly invited the candidate -> bypass AI threshold
    if status != "invited" and ai_score < settings.MATCH_THRESHOLD:
        raise HTTPException(status_code=403, detail="Your fit score does not meet the minimum requirement to schedule an interview.")

    # Get already-booked slots to exclude
    async with pool.acquire() as conn:
        booked_rows = await conn.fetch(
            "SELECT scheduled_at FROM interviews WHERE status = 'scheduled'",
        )

    # Normalize to naive UTC minutes so we can compare with generate_slots output
    booked_times: set[str] = set()
    for row in booked_rows or []:
        dt = row["scheduled_at"]
        if dt is None:
            continue
        if getattr(dt, "tzinfo", None) is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        dt = dt.replace(second=0, microsecond=0)
        booked_times.add(dt.isoformat())

    slots = generate_slots()
    for slot in slots:
        if slot.start_time.replace(second=0, microsecond=0).isoformat() in booked_times:
            slot.available = False
    
    return [s for s in slots if s.available]


@router.post("/book", response_model=ScheduleResponse)
async def book_slot(data: BookSlotRequest):
    """Book an interview slot."""

    pool = await get_pg_pool()

    # ── Step 1: Verify the application exists (SIMPLE query, no joins) ──
    async with pool.acquire() as conn:
        app_row = await conn.fetchrow(
            "SELECT id, candidate_id, job_id FROM applications WHERE id = $1 LIMIT 1",
            data.application_id,
        )

    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found.")

    candidate_id = app_row["candidate_id"]
    job_id = app_row["job_id"]

    # ── Step 2: Get candidate name + email separately (simple queries) ──
    async with pool.acquire() as conn:
        user_row = await conn.fetchrow(
            "SELECT email FROM users WHERE id = $1 LIMIT 1",
            candidate_id,
        )
        profile_row = await conn.fetchrow(
            "SELECT full_name FROM profiles WHERE id = $1 LIMIT 1",
            candidate_id,
        )
        job_row = await conn.fetchrow(
            "SELECT title FROM jobs WHERE id = $1 LIMIT 1",
            job_id,
        )

    candidate_email = user_row.get("email") if user_row else ""
    candidate_name = profile_row.get("full_name") if profile_row else ""
    job_title = job_row.get("title") if job_row else "Interview"

    # Fallback to email local part if name is missing
    if not candidate_name and candidate_email:
        candidate_name = candidate_email.split("@")[0].replace(".", " ").title()
    if not candidate_name:
        candidate_name = "Candidate"

    # ── Step 3: Parse slot time ──
    try:
        scheduled_at = datetime.strptime(data.slot_id, "%Y%m%d-%H%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slot ID format.")
    
    # ── Step 4: Create interview record ──
    interview_id = str(uuid.uuid4())
    unique_token = str(uuid.uuid4()).replace("-", "")
    interview_link = f"/candidate/room/{interview_id}?token={unique_token}"

    async with pool.acquire() as conn:
        try:
            await conn.execute(
                """
                INSERT INTO interviews (id, application_id, scheduled_at, status, unique_link)
                VALUES ($1, $2, $3, 'scheduled', $4)
                """,
                interview_id,
                data.application_id,
                scheduled_at,
                unique_token,
            )
        except Exception as e:
            print(f"ERROR book_slot: interview insert failed: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create interview: {e}")

    # ── Step 5: Update application status to 'scheduled' ──
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE applications SET status = 'scheduled' WHERE id = $1",
                data.application_id,
            )
    except Exception as e:
        # Non-fatal; interview was already created
        print(f"WARN book_slot: application status update failed: {e}")
    
    # ── Step 6: Send calendar invite (NEVER block booking) ──
    calendar_sent = False
    try:
        await send_calendar_invite(
            to_email=candidate_email,
            candidate_name=candidate_name,
            job_title=job_title,
            scheduled_at=scheduled_at,
            interview_link=interview_link,
        )
        calendar_sent = True
    except Exception as e:
        print(f"WARN book_slot: calendar invite failed (non-fatal): {e}")
    
    return ScheduleResponse(
        interview_id=interview_id,
        scheduled_at=scheduled_at,
        unique_link=interview_link,
        calendar_invite_sent=calendar_sent,
    )
