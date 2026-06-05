"""Application configuration — AWS-native, no Supabase."""
from typing import List, Optional
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=str(Path(__file__).resolve().parent.parent.parent / ".env"), override=True)


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "FiredIn"
    APP_ENV: str = "development"
    DEBUG: bool = True
    USE_REDIS: bool = False

    # ── Server ────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "https://firedin.vercel.app",
        "https://firedin.in",
        # Allow ngrok for development
        "http://localhost:4040",  # ngrok local dashboard
    ]

    # ── Database (AWS RDS PostgreSQL) ─────────────────────────
    # Format: postgresql://user:password@host:5432/dbname
    DATABASE_URL: str = ""

    # ── AWS Cognito ───────────────────────────────────────────
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_CLIENT_ID: str = ""
    # Client secret is optional (only needed for server-side auth flows)
    COGNITO_CLIENT_SECRET: str = ""

    # ── JWT (issued by this backend after Cognito verification) ──
    SECRET_KEY: str = "change-me-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── OpenAI ────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    JUDGE_MODEL: str = "gpt-4o-mini"
    OPENAI_REALTIME_MODEL: str = "gpt-4o-realtime-preview"

    # ── Redis (AWS ElastiCache) ───────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_TTL: int = 3600

    # ── AWS General ───────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"

    # ── AWS S3 ────────────────────────────────────────────────
    AWS_S3_BUCKET: str = "firedin-uploads"
    AWS_S3_REGION: str = "us-east-1"

    # ── AWS SES (email) ───────────────────────────────────────
    AWS_SES_FROM_EMAIL: str = "noreply@firedin.in"
    # Resend is kept as fallback
    RESEND_API_KEY: str = ""

    # ── SMTP fallback ─────────────────────────────────────────
    USE_SMTP: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "FiredIn"

    # ── Langfuse (observability) ──────────────────────────────
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # ── Interview settings ────────────────────────────────────
    MATCH_THRESHOLD: float = 0.20
    INTERVIEW_ROOM_EXPIRY: int = 7200
    MAX_INTERVIEW_DURATION: int = 5400
    INTERVIEW_FAST_TEST: bool = False
    INTERVIEW_FAST_PHASE_SECONDS: int = 15

    # ── Frontend ──────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:3002"

    class Config:
        env_file = str(Path(__file__).resolve().parent.parent.parent / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
