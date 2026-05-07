"""
Profiles API — Candidate Talent Pool, Resume Management, and Insights.
"""
import uuid
import os
import tempfile
import boto3
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, BackgroundTasks
from typing import Optional, Any

from app.core.database import get_supabase
from app.core.config import settings
from app.schemas.schemas import ProfileResponse, ProfileUpdate
from app.api.v1.endpoints.auth import get_current_user
from app.services.resume_parser import resume_parser
from app.services.s3_utils import generate_presigned_url_if_s3

router = APIRouter()


def ensure_user_profile_rows(supabase, current_user: dict) -> dict:
    """Ensure public.users/public.profiles rows exist for a valid JWT user."""
    user_id = current_user["sub"]
    role = current_user.get("role", "candidate")
    fallback_email = current_user.get("email") or f"user_{user_id[:8]}@restored.local"

    supabase.table("users").upsert({
        "id": user_id,
        "email": fallback_email,
        "role": role,
    }).execute()

    profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
    if profile_res.data:
        return profile_res.data[0]

    created = supabase.table("profiles").upsert({
        "id": user_id,
        "full_name": "Restored User",
        "skills": [],
    }).execute()
    return created.data[0] if created.data else {
        "id": user_id,
        "full_name": "Restored User",
        "skills": [],
    }


async def upload_profile_resume_to_s3(file: UploadFile, user_id: str) -> str:
    """Upload resume file to AWS S3 under the user's profile and return public URL."""
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        
        extension = file.filename.split(".")[-1].lower()
        key = f"profiles/{user_id}/{uuid.uuid4()}.{extension}"
        
        content = await file.read()
        s3.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=file.content_type,
            ServerSideEncryption="AES256",
        )
        
        return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    except Exception as e:
        print(f"DEBUG: S3 Upload failed (Profile): {e}")
        # Fallback local dummy URL if AWS is not configured properly
        return f"/api/v1/profiles/dummy-resume/{user_id}/{file.filename}"


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get the currently logged-in user's profile, including parsed AI insights."""
    supabase = get_supabase()
    profile_data = ensure_user_profile_rows(supabase, current_user)
    profile_data["resume_url"] = generate_presigned_url_if_s3(profile_data.get("resume_url"))
    return profile_data


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Manually update text fields on the candidate profile."""
    supabase = get_supabase()
    
    update_dict = data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    ensure_user_profile_rows(supabase, current_user)
    result = supabase.table("profiles").update(update_dict).eq("id", current_user["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Failed to update profile.")
        
    return result.data[0]

async def upload_profile_avatar_to_s3(file: UploadFile, user_id: str) -> str:
    """Upload avatar to S3 or return fallback."""
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        extension = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
        key = f"avatars/{user_id}/{uuid.uuid4()}.{extension}"
        content = await file.read()
        await file.seek(0)
        s3.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=file.content_type,
            ServerSideEncryption="AES256",
        )
        return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
    except Exception as e:
        print(f"DEBUG: S3 Upload failed (Avatar): {e}")
        return f"/avatars/{user_id}_{file.filename}"

@router.post("/me/avatar", response_model=ProfileResponse)
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload user avatar photo."""
    user_id = current_user["sub"]
    supabase = get_supabase()
    
    avatar_url = await upload_profile_avatar_to_s3(avatar, user_id)
    
    result = supabase.table("profiles").update({"avatar_url": avatar_url}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save avatar Updates.")
        
    return result.data[0]
async def update_my_profile(
    data: ProfileUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Manually update text fields on the candidate profile."""
    supabase = get_supabase()
    
    update_dict = data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided to update.")
        
    result = supabase.table("profiles").update(update_dict).eq("id", current_user["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Failed to update profile.")
        
    return result.data[0]


@router.post("/me/resume", response_model=ProfileResponse)
async def upload_and_parse_resume(
    resume: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a resume to the candidate's core profile (Talent Pool).
    Extracts text and runs AI parsing to generate 'Insights' (skills, experience).
    """
    user_id = current_user["sub"]
    supabase = get_supabase()
    
    # 1. Validate file type
    allowed_types = {
        "application/pdf", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/octet-stream"
    }
    if resume.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {resume.content_type}. Only PDF and DOCX are accepted."
        )
        
    content = await resume.read()
    await resume.seek(0)
    
    # 2. Upload to S3
    resume_url = await upload_profile_resume_to_s3(resume, user_id)
    
    # 3. Extract text
    resume_text_str = ""
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(resume.filename or ".txt")[1]
        ) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            resume_text_str = await resume_parser.extract_text_from_file(tmp_path)
            print(f"DEBUG: Profile Extraction - {len(resume_text_str)} chars from {resume.filename}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        print(f"DEBUG: Text extraction failed: {e}")
        try:
            resume_text_str = content.decode("utf-8")
        except Exception:
            resume_text_str = ""

    # 4. AI Parse Resume into Structured Insights
    parsed_data = None
    skills_list = []
    exp_years = 0
    
    if len(resume_text_str) > 50:
        try:
            parsed_result = await resume_parser.parse_resume(resume_text_str)
            if parsed_result:
                parsed_data = parsed_result.model_dump()
                skills_list = parsed_result.skills or []
                exp_years = parsed_result.total_years_experience or 0
        except Exception as e:
            print(f"ERROR: AI Parsing failed for profile {user_id}: {e}")
            
    # 5. Save to database
    ensure_user_profile_rows(supabase, current_user)
    update_data: dict[str, Any] = {
        "resume_url": resume_url,
    }
    if parsed_data:
        update_data["parsed_data"] = parsed_data
        update_data["skills"] = skills_list
        update_data["experience_years"] = exp_years
        
    result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save profile updates.")
    
    profile_data = result.data[0]
    profile_data["resume_url"] = generate_presigned_url_if_s3(profile_data.get("resume_url"))
    return profile_data


@router.delete("/me/resume", response_model=ProfileResponse)
async def delete_my_resume(current_user: dict = Depends(get_current_user)):
    """
    Remove the global resume and associated AI insights from the profile.
    """
    user_id = current_user["sub"]
    supabase = get_supabase()
    
    # 1. Clear fields in database
    update_data = {
        "resume_url": None,
        "parsed_data": None,
        "skills": [],
        "experience_years": 0
    }
    
    result = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found.")
        
    return result.data[0]


@router.get("/talent-pool", response_model=list[ProfileResponse])
async def view_talent_pool(current_user: dict = Depends(get_current_user)):
    """
    For Recruiters: View passive candidates who have parsed resumes.
    """
    if current_user["role"] not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Access denied. Only recruiters can view the talent pool.")
        
    supabase = get_supabase()
    
    # Fetch profiles that have parsed_data (meaning they uploaded a resume)
    # Join with users to only get 'candidates'
    users_res = supabase.table("users").select("id").eq("role", "candidate").execute()
    candidate_ids = [u["id"] for u in users_res.data]
    
    if not candidate_ids:
        return []
        
    profiles_res = supabase.table("profiles").select("*").in_("id", candidate_ids).not_.is_("parsed_data", "null").order("experience_years", desc=True).execute()
    
    profiles = profiles_res.data
    for p in profiles:
        p["resume_url"] = generate_presigned_url_if_s3(p.get("resume_url"))
    return profiles
