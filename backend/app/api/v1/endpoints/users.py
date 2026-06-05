"""
Users API — Profile retrieval, updates, and verification status
Handles the critical /api/users/me endpoint for profile persistence on login
"""
import logging
import jwt
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.database import get_pg_pool
from app.schemas.schemas import UserResponse, ProfileResponse, UserRole

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


# ── Extract Cognito sub from JWT ──────────────────────────────────────────────

def extract_cognito_sub_from_token(token: str) -> str:
    """
    Extract the Cognito 'sub' (subject/user ID) from JWT token.
    The 'sub' is the unique identifier that links Cognito to RDS.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        sub = payload.get("sub")
        if not sub:
            raise ValueError("No 'sub' claim in token")
        return sub
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


# ── GET /api/users/me ─────────────────────────────────────────────────────────
# CRITICAL ENDPOINT FOR LOGIN FLOW
# This is called immediately after Cognito login to check if profile exists

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get current user profile by Cognito sub from JWT token.
    
    This is the critical endpoint for the login flow:
    - Extract Cognito sub from JWT
    - Query RDS for user by cognito_sub
    - Return 200 with full profile if exists
    - Return 404 if user doesn't exist (brand new user)
    - NEVER return 200 with empty data
    
    Frontend uses this to determine:
    - Complete profile → redirect to dashboard
    - 404 → redirect to onboarding
    - Incomplete profile → redirect to onboarding?resume=true
    """
    token = credentials.credentials
    
    # Step 1: Extract Cognito sub from JWT
    try:
        sub = extract_cognito_sub_from_token(token)
        logger.info(f"[GET /me] Extracted Cognito sub: {sub}")
    except HTTPException as e:
        logger.error(f"[GET /me] Failed to extract sub from token: {e.detail}")
        raise
    
    # Step 2: Query RDS for user by cognito_sub
    pool = await get_pg_pool()
    pool_conn = await pool.acquire()
    
    try:
        logger.info(f"[GET /me] Querying RDS for user with cognito_sub={sub}")
        
        user_row = await pool_conn.fetchrow(
            "SELECT id, email, role, created_at FROM users WHERE cognito_sub = $1",
            sub
        )
        
        # Step 3: If user doesn't exist, return 404 (brand new user)
        if not user_row:
            logger.warning(f"[GET /me] User not found for cognito_sub={sub}. Returning 404.")
            raise HTTPException(
                status_code=404,
                detail="User profile not found. Please complete onboarding."
            )
        
        user_id = str(user_row["id"])
        logger.info(f"[GET /me] User found: {user_id}. Fetching profile...")
        
        # Fetch profile
        profile_row = await pool_conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1",
            user_id
        )
        
        # Convert profile to dict
        profile_dict = dict(profile_row) if profile_row else None
        
        # Step 4: Return 200 with full profile
        logger.info(f"[GET /me] Returning user profile. Onboarding completed: {profile_dict.get('onboarding_completed') if profile_dict else False}")
        
        return UserResponse(
            id=user_id,
            email=user_row["email"],
            role=UserRole(user_row["role"]),
            email_verified=True,
            profile=ProfileResponse(**profile_dict) if profile_dict else None,
            created_at=user_row["created_at"],
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /me] Database error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch user profile"
        )
    finally:
        await pool.release(pool_conn)


# ── GET /api/users/{user_id} ──────────────────────────────────────────────────

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get user profile by ID (for admin/recruiter views)."""
    pool = await get_pg_pool()
    pool_conn = await pool.acquire()
    
    try:
        user_row = await pool_conn.fetchrow(
            "SELECT id, email, role, created_at FROM users WHERE id = $1",
            user_id
        )
        
        if not user_row:
            raise HTTPException(status_code=404, detail="User not found")
        
        profile_row = await pool_conn.fetchrow(
            "SELECT * FROM profiles WHERE id = $1",
            user_id
        )
        
        profile_dict = dict(profile_row) if profile_row else None
        
        return UserResponse(
            id=str(user_row["id"]),
            email=user_row["email"],
            role=UserRole(user_row["role"]),
            email_verified=True,
            profile=ProfileResponse(**profile_dict) if profile_dict else None,
            created_at=user_row["created_at"],
        )
    finally:
        await pool.release(pool_conn)
