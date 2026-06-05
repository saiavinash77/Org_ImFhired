"""
Clean Authentication Layer — Register, Login, Logout, Token Refresh
Designed for Recruiters and Candidates
Uses AWS Cognito + RDS PostgreSQL + JWT tokens
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
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.database import get_cognito, get_pg_pool
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, TokenResponse, UserRole, ProfileResponse

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


# ── Cognito Helpers ───────────────────────────────────────────────────────────

def _cognito_secret_hash(username: str) -> str:
    """Compute SECRET_HASH for Cognito client secret."""
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
    """Create JWT access token."""
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ── Auth Dependencies ─────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Verify JWT and return user payload."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> dict | None:
    """Optional auth — return None if no token."""
    if not credentials:
        return None
    try:
        return jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except Exception:
        return None


# ── Helper: Fetch user with profile ───────────────────────────────────────────

async def _fetch_user_with_profile(pool, user_id: str) -> tuple:
    """Fetch user and profile from RDS. Returns (user_row, profile_row)."""
    async with pool.acquire() as conn:
        user_row = await conn.fetchrow(
            "SELECT id, email, role FROM users WHERE id = $1", user_id
        )
        profile_row = await conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1", user_id
        ) if user_row else None
    return user_row, profile_row


def _profile_to_response(profile_row) -> ProfileResponse:
    """Convert profile row to ProfileResponse."""
    if not profile_row:
        return ProfileResponse(full_name="", skills=[])
    
    data = dict(profile_row)
    return ProfileResponse(
        full_name=data.get("full_name", ""),
        phone=data.get("phone"),
        avatar_url=data.get("avatar_url"),
        company_name=data.get("company_name"),
        company_website=data.get("company_website"),
        bio=data.get("bio"),
        headline=data.get("headline"),
        skills=data.get("skills", []),
        resume_url=data.get("resume_url"),
        experience_years=data.get("experience_years", 0),
        parsed_data=data.get("parsed_data"),
    )


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    """
    Register new user: Create in Cognito, persist to RDS.
    Supports both recruiters and candidates.
    """
    cognito = get_cognito()
    pool = await get_pg_pool()

    logger.info(f"Register: {data.email} as {data.role.value}")

    # Check if email already exists in RDS
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id, role FROM users WHERE email = $1", data.email
        )
    
    if existing:
        if existing["role"] == data.role.value:
            raise HTTPException(
                status_code=400,
                detail="Email already registered. Please sign in."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"This email is already registered as a {existing['role']}. Please use a different email."
            )

    # Create Cognito user
    try:
        kwargs = {
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
        await asyncio.to_thread(lambda: cognito.admin_create_user(**kwargs))
        logger.info(f"Cognito user created: {data.email}")
    except ClientError as e:
        code = e.response["Error"]["Code"]
        logger.error(f"Cognito error: {code}")
        
        if code == "InvalidPasswordException":
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 8 characters with uppercase, lowercase, number, and special character."
            )
        raise HTTPException(status_code=400, detail=f"Registration failed: {e.response['Error']['Message']}")

    # Set permanent password
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
        raise HTTPException(status_code=400, detail="Password setup failed")

    # Create user in RDS
    user_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO users (id, email, role, cognito_username) VALUES ($1, $2, $3, $4)",
            user_id, data.email, data.role.value, data.email,
        )
        
        # Create profile
        company_name = data.company_name if data.role == UserRole.RECRUITER else None
        await conn.execute(
            """
            INSERT INTO profiles (id, full_name, phone, company_name)
            VALUES ($1, $2, $3, $4)
            """,
            user_id, data.full_name, data.phone, company_name,
        )

    logger.info(f"User registered: {user_id}")

    # Generate token
    token = create_access_token(user_id, data.role.value)
    profile = ProfileResponse(
        full_name=data.full_name,
        phone=data.phone,
        company_name=company_name,
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            role=data.role,
            profile=profile,
            created_at=datetime.utcnow(),
        ),
    )


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate via Cognito, return JWT."""
    cognito = get_cognito()
    pool = await get_pg_pool()

    logger.info(f"Login: {data.email}")

    auth_params = {
        "USERNAME": data.email,
        "PASSWORD": data.password,
    }
    if settings.COGNITO_CLIENT_SECRET:
        auth_params["SECRET_HASH"] = _cognito_secret_hash(data.email)

    # Authenticate with Cognito
    try:
        await asyncio.to_thread(
            lambda: cognito.admin_initiate_auth(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                ClientId=settings.COGNITO_CLIENT_ID,
                AuthFlow="ADMIN_USER_PASSWORD_AUTH",
                AuthParameters=auth_params,
            )
        )
        logger.info(f"Cognito auth successful: {data.email}")
    except ClientError as e:
        code = e.response["Error"]["Code"]
        logger.warning(f"Cognito auth failed: {code}")
        if code in ("NotAuthorizedException", "UserNotFoundException"):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        raise HTTPException(status_code=401, detail="Login failed")

    # Fetch user from RDS
    user_row, profile_row = await _fetch_user_with_profile(pool, None)
    
    async with pool.acquire() as conn:
        user_row = await conn.fetchrow(
            "SELECT id, email, role FROM users WHERE email = $1", data.email
        )
    
    if not user_row:
        logger.error(f"User not found in RDS: {data.email}")
        raise HTTPException(status_code=404, detail="User profile not found")

    user_id = str(user_row["id"])
    role = user_row["role"]
    
    # Fetch profile
    async with pool.acquire() as conn:
        profile_row = await conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1", user_id
        )

    profile = _profile_to_response(profile_row)
    token = create_access_token(user_id, role)

    logger.info(f"Login successful: {user_id}")
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_row["email"],
            role=role,
            profile=profile,
            created_at=datetime.utcnow(),
        ),
    )


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout — client discards JWT."""
    logger.info(f"Logout: {current_user.get('sub')}")
    return {"message": "Logged out successfully"}


# ── Refresh Token ─────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Issue fresh JWT for authenticated user."""
    pool = await get_pg_pool()
    user_id = current_user["sub"]
    role = current_user.get("role", "candidate")

    logger.info(f"Token refresh: {user_id}")

    user_row, profile_row = await _fetch_user_with_profile(pool, user_id)

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    profile = _profile_to_response(profile_row)
    new_token = create_access_token(user_id, role)

    return TokenResponse(
        access_token=new_token,
        user=UserResponse(
            id=user_id,
            email=user_row["email"],
            role=role,
            profile=profile,
            created_at=datetime.utcnow(),
        ),
    )


