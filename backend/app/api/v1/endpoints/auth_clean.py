"""
Clean Authentication Layer — Register, Login, Logout, Token Refresh
Uses AWS Cognito + RDS PostgreSQL + JWT tokens
Minimal, focused implementation
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
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, TokenResponse, UserRole

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


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    """Register new user: Cognito + RDS."""
    cognito = get_cognito()
    pool = await get_pg_pool()

    logger.info(f"Register: {data.email}")

    # 1. Create Cognito user
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
        cognito_response = await asyncio.to_thread(lambda: cognito.admin_create_user(**kwargs))
        # Extract the actual Cognito sub (UUID) from the response
        cognito_sub = cognito_response.get("User", {}).get("Username", data.email)
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "UsernameExistsException":
            raise HTTPException(status_code=400, detail="Email already registered")
        if code == "InvalidPasswordException":
            raise HTTPException(status_code=400, detail="Password too weak")
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Set permanent password
    try:
        await asyncio.to_thread(
            lambda: cognito.admin_set_user_password(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                Username=data.email,
                Password=data.password,
                Permanent=True,
            )
        )
    except ClientError as e:
        raise HTTPException(status_code=400, detail="Password setup failed")

    # 3. Create user in RDS
    user_id = str(uuid.uuid4())
    pool_conn = await pool.acquire()
    try:
        await pool_conn.execute(
            "INSERT INTO users (id, email, role, cognito_username, cognito_sub) VALUES ($1, $2, $3, $4, $5)",
            user_id, data.email, data.role.value, data.email, cognito_sub,
        )
        await pool_conn.execute(
            "INSERT INTO profiles (id, full_name, phone, company_name) VALUES ($1, $2, $3, $4)",
            user_id, data.full_name, data.phone or "",
            data.company_name if data.role == UserRole.RECRUITER else None,
        )
    finally:
        await pool.release(pool_conn)

    token = create_access_token(user_id, data.role.value)
    logger.info(f"User registered: {user_id}")

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            role=data.role,
            profile={"id": user_id, "full_name": data.full_name},
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

    try:
        auth_response = await asyncio.to_thread(
            lambda: cognito.admin_initiate_auth(
                UserPoolId=settings.COGNITO_USER_POOL_ID,
                ClientId=settings.COGNITO_CLIENT_ID,
                AuthFlow="ADMIN_USER_PASSWORD_AUTH",
                AuthParameters=auth_params,
            )
        )
        # Extract the actual Cognito sub from the auth response
        # The sub is in the ID token claims
        id_token = auth_response.get("AuthenticationResult", {}).get("IdToken", "")
        if id_token:
            try:
                id_token_payload = jwt.decode(id_token, options={"verify_signature": False})
                cognito_sub = id_token_payload.get("sub", data.email)
            except:
                cognito_sub = data.email
        else:
            cognito_sub = data.email
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code in ("NotAuthorizedException", "UserNotFoundException"):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        raise HTTPException(status_code=401, detail="Login failed")

    # Fetch user from RDS
    pool_conn = await pool.acquire()
    try:
        user_row = await pool_conn.fetchrow(
            "SELECT id, email, role FROM users WHERE email = $1", data.email
        )
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")

        # Update cognito_sub if not already set (for existing users)
        await pool_conn.execute(
            "UPDATE users SET cognito_sub = $1 WHERE id = $2 AND cognito_sub IS NULL",
            cognito_sub, user_row["id"]
        )

        profile_row = await pool_conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1", user_row["id"]
        )
    finally:
        await pool.release(pool_conn)

    user_id = str(user_row["id"])
    role = user_row["role"]
    profile = dict(profile_row) if profile_row else {"id": user_id}

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
    return {"message": "Logged out"}


# ── Refresh Token ─────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Issue fresh JWT."""
    pool = await get_pg_pool()
    user_id = current_user["sub"]
    role = current_user.get("role", "candidate")

    pool_conn = await pool.acquire()
    try:
        user_row = await pool_conn.fetchrow(
            "SELECT email FROM users WHERE id = $1", user_id
        )
        profile_row = await pool_conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1", user_id
        )
    finally:
        await pool.release(pool_conn)

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    profile = dict(profile_row) if profile_row else {"id": user_id}
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

    pool_conn = await pool.acquire()
    try:
        user_row = await pool_conn.fetchrow(
            "SELECT id, email, role FROM users WHERE id = $1", user_id
        )
        profile_row = await pool_conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1", user_id
        )
    finally:
        await pool.release(pool_conn)

    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    profile = dict(profile_row) if profile_row else {"id": user_id}

    return UserResponse(
        id=str(user_row["id"]),
        email=user_row["email"],
        role=user_row["role"],
        profile=profile,
        created_at=datetime.utcnow(),
    )


# ── Forgot Password ───────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


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
        pass

    return {"message": "If account exists, reset code sent to email"}


# ── Confirm Password Reset ────────────────────────────────────────────────────

class ConfirmPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


@router.post("/confirm-password")
async def confirm_password(data: ConfirmPasswordRequest):
    """Confirm password reset with code."""
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
    except ClientError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Password reset successful"}
