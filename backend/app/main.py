"""
FiredIn — AI Interviewer Platform
FastAPI Application Entry Point
"""
import traceback
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import subprocess
import sys

try:
    import email_validator
except ImportError:
    pass # Let the app fail naturally if missing, or user can install it
# -------------------------------

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.endpoints import (
    jobs, applications, schedule, assessment, profiles,
    realtime_proxy, analytics, verification, notifications, admin, users
)
# Use clean auth layer (rebuilt from scratch)
from app.api.v1.endpoints import auth_clean as auth

print(f"DEBUG_STARTUP: Loading main.py")
print(f"DEBUG_STARTUP: Match Threshold: {settings.MATCH_THRESHOLD}")
print(f"DEBUG_STARTUP: Frontend URL: {settings.FRONTEND_URL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    await init_db()
    print("Database initialized")
    print(f">>> SETTINGS: MATCH_THRESHOLD={settings.MATCH_THRESHOLD}")
    print(f">>> SETTINGS: RESEND_API_KEY={'SET' if settings.RESEND_API_KEY else 'NOT SET'}")
    print("FiredIn Backend started on port 8002")
    yield
    print("FiredIn Backend shutting down")


app = FastAPI(
    title="FiredIn API",
    description="AI-Powered Interview & Skill Assessment Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)


# ── CORS: Must be added FIRST ──
# Production: locked to specific origins via ALLOWED_ORIGINS setting.
# Local dev: set ALLOWED_ORIGINS in .env; it defaults to localhost:3002.
# For ngrok: allow all *.ngrok.io domains in development
if settings.APP_ENV == "development":
    # In development, allow ngrok and localhost
    cors_origins = settings.ALLOWED_ORIGINS + [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ]
    # Allow all ngrok URLs
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.*\.ngrok\.io)(:\d+)?",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
        expose_headers=["Content-Length", "X-Process-Time"],
    )
else:
    # Production: strict CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
        expose_headers=["Content-Length", "X-Process-Time"],
    )

app.add_middleware(GZipMiddleware, minimum_size=1000)


# ── Global exception handler — ALWAYS returns CORS headers ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch ALL unhandled exceptions and return a proper JSON response with CORS headers."""
    tb = traceback.format_exc()
    print(f"UNHANDLED ERROR on {request.method} {request.url}:")
    print(tb)
    content = {"detail": str(exc)}
    if settings.DEBUG:
        content["traceback"] = tb
    return JSONResponse(
        status_code=500,
        content=content,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


# ── Request logging ──
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f">> {request.method} {request.url}")
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # This catches errors that happen DURING request processing
        tb = traceback.format_exc()
        print(f"MIDDLEWARE CAUGHT ERROR: {e}")
        print(tb)
        content = {"detail": str(e)}
        if settings.DEBUG:
            content["traceback"] = tb
        return JSONResponse(
            status_code=500,
            content=content,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        )


# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/api/v1/applications", tags=["Applications"])
app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["Candidate Profiles"])
app.include_router(schedule.router, prefix="/api/v1/schedule", tags=["Scheduling"])
app.include_router(assessment.router, prefix="/api/v1/assessments", tags=["Assessments"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(verification.router, prefix="/api/v1/verification", tags=["Verification"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
from app.api.v1.endpoints import assistant_chat
app.include_router(assistant_chat.router, prefix="/api/v1/assistant", tags=["AI Assistant"])
from app.api.v1.endpoints import interview_chat
app.include_router(interview_chat.router, prefix="/api/v1/interview", tags=["Interview Chat"])
app.include_router(realtime_proxy.router, prefix="/ws/v1", tags=["Realtime Speech-to-Speech"])

from app.api.v1.endpoints import stories as stories_router
from app.api.v1.endpoints import search as search_router
app.include_router(stories_router.router, prefix="/api/v1/stories", tags=["Stories of Work"])
app.include_router(search_router.router, prefix="/api/v1/search", tags=["AI Candidate Search"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "FiredIn API",
        "version": "1.0.0",
    }
