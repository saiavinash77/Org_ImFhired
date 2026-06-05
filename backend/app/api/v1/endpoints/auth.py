"""
Authentication endpoints — Register, Login, Logout, Token Refresh.
Uses AWS Cognito for user management + custom JWT for API access.
"""
import asyncio
import hmac
import hashlib
import base64
import uuid
import logging
from datetime import datetime, timedelta

import jwt
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from botocore.exceptions import ClientError
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_cognito, get_pg_pool
from app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, TokenResponse, UserRole,
)

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _cognito_secret_hash(username: str) -> str:
    """Compute the SECRET_HASH required by Cognito when a client secret is set."""
    if not settings.COGNITO_CLIENT_SECRET:
        return ""
    msg = username + settings.COGNITO_CLIENT_ID
    dig = hmac.new(
        settings.COGNITO_CLIENT_SECRET.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return base64.b64encode(dig).decode()


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> dict | None:
    if not credentials:
        return None
    try:
        return jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except Exception as e:
        logger.debug(f"Optional auth failed: {e}")
        return None


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    """Register a new user via Cognito, then persist profile to RDS."""
    cognito = get_cognito()
    pool = await get_pg_pool()

    logger.info(f"Registration attempt for {data.email}")

    # 1. Create Cognito user
    try:
        kwargs: dict = {
            "UserPoolId": settings.COGNITO_USER_POOL_ID,
            "Username": data.email,
            "TemporaryPassword": data.password,
            "MessageAction": "SUPPRESS",
            "UserAttributes": [
                {"Name": "email", "Value": data.email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": data.full_name},
            ],
        }
        cognito_resp = await asyncio.to_thread(
            lambda: cognito.admin_create_user(**kwargs)
        )
        cognito_user_id = cognito_resp["User"]["Username"]
        logger.info(f"Cognito user created: {cognito_user_id}")
    except ClientError as e:
        code = e.response["Error"]["Code"]
        logger.error(f"Cognito error: {code} - {e.response['Error']['Message']}")
        
        if code == "UsernameExistsException":
            # Email exists in Cognito — check RDS
            async with pool.acquire() as conn:
                existing = await conn.fetchrow(
                    "SELECT id, role FROM users WHERE email = $1", data.email
                )
            if existing:
                if existing["role"] == data.role.value:
                    raise HTTPException(status_code=400, detail="Email already registered. Please sign in.")
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"This email is already registered as a {existing['role']}. Please use a different email."
                    )
            # Cognito has user but RDS doesn't — allow re-registration by resetting password
            try:
                await asyncio.to_thread(
                    lambda: cognito.admin_set_user_password(
                        UserPoolId=settings.COGNITO_USER_POOL_ID,
                        Username=data.email,
                        Password=data.password,
                        Permanent=True,
                    )
                )
            except Exception as e:
                logger.warning(f"Could not reset password: {e}")
                pass
            # Fall through to RDS insert below
            user_id = str(uuid.uuid4())
            async with pool.acquire() as conn:
                await conn.execute(
                    "INSERT INTO users (id, email, role, cognito_username) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
                    user_id, data.email, data.role.value, data.email,
                )
                await conn.execute(
                    """
                    INSERT INTO profiles (id, full_name, phone, company_name)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
                    """,
                    user_id, data.full_name, data.phone,
                    data.company_name if data.role == UserRole.RECRUITER else None,
                )
            token = create_access_token(user_id, data.role.value)
            profile_data = {"id": user_id, "full_name": data.full_name, "phone": data.phone}
            return TokenResponse(
                access_token=token,
                user=UserResponse(id=user_id, email=data.email, role=data.role, profile=profile_data, created_at=datetime.utcnow()),
            )
        if code == "InvalidPasswordException":
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters and contain a number.")
        raise HTTPException(status_code=400, detail=f"Registration failed: {e.response['Error']['Message']}")

    # Set permanent password (skip FORCE_CHANGE_PASSWORD state)
    try:
        await asyncio.to_thread(
            lambda: cognito.admin_set_user_password(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=data.email,
                Password=data.password,
                Permanent=True,
            )
        )
        logger.info(f"Password set for {data.email}")
    except ClientError as e:
        logger.error(f"Password setup failed: {e.response['Error']['Message']}")
        raise HTTPException(status_code=400, detail=f"Password setup failed: {e.response['Error']['Message']}")

    # 2. Persist to RDS
    user_id = str(uuid.uuid4())  # generate new ID upfront
    import secrets
    verification_token = secrets.token_urlsafe(32)

    async with pool.acquire() as conn:
        existing_user = await conn.fetchrow("SELECT id, role FROM users WHERE email = $1", data.email)
        if existing_user:
            if existing_user["role"] != data.role.value:
                raise HTTPException(
                    status_code=400,
                    detail=f"This email is already registered as a {existing_user['role']}. Please use a different email."
                )
            user_id = str(existing_user["id"])  # reuse existing ID
        else:
            await conn.execute(
                "INSERT INTO users (id, email, role, cognito_username, email_verification_token) VALUES ($1, $2, $3, $4, $5)",
                user_id, data.email, data.role.value, data.email, verification_token
            )

        # Upsert profile
        await conn.execute(
            """
            INSERT INTO profiles (id, full_name, phone, company_name)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone,
                company_name = EXCLUDED.company_name
            """,
            user_id, data.full_name, data.phone,
            data.company_name if data.role == UserRole.RECRUITER else None,
        )

    token = create_access_token(user_id, data.role.value)
    profile_data = {
        "id": user_id,
        "full_name": data.full_name,
        "phone": data.phone,
        "company_name": data.company_name if data.role == UserRole.RECRUITER else None,
    }

    # Send verification email
    try:
        from app.services.email_service import send_verification_email
        asyncio.create_task(send_verification_email(data.email, data.full_name, verification_token))
    except Exception as e:
        logger.warning(f"Verification email failed: {e}")
        pass
    
    logger.info(f"User registered successfully: {user_id}")
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            role=data.role,
            email_verified=False,
            profile=profile_data,
            created_at=datetime.utcnow(),
        ),
    )


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate via Cognito, return custom JWT."""
    cognito = get_cognito()
    pool = await get_pg_pool()

    logger.info(f"Login attempt for {data.email}")

    auth_params: dict = {
        "USERNAME": data.email,
        "PASSWORD": data.password,
    }
    if settings.COGNITO_CLIENT_SECRET:
        auth_params["SECRET_HASH"] = _cognito_secret_hash(data.email)

    try:
        resp = await asyncio.to_thread(
            lambda: cognito.admin_initiate_auth(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                ClientId=settings.COGNITO_CLIENT_ID,
                AuthFlow="ADMIN_USER_PASSWORD_AUTH",
                AuthParameters=auth_params,
            )
        )
        logger.info(f"Cognito auth successful for {data.email}")
    except ClientError as e:
        code = e.response["Error"]["Code"]
        logger.warning(f"Cognito auth failed: {code}")
        if code in ("NotAuthorizedException", "UserNotFoundException"):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        raise HTTPException(status_code=401, detail=f"Login failed: {e.response['Error']['Message']}")

    # Fetch user + profile from RDS
    async with pool.acquire() as conn:
        user_row = await conn.fetchrow(
            "SELECT id, email, role, email_verified FROM users WHERE email = $1", data.email
        )
        if not user_row:
            logger.error(f"User not found in RDS: {data.email}")
            raise HTTPException(status_code=404, detail="User profile not found. Please re-register.")

        profile_row = await conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1", user_row["id"]
        )

    user_id = str(user_row["id"])
    role = user_row["role"]
    profile = dict(profile_row) if profile_row else {"id": user_id, "full_name": "", "skills": []}

    token = create_access_token(user_id, role)
    logger.info(f"Login successful for {user_id}")
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_row["email"],
            role=role,
            email_verified=user_row["email_verified"],
            profile=profile,
            created_at=datetime.utcnow(),
        ),
    )


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout — client should discard the JWT. Optionally revoke Cognito tokens."""
    logger.info(f"Logout for {current_user.get('sub')}")
    return {"message": "Logged out successfully."}


