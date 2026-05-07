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
        # Parse the DSN but pass password separately to avoid URL-encoding issues
        from urllib.parse import urlparse, unquote
        parsed = urlparse(settings.DATABASE_URL)
        _pg_pool = await asyncpg.create_pool(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=unquote(parsed.password) if parsed.password else None,
            database=parsed.path.lstrip("/") or "postgres",
            min_size=2,
            max_size=10,
            command_timeout=30,
            init=_init_connection,
        )
        print("PostgreSQL pool created.")
    return _pg_pool


async def _init_connection(conn: asyncpg.Connection):
    """Register type codecs on each new connection."""
    # Register UUID as text so dict(record) returns strings, not UUID objects
    await conn.set_type_codec(
        "uuid",
        encoder=str,
        decoder=str,
        schema="pg_catalog",
        format="text",
    )
    # Register vector as text (pgvector)
    try:
        await conn.set_type_codec(
            "vector",
            encoder=lambda v: str(v),
            decoder=lambda v: v,
            schema="pg_catalog",
            format="text",
        )
    except Exception:
        pass  # pgvector not installed — skip


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
        print(f"WARNING: PostgreSQL pool init failed — {e}")
        print("Continuing without database — will fail on first DB operation")
        # Don't raise — allow app to start for development/debugging
    
    try:
        await get_redis()
    except Exception as e:
        print(f"WARNING: Redis init failed — {e}")


async def close_db():
    """Gracefully close all connections on shutdown."""
    global _pg_pool, _redis_client
    if _pg_pool:
        await _pg_pool.close()
        _pg_pool = None
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


def row_to_dict(record) -> dict:
    """Convert asyncpg Record → plain dict, stringifying UUID fields."""
    if record is None:
        return {}
    result = {}
    for k, v in dict(record).items():
        if hasattr(v, "hex"):          # UUID
            result[k] = str(v)
        elif isinstance(v, list):      # arrays (e.g. skills, requirements)
            result[k] = [str(i) if hasattr(i, "hex") else i for i in v]
        else:
            result[k] = v
    return result
