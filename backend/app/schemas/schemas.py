"""Pydantic schemas for API request/response validation."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Enums ──────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    CANDIDATE = "candidate"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INVITED = "invited"
    SCHEDULED = "scheduled"
    INTERVIEWING = "interviewing"
    INTERVIEWED = "interviewed"  # post-interview; assessment available
    OFFERED = "offered"
    REJECTED = "rejected"


class InterviewStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class InterviewRound(str, Enum):
    INTRO = "intro"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    SALARY = "salary"


class HireVerdict(str, Enum):
    STRONG_HIRE = "strong_hire"
    HIRE = "hire"
    NO_HIRE = "no_hire"
    STRONG_NO_HIRE = "strong_no_hire"


# ─── Auth Schemas ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.CANDIDATE
    
    # Role Specific
    company_name: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        populate_by_name = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class SocialLoginRequest(BaseModel):
    access_token: str
    role: UserRole = UserRole.CANDIDATE


class ProfileResponse(BaseModel):
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    resume_url: Optional[str] = None
    experience_years: Optional[float] = 0
    parsed_data: Optional[Dict[str, Any]] = None
    # Onboarding fields
    location: Optional[str] = None
    work_status: Optional[str] = None
    current_company: Optional[str] = None
    job_title: Optional[str] = None
    total_experience_months: Optional[int] = 0
    current_salary: Optional[int] = 0
    notice_period: Optional[str] = None
    industry: Optional[str] = None
    department: Optional[str] = None
    highest_qualification: Optional[str] = None
    university: Optional[str] = None
    specialization: Optional[str] = None
    course_type: Optional[str] = None
    graduation_year: Optional[int] = None
    preferred_locations: List[str] = Field(default_factory=list)
    expected_salary: Optional[int] = 0
    resume_headline: Optional[str] = None
    onboarding_completed: Optional[bool] = False

    @field_validator("skills", "preferred_locations", mode="before")
    @classmethod
    def validate_list_fields(cls, v: Any) -> List[str]:
        if v is None: return []
        return v

    @field_validator("parsed_data", mode="before")
    @classmethod
    def validate_parsed_data(cls, v: Any) -> Optional[Dict[str, Any]]:
        if v is None: return None
        if isinstance(v, dict): return v
        if isinstance(v, str):
            import json
            try: return json.loads(v)
            except Exception: return None
        return None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    headline: Optional[str] = None
    company_name: Optional[str] = None
    company_website: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    resume_url: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    experience_years: Optional[float] = None
    # Onboarding fields
    location: Optional[str] = None
    work_status: Optional[str] = None
    current_company: Optional[str] = None
    job_title: Optional[str] = None
    total_experience_months: Optional[int] = None
    current_salary: Optional[int] = None
    notice_period: Optional[str] = None
    industry: Optional[str] = None
    department: Optional[str] = None
    highest_qualification: Optional[str] = None
    university: Optional[str] = None
    specialization: Optional[str] = None
    course_type: Optional[str] = None
    graduation_year: Optional[int] = None
    preferred_locations: Optional[List[str]] = None
    expected_salary: Optional[int] = None
    resume_headline: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    email_verified: bool = False
    profile: Optional[ProfileResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Job Schemas ─────────────────────────────────────────────────────────────

class JobBase(BaseModel):
    title: str
    description: str
    requirements: List[str] = Field(default_factory=list)
    department: Optional[str] = Field(default="Engineering")
    location: Optional[str] = Field(default="Remote")
    job_type: str = Field(default="full_time", alias="type")
    salary_min: Optional[int] = 0
    salary_max: Optional[int] = 0
    experience_min: Optional[int] = 0
    experience_max: Optional[int] = 0
    salary_range: Optional[str] = None
    is_active: bool = True
    
    @field_validator("requirements", mode="before")
    @classmethod
    def validate_requirements(cls, v: Any) -> List[str]:
        if v is None: return []
        if isinstance(v, str):
            if v.startswith("{") and v.endswith("}"):
                return [s.strip('" ') for s in v[1:-1].split(",")]
            return [v]
        return v

class JobCreate(JobBase):
    pass

class JobResponse(JobBase):
    id: str
    recruiter_id: str
    status: Optional[str] = "active"
    created_at: datetime
    
    applications_count: Optional[int] = 0
    shortlisted_count: Optional[int] = 0
    interviewed_count: Optional[int] = 0

    class Config:
        from_attributes = True


class JDGenerationRequest(BaseModel):
    title: str = Field(..., description="Job title to generate description for")
    department: Optional[str] = Field("Engineering", description="Department name")
    job_type: Optional[str] = Field("full_time", description="full_time, part_time, etc.")
    location: Optional[str] = Field("Remote", description="Location of the job")
    user_input: Optional[str] = Field(None, description="Optional keywords or specific lines to include in JD")


class JDGenerationResponse(BaseModel):
    description: str


# ─── Application Schemas ─────────────────────────────────────────────────────

class ApplicationCreate(BaseModel):
    job_id: str
    candidate_name: str = Field(..., min_length=2)
    candidate_email: EmailStr
    candidate_phone: Optional[str] = None
    resume_url: Optional[str] = None  # Set after S3 upload


class ParsedResumeData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    total_years_experience: float = 0
    summary: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    resume_url: Optional[str] = None
    parsed_data: Optional[ParsedResumeData] = None
    ai_score: Optional[float] = 0
    status: str
    created_at: datetime
    candidate_name: Optional[str] = None
    candidate_phone: Optional[str] = None
    jobs: Optional[Dict[str, Any]] = None
    users: Optional[Dict[str, Any]] = None

    @field_validator("parsed_data", mode="before")
    @classmethod
    def validate_parsed_data(cls, v: Any):
        if v is None: return None
        if isinstance(v, dict): return v
        if isinstance(v, str):
            import json
            try: return json.loads(v)
            except Exception: return None
        return v

    class Config:
        from_attributes = True
        extra = "allow"


class ApplyResponse(BaseModel):
    application_id: str
    ai_score: float = 0
    status: ApplicationStatus
    message: str
    interview_invited: bool


# ─── Schedule Schemas ─────────────────────────────────────────────────────────

class TimeSlot(BaseModel):
    slot_id: str
    start_time: datetime
    end_time: datetime
    available: bool


class BookSlotRequest(BaseModel):
    application_id: str
    slot_id: str


class ScheduleResponse(BaseModel):
    interview_id: str
    scheduled_at: datetime
    unique_link: str
    calendar_invite_sent: bool


# ─── Interview Schemas ────────────────────────────────────────────────────────

class InterviewStateUpdate(BaseModel):
    interview_id: str
    current_round: InterviewRound
    transcript_chunk: str
    speaker: str  # "ai" | "candidate"
    timestamp: datetime


class WebSocketMessage(BaseModel):
    type: str  # "audio_chunk" | "transcript" | "round_change" | "end_interview"
    data: Dict[str, Any]


# ─── Assessment Schemas ───────────────────────────────────────────────────────

class RoundScore(BaseModel):
    round: InterviewRound
    score: float = Field(..., ge=0, le=100)
    duration_seconds: int
    highlights: List[str] = Field(default_factory=list)
    areas_of_concern: List[str] = Field(default_factory=list)


class AssessmentCreate(BaseModel):
    interview_id: str
    transcript: str
    round_scores: List[RoundScore]


class AssessmentResponse(BaseModel):
    id: str
    interview_id: str
    
    # Scores (5-dimension scorecard per BRD §2.6)
    technical_score: Optional[float] = 0
    behavioral_score: Optional[float] = 0
    communication_score: Optional[float] = 0
    cultural_fit_score: Optional[float] = 0
    problem_solving_score: Optional[float] = 0
    overall_score: float
    
    # Salary
    expected_salary: Optional[int] = None
    negotiated_salary: Optional[int] = None
    
    # Verdict
    verdict: Optional[HireVerdict] = None
    verdict_reasoning: Optional[str] = ""
    
    # Detailed breakdown — kept as raw dicts so GPT's schema variance doesn't break validation
    key_strengths: Optional[List[str]] = Field(default_factory=list)
    areas_of_improvement: Optional[List[str]] = Field(default_factory=list)
    round_summaries: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    detailed_report: Optional[Dict[str, Any]] = None

    created_at: Optional[datetime] = None

    # Relationships
    interviews: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
        # Ignore extra fields from DB rows that aren't in this schema
        extra = "ignore"