# ── Forgot password ───────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Trigger Cognito forgot-password flow (sends reset code via email)."""
    cognito = get_cognito()
    logger.info(f"Forgot password request for {data.email}")
    try:
        kwargs: dict = {
            "ClientId": settings.COGNITO_CLIENT_ID,
            "Username": data.email,
        }
        if settings.COGNITO_CLIENT_SECRET:
            kwargs["SecretHash"] = _cognito_secret_hash(data.email)
        await asyncio.to_thread(lambda: cognito.forgot_password(**kwargs))
    except Exception as e:
        logger.warning(f"Forgot password error: {e}")
        pass  # Never reveal whether the email exists
    return {"message": "If an account exists with that email, a reset code has been sent."}


# ── Confirm forgot password ───────────────────────────────────────────────

class ConfirmPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


@router.post("/confirm-password")
async def confirm_password(data: ConfirmPasswordRequest):
    """Confirm the Cognito password reset with the emailed code."""
    cognito = get_cognito()
    logger.info(f"Confirm password for {data.email}")
    try:
        kwargs: dict = {
            "ClientId": settings.COGNITO_CLIENT_ID,
            "Username": data.email,
            "ConfirmationCode": data.code,
            "Password": data.new_password,
        }
        if settings.COGNITO_CLIENT_SECRET:
            kwargs["SecretHash"] = _cognito_secret_hash(data.email)
        await asyncio.to_thread(lambda: cognito.confirm_forgot_password(**kwargs))
        logger.info(f"Password reset successful for {data.email}")
    except ClientError as e:
        logger.error(f"Password reset failed: {e.response['Error']['Message']}")
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])
    return {"message": "Password reset successfully."}


