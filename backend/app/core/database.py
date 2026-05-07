"""
Database connection management — AWS RDS PostgreSQL + AWS Cognito.
Replaces Supabase entirely.
"""
from typing import Optional
import asyncpg
import redis.asyncio as redis
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

# ── Connection pools ──────────────────────────────────────────────────────────
_pg_pool: Optional[asyncpg.Pool] = None
_redis_client: Optional[redis.Redis] = None

# ── Cognito client (sync boto3 — wrapped in asyncio.to_thread where needed) ───
_cognito_client = None


def get_cognito():
    """Return a boto3 Cognito IDP client (singleton)."""
    global _cognito_client
    if _cognito_client is None:
        kwargs = {"region_name": settings.AWS_REGION}
        # In local dev, explicit keys may be set; on ECS the task role handles it
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        _cognito_client = boto3.client("cognito-idp", **kwargs)
    return _cognito_client


async def get_pg_pool() -> asyncpg.Pool:
    """Return the asyncpg connection pool, creating it on first call."""
    global _pg_pool
    if _pg_pool is None:
        if not settings.DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not configured.")
        _pg_pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=30,
            # pgvector codec registration
            init=_init_connection,
        )
        print("PostgreSQL pool created.")
    return _pg_pool


async def _init_connection(conn: asyncpg.Connection):
    """Register pgvector type codec on each new connection."""
    try:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    except Exception:
        pass  # extension may already exist or require superuser — non-fatal
    # Register vector as a text codec so asyncpg can handle it
    await conn.set_type_codec(
        "vector",
        encoder=lambda v: str(v),
        decoder=lambda v: v,
        schema="pg_catalog",
        format="text",
    )


async def get_redis() -> Optional[redis.Redis]:
    """Return Redis client, or None if Redis is disabled/unavailable."""
    global _redis_client

    if not settings.USE_REDIS:
        return None

    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            await _redis_client.ping()
            print("Redis connected.")
        except Exception as e:
            print(f"Warning: Redis unavailable — {e}. Continuing without cache.")
            _redis_client = None
    return _redis_client


async def init_db():
    """Initialize all connections on app startup."""
    try:
        await get_pg_pool()
    except Exception as e:
        print(f"CRITICAL: PostgreSQL pool init failed — {e}")
        raise
    await get_redis()


async def close_db():
    """Gracefully close all connections on shutdown."""
    global _pg_pool, _redis_client
    if _pg_pool:
        await _pg_pool.close()
        _pg_pool = None
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
