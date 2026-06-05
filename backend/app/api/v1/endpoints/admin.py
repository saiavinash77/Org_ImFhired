from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, Dict
import psutil
import platform
import os
from datetime import datetime

from app.core.database import get_pg_pool
from app.schemas.schemas import UserResponse
from app.api.v1.endpoints.auth_clean import get_current_user

router = APIRouter()

def get_system_stats() -> Dict[str, Any]:
    """Gather CPU, memory, and OS information."""
    return {
        "os": platform.system(),
        "os_release": platform.release(),
        "cpu_usage_percent": psutil.cpu_percent(interval=0.1),
        "cpu_cores": psutil.cpu_count(logical=True),
        "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "memory_used_gb": round(psutil.virtual_memory().used / (1024**3), 2),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
        "disk_used_gb": round(psutil.disk_usage('/').used / (1024**3), 2),
        "disk_percent": psutil.disk_usage('/').percent,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/system-health", response_model=Dict[str, Any])
async def get_system_health(current_user: UserResponse = Depends(get_current_user)) -> Any:
    """
    Get system health and basic platform metrics.
    Restricted to admin users (for now, we'll allow any logged-in user if role isn't strictly enforced yet,
    but in production, ensure current_user.role == 'admin').
    """
    # Uncomment to restrict to admins only
    # if current_user.role != 'admin':
    #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
        
    pool = await get_pg_pool()
    metrics = {}
    
    try:
        async with pool.acquire() as conn:
            # Platform metrics
            users_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            candidates_count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role = 'candidate'")
            recruiters_count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role = 'recruiter'")
            interviews_count = await conn.fetchval("SELECT COUNT(*) FROM interviews")
            applications_count = await conn.fetchval("SELECT COUNT(*) FROM applications")
            jobs_count = await conn.fetchval("SELECT COUNT(*) FROM jobs")
            
            metrics = {
                "total_users": users_count,
                "candidates": candidates_count,
                "recruiters": recruiters_count,
                "total_interviews": interviews_count,
                "total_applications": applications_count,
                "active_jobs": jobs_count,
            }
    except Exception as e:
        metrics = {"error": str(e)}

    sys_stats = get_system_stats()
    
    return {
        "status": "healthy",
        "system": sys_stats,
        "platform": metrics
    }