# ── Refresh token ─────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Issue a fresh JWT for an authenticated user."""
    pool = await get_pg_pool()
    user_id = current_user["sub"]
    role = current_user.get("role", "candidate")

    logger.info(f"Token refresh for {user_id}")

    async with pool.acquire() as conn:
        user_row = await conn.fetchrow("SELECT email FROM users WHERE id = $1", user_id)
        profile_row = await conn.fetchrow("SELECT * FROM profiles WHERE id = $1", user_id)

    email = user_row["email"] if user_row else ""
    profile = dict(profile_row) if profile_row else {"id": user_id, "full_name": "", "skills": []}

    new_token = create_access_token(user_id, role)
    return TokenResponse(
        access_token=new_token,
        user=UserResponse(
            id=user_id,
            email=email,
            role=role,
            email_verified=user_row["email_verified"] if user_row and "email_verified" in user_row else False,
            profile=profile,
            created_at=datetime.utcnow(),
        ),
    )


# ── Get current user ──────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return full user + profile for session restoration."""
    pool = await get_pg_pool()
    user_id = current_user["sub"]

    logger.info(f"Get current user: {user_id}")

    async with pool.acquire() as conn:
        user_row = await conn.fetchrow(
            "SELECT id, email, role, email_verified FROM users WHERE id = $1", user_id
        )
        profile_row = await conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1", user_id
        )

    if not user_row:
        logger.error(f"User not found: {user_id}")
        raise HTTPException(status_code=404, detail="User not found.")

    profile = dict(profile_row) if profile_row else {"id": user_id, "full_name": "", "skills": []}
    return UserResponse(
        id=str(user_row["id"]),
        email=user_row["email"],
        role=user_row["role"],
        email_verified=user_row["email_verified"],
        profile=profile,
        created_at=datetime.utcnow(),
    )


# ── Team management ───────────────────────────────────────────────────────

@router.get("/team")
async def get_team_members(current_user: dict = Depends(get_current_user)):
    """Fetch all recruiters for the team view."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT u.id, u.email, p.full_name, p.avatar_url, p.headline
            FROM users u
            LEFT JOIN profiles p ON p.id = u.id
            WHERE u.role = 'recruiter'
            """
        )
    team = []
    for r in rows:
        name = r["full_name"] or r["email"].split("@")[0].title()
        parts = name.split()
        initials = (parts[0][0] + (parts[1][0] if len(parts) > 1 else "")).upper()
        team.append({
            "id": str(r["id"]),
            "email": r["email"],
            "name": name,
            "role": r["headline"] or "Recruiter",
            "avatar_url": r["avatar_url"] or "",
            "initials": initials,
            "online": True,
        })
    return team


class InviteRequest(BaseModel):
    name: str
    email: str


@router.post("/invite")
async def invite_team_member(
    data: InviteRequest,
    current_user: dict = Depends(get_current_user),
):
    """Invite a new recruiter to the team."""
    if current_user.get("role") not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized.")

    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", data.email)
        if existing:
            raise HTTPException(status_code=400, detail="User already exists.")

        new_id = str(uuid.uuid4())
        await conn.execute(
            "INSERT INTO users (id, email, role) VALUES ($1, $2, 'recruiter')",
            new_id, data.email,
        )
        await conn.execute(
            "INSERT INTO profiles (id, full_name, headline) VALUES ($1, $2, 'Recruiter')",
            new_id, data.name,
        )
    logger.info(f"Team member invited: {data.email}")
    return {"message": "Invite sent successfully."}




# ── Email Verification ────────────────────────────────────────────────────────

@router.get("/verify-email")
async def verify_email(token: str):
    """Confirm the email verification token and update the user's status."""
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id FROM users WHERE email_verification_token = $1", token
        )
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired verification token.")

        await conn.execute(
            "UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = $1",
            user["id"]
        )
        
        # Also update profile verification status
        await conn.execute(
            "UPDATE profiles SET verification_status = 'verified' WHERE id = $1",
            user["id"]
        )

    return {"message": "Email verified successfully! You can now access all features."}
