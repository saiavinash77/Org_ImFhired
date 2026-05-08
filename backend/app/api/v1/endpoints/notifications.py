"""
Notifications API
=================
Simple in-app notification system.

Triggers (called from other services):
  - New application received  → recruiter
  - Assessment ready          → recruiter
  - Interview scheduled       → candidate
  - Offer sent                → candidate
  - Verification complete     → candidate

Routes:
  GET  /notifications/          — list notifications for current user
  GET  /notifications/unread    — unread count (for bell badge)
  POST /notifications/{id}/read — mark one as read
  POST /notifications/read-all  — mark all as read
"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.database import get_pg_pool
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


# ── Schema ────────────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Helper: create a notification (called internally by other endpoints) ──────

async def create_notification(
    user_id: str,
    type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
):
    """Insert a notification row. Non-fatal — never raises."""
    try:
        pool = await get_pg_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO notifications (id, user_id, type, title, message, link)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                str(uuid.uuid4()), user_id, type, title, message, link,
            )
    except Exception as e:
        print(f"[Notifications] Failed to create notification: {e}")


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/unread")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Return unread notification count for the bell badge."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
            current_user["sub"],
        )
    return {"count": count or 0}


@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """Return the latest notifications for the current user."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, user_id, type, title, message, link, is_read, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            current_user["sub"], limit,
        )
    return [dict(r) for r in rows]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a single notification as read."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
            notification_id, current_user["sub"],
        )
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
            current_user["sub"],
        )
    return {"ok": True}