# ── Get Current User ──────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Return current user + profile."""
    pool = await get_pg_pool()
    user_id = current_user["sub"]

    logger.info(f"Get me: {user_id}")

    user_row, profile_row = await _fetch_user_with_profile(pool, user_id)

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    profile = _profile_to_response(profile_row)
    return UserResponse(
        id=user_id,
        email=user_row["email"],
        role=user_row["role"],
        profile=profile,
        created_at=datetime.utcnow(),
    )


# ── Forgot Password ───────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Trigger Cognito forgot-password flow."""
    cognito = get_cognito()
    logger.info(f"Forgot password: {data.email}")
    
    try:
        kwargs = {
            "ClientId": settings.COGNITO_CLIENT_ID,
            "Username": data.email,
        }
        if settings.COGNITO_CLIENT_SECRET:
            kwargs["SecretHash"] = _cognito_secret_hash(data.email)
        
        await asyncio.to_thread(lambda: cognito.forgot_password(**kwargs))
    except Exception as e:
        logger.warning(f"Forgot password error: {e}")
        pass  # Don't reveal if email exists
    
    return {"message": "If an account exists, a reset code has been sent to your email"}


# ── Confirm Password Reset ────────────────────────────────────────────────────

class ConfirmPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


@router.post("/confirm-password")
async def confirm_password(data: ConfirmPasswordRequest):
    """Confirm password reset with emailed code."""
    cognito = get_cognito()
    logger.info(f"Confirm password: {data.email}")
    
    try:
        kwargs = {
            "ClientId": settings.COGNITO_CLIENT_ID,
            "Username": data.email,
            "ConfirmationCode": data.code,
            "Password": data.new_password,
        }
        if settings.COGNITO_CLIENT_SECRET:
            kwargs["SecretHash"] = _cognito_secret_hash(data.email)
        
        await asyncio.to_thread(lambda: cognito.confirm_forgot_password(**kwargs))
        logger.info(f"Password reset successful: {data.email}")
    except ClientError as e:
        logger.error(f"Password reset failed: {e.response['Error']['Message']}")
        raise HTTPException(status_code=400, detail=e.response["Error"]["Message"])
    
    return {"message": "Password reset successfully"}
