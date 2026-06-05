'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { profilesApi } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import toast from 'react-hot-toast'
import {
  User, Briefcase, GraduationCap, MapPin, FileText,
  ChevronRight, ChevronLeft, Loader2, CheckCircle, Plus, X
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Work Status' },
  { id: 3, label: 'Employment' },
  { id: 4, label: 'Skills' },
  { id: 5, label: 'Resume' },
  { id: 6, label: 'Education' },
  { id: 7, label: 'Preferences' },
  { id: 8, label: 'Headline' },
]

const NOTICE_OPTIONS = ['Immediate', '15 days', '1 month', '2 months', '3 months', '6 months']
const QUALIFICATIONS = ['10th', '12th', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Other']
const INDUSTRIES = ['IT & Software', 'Finance & Banking', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Media', 'Government', 'Other']

const WORK_STATUS_OPTIONS = [
  {
    value: 'laid_off',
    label: 'I was laid off',
    desc: 'I recently lost my job and am actively looking for new opportunities',
  },
  {
    value: 'want_to_switch',
    label: 'I want to switch jobs',
    desc: 'I am currently employed but looking for better opportunities',
  },
  {
    value: 'other',
    label: 'Other / Exploring',
    desc: 'I am open to opportunities and exploring what\'s out there',
  },
]

function OnboardingContent() {
  const router = useRouter()
  const { token, user, updateUser, isLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeUrl, setResumeUrl] = useState('')
  const [hasResumed, setHasResumed] = useState(false)

  // Check if already onboarded - only redirect after auth is loaded
  useEffect(() => {
    if (isLoading) return // Wait for auth to load
    
    if (user && user.profile && typeof user.profile === 'object' && 'onboarding_completed' in user.profile) {
      if (user.profile.onboarding_completed === true) {
        router.push('/candidate/dashboard')
      }
    }
  }, [user, router, isLoading])

  // Hydrate form and resume onboarding if ?resume=true
  useEffect(() => {
    if (isLoading || !user || !user.profile) return

    console.log("[Onboarding] Hydrating form fields from existing profile data...")
    const p = user.profile as any
    setForm(f => ({
      ...f,
      full_name: p.full_name || f.full_name || '',
      phone: p.phone || f.phone || '',
      location: p.location || f.location || '',
      work_status: p.work_status || f.work_status || 'laid_off',
      current_company: p.current_company || f.current_company || '',
      job_title: p.job_title || f.job_title || '',
      experience_years: p.experience_years !== undefined && p.experience_years !== null ? p.experience_years : f.experience_years,
      current_salary: p.current_salary !== undefined && p.current_salary !== null ? p.current_salary : f.current_salary,
      notice_period: p.notice_period || f.notice_period || '1 month',
      skills: p.skills && p.skills.length > 0 ? p.skills : f.skills,
      industry: p.industry || f.industry || '',
      department: p.department || f.department || '',
      highest_qualification: p.highest_qualification || f.highest_qualification || "Bachelor's",
      university: p.university || f.university || '',
      specialization: p.specialization || f.specialization || '',
      graduation_year: p.graduation_year || f.graduation_year || new Date().getFullYear(),
      preferred_locations: p.preferred_locations && p.preferred_locations.length > 0 ? p.preferred_locations : f.preferred_locations,
      expected_salary: p.expected_salary !== undefined && p.expected_salary !== null ? p.expected_salary : f.expected_salary,
      resume_headline: p.resume_headline || p.headline || f.resume_headline || '',
    }))

    if (p.resume_url) {
      setResumeUrl(p.resume_url)
    }

    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('resume') === 'true' && !hasResumed) {
      console.log("[Onboarding] Resume param detected. Scanning for first incomplete step...")
      
      const hasBasicInfo = p.full_name?.trim() && p.phone?.trim() && p.location?.trim()
      const hasEmployment = p.current_company?.trim() && p.job_title?.trim()
      const hasSkills = p.skills && p.skills.length > 0
      const hasResume = p.resume_url?.trim()
      const hasEducation = p.university?.trim() && p.specialization?.trim()
      const hasPrefs = p.preferred_locations && p.preferred_locations.length > 0
      const hasHeadline = p.resume_headline?.trim() && p.resume_headline.trim().length >= 10

      let resumeStep = 1
      if (!hasBasicInfo) {
        resumeStep = 1
      } else if (!hasEmployment) {
        resumeStep = 3
      } else if (!hasSkills) {
        resumeStep = 4
      } else if (!hasResume) {
        resumeStep = 5
      } else if (!hasEducation) {
        resumeStep = 6
      } else if (!hasPrefs) {
        resumeStep = 7
      } else if (!hasHeadline) {
        resumeStep = 8
      } else {
        resumeStep = 8
      }

      console.log(`[Onboarding] Resuming from step ${resumeStep}`)
      setStep(resumeStep)
      setHasResumed(true)
    }
  }, [user, isLoading, hasResumed])


  const [form, setForm] = useState({
    full_name: '', phone: '', location: '',
    work_status: 'laid_off',
    current_company: '', job_title: '',
    experience_years: '' as string | number,
    current_salary: '' as string | number,
    notice_period: '1 month',
    skills: [] as string[], industry: '', department: '',
    highest_qualification: "Bachelor's", university: '',
    specialization: '', graduation_year: new Date().getFullYear(),
    preferred_locations: [] as string[],
    expected_salary: '' as string | number,
    resume_headline: '',
  })

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !form.skills.includes(s)) {
      set('skills', [...form.skills, s])
      setSkillInput('')
    }
  }

  const removeSkill = (s: string) => set('skills', form.skills.filter(x => x !== s))

  const addLocation = (loc: string) => {
    if (loc && !form.preferred_locations.includes(loc))
      set('preferred_locations', [...form.preferred_locations, loc])
  }

  const removeLocation = (loc: string) =>
    set('preferred_locations', form.preferred_locations.filter(x => x !== loc))

  const handleResumeUpload = async (file: File) => {
    setResumeFile(file)
    setResumeUploading(true)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      const res = await profilesApi.uploadResume(formData)
      setResumeUrl(res.resume_url || '')
      // Auto-fill skills if parsed
      if (res.skills?.length > 0 && form.skills.length === 0) {
        set('skills', res.skills.slice(0, 15))
      }
      if (res.experience_years) {
        set('experience_years', res.experience_years)
      }
      toast.success('Resume uploaded and parsed!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      setResumeFile(null)
    } finally {
      setResumeUploading(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        experience_years: form.experience_years ? parseFloat(String(form.experience_years)) : 0,
        current_salary: form.current_salary ? parseInt(String(form.current_salary)) : null,
        expected_salary: form.expected_salary ? parseInt(String(form.expected_salary)) : null,
        onboarding_completed: true,
        headline: form.resume_headline,
      }
      await profilesApi.updateProfile(payload)
      
      // Update local state so Guard doesn't redirect back to onboarding
      updateUser({ profile: { onboarding_completed: true } })
      
      toast.success('Profile complete!')
      router.push('/candidate/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    console.log(`[Onboarding Flow] Autosaving profile progress for Step ${step}...`)
    try {
      const payload = {
        ...form,
        experience_years: form.experience_years ? parseFloat(String(form.experience_years)) : 0,
        current_salary: form.current_salary ? parseInt(String(form.current_salary)) : null,
        expected_salary: form.expected_salary ? parseInt(String(form.expected_salary)) : null,
        headline: form.resume_headline,
      }
      const res = await profilesApi.updateProfile(payload)
      updateUser({ profile: res })
      console.log(`[Onboarding Flow] Autosave successful for Step ${step}`)
    } catch (err: any) {
      console.warn(`[Onboarding Flow] Autosave failed for Step ${step}:`, err.message)
    }
    setStep(s => Math.min(s + 1, STEPS.length))
  }

  const canNext = () => {
    if (step === 1) return form.full_name.trim() && form.phone.trim() && form.location.trim()
    if (step === 3) return form.current_company.trim() && form.job_title.trim()
    if (step === 4) return form.skills.length > 0
    if (step === 8) return form.resume_headline.trim().length >= 10
    return true
  }

  // Guard: if still loading or no token, show loading state
  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#0a0c1e' }}>
        <div className="relative mb-8">
          <div className="w-16 h-16 rounded-2xl border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
          </div>
        </div>
        <h2 className="text-white font-bold text-lg mb-2">Loading your profile</h2>
        <p className="text-slate-400 text-sm max-w-xs">Preparing your onboarding...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 relative overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Abstract Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-300/20 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-300/20 rounded-full blur-[100px] pointer-events-none animate-float" />

      {/* Header */}
      <nav className="h-[72px] bg-white/60 backdrop-blur-xl border-b border-white/40 flex items-center px-6 relative z-30 shadow-glass">
        <div className="w-8 h-8 bg-brand-600 shadow-glow rounded-xl flex items-center justify-center mr-2 group-hover:scale-105 transition-transform">
          <span className="text-white font-black text-[10px]">IF</span>
        </div>
        <span className="font-black font-display text-surface-900 text-xl tracking-tight">FiredIn</span>
        <span className="ml-3 text-[10px] font-bold text-brand-600 uppercase tracking-widest bg-brand-50 border border-brand-100 px-3 py-1 rounded-full shadow-sm">Profile Setup</span>
      </nav>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-8 relative z-10">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-surface-400 font-bold mb-2">
            <span>Step {step} of {STEPS.length}</span>
            <span className="text-brand-600">{STEPS[step - 1]?.label}</span>
          </div>
          <div className="h-2 bg-white/50 backdrop-blur-sm border border-white rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500 shadow-glow"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step title */}
        <h1 className="text-3xl font-black font-display text-surface-900 mb-6 drop-shadow-sm" style={{ letterSpacing: '-0.02em' }}>
          {step === 1 && 'Tell us about yourself'}
          {step === 2 && "What's your situation?"}
          {step === 3 && 'Your work experience'}
          {step === 4 && 'Your skills & industry'}
          {step === 5 && 'Upload your resume'}
          {step === 6 && 'Your education'}
          {step === 7 && 'Your preferences'}
          {step === 8 && 'Your headline'}
        </h1>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-4xl border border-white/50 shadow-glass hover:shadow-glass-hover transition-all duration-500 p-8 space-y-6 relative overflow-hidden">
          {/* Subtle inner gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          <div className="relative z-10 space-y-6">

          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <>
              <Field label="Full Name *">
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Sai Avinash Mandali" className="inp" />
              </Field>
              <Field label="Mobile Number *">
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+91 98765 43210" className="inp" />
              </Field>
              <Field label="Current Location *">
                <input value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="Hyderabad, Telangana" className="inp" />
              </Field>
            </>
          )}

          {/* Step 2 — Work Status */}
          {step === 2 && (
            <div className="space-y-3">
              {WORK_STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => set('work_status', opt.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    form.work_status === opt.value
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      form.work_status === opt.value ? 'border-black bg-black' : 'border-gray-300'
                    }`} />
                    <div>
                      <div className="font-bold text-black text-sm">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3 — Employment */}
          {step === 3 && (
            <>
              <Field label="Current / Last Company *">
                <input value={form.current_company} onChange={e => set('current_company', e.target.value)}
                  placeholder="Google, TCS, Startup..." className="inp" />
              </Field>
              <Field label="Job Title *">
                <input value={form.job_title} onChange={e => set('job_title', e.target.value)}
                  placeholder="Senior Software Engineer" className="inp" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Total Experience (years)">
                  <input
                    type="number" min={0} max={50} step={0.5}
                    value={form.experience_years}
                    onChange={e => set('experience_years', e.target.value)}
                    placeholder="e.g. 4.5"
                    className="inp"
                  />
                </Field>
                <Field label="Current Annual CTC (₹)">
                  <input
                    type="number" min={0}
                    value={form.current_salary}
                    onChange={e => set('current_salary', e.target.value)}
                    placeholder="e.g. 1200000"
                    className="inp"
                  />
                </Field>
              </div>
              <Field label="Notice Period">
                <select value={form.notice_period} onChange={e => set('notice_period', e.target.value)} className="inp">
                  {NOTICE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </>
          )}

          {/* Step 4 — Skills */}
          {step === 4 && (
            <>
              <Field label="Key Skills * (press Enter to add)">
                <div className="flex gap-2">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Python, React, Machine Learning..." className="inp flex-1" />
                  <button onClick={addSkill}
                    className="px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.skills.map(s => (
                      <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg">
                        {s}
                        <button onClick={() => removeSkill(s)} className="text-gray-400 hover:text-black">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Industry">
                <select value={form.industry} onChange={e => set('industry', e.target.value)} className="inp">
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Department / Function">
                <input value={form.department} onChange={e => set('department', e.target.value)}
                  placeholder="Engineering, Data Science, Product..." className="inp" />
              </Field>
            </>
          )}

          {/* Step 5 — Resume Upload */}
          {step === 5 && (
            <>
              <p className="text-gray-500 text-sm leading-relaxed">
                Upload your resume so we can auto-fill your skills and experience. PDF or DOCX, max 5MB.
              </p>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  resumeFile ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-black'
                }`}
                onClick={() => document.getElementById('resume-input')?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleResumeUpload(file)
                }}
              >
                <input
                  id="resume-input"
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleResumeUpload(file)
                  }}
                />
                {resumeUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-black" />
                    <p className="text-sm font-medium text-gray-600">Uploading and parsing with AI...</p>
                  </div>
                ) : resumeFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-8 h-8 text-black" />
                    <p className="text-sm font-bold text-black">{resumeFile.name}</p>
                    <p className="text-xs text-gray-500">Uploaded successfully. Skills auto-filled below.</p>
                    <button
                      onClick={e => { e.stopPropagation(); setResumeFile(null); setResumeUrl('') }}
                      className="text-xs text-gray-400 hover:text-black underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-1">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-black">Click to upload or drag & drop</p>
                    <p className="text-xs text-gray-400">PDF or DOCX · Max 5MB</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 text-center">
                You can also skip this and upload later from your dashboard.
              </p>
            </>
          )}

          {/* Step 6 — Education */}
          {step === 6 && (
            <>
              <Field label="Highest Qualification">
                <select value={form.highest_qualification} onChange={e => set('highest_qualification', e.target.value)} className="inp">
                  {QUALIFICATIONS.map(q => <option key={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="University / College">
                <input value={form.university} onChange={e => set('university', e.target.value)}
                  placeholder="IIT Hyderabad, JNTU, VIT..." className="inp" />
              </Field>
              <Field label="Specialization / Major">
                <input value={form.specialization} onChange={e => set('specialization', e.target.value)}
                  placeholder="Computer Science, Data Science, MBA..." className="inp" />
              </Field>
              <Field label="Graduation Year">
                <input type="number" min={1990} max={2030} value={form.graduation_year}
                  onChange={e => set('graduation_year', parseInt(e.target.value))} className="inp" />
              </Field>
            </>
          )}

          {/* Step 7 — Preferences */}
          {step === 7 && (
            <>
              <Field label="Preferred Work Locations">
                <div className="flex gap-2">
                  <input id="loc-input" placeholder="Hyderabad, Bangalore, Remote..."
                    className="inp flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const inp = e.target as HTMLInputElement
                        addLocation(inp.value.trim())
                        inp.value = ''
                      }
                    }} />
                  <button onClick={() => {
                    const inp = document.getElementById('loc-input') as HTMLInputElement
                    addLocation(inp.value.trim()); inp.value = ''
                  }} className="px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {form.preferred_locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.preferred_locations.map(l => (
                      <span key={l} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg">
                        {l}
                        <button onClick={() => removeLocation(l)} className="text-gray-400 hover:text-black">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="Expected Annual CTC (₹)">
                <input
                  type="number" min={0}
                  value={form.expected_salary}
                  onChange={e => set('expected_salary', e.target.value)}
                  placeholder="e.g. 1500000"
                  className="inp"
                />
                {form.expected_salary && Number(form.expected_salary) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    = ₹{(Number(form.expected_salary) / 100000).toFixed(1)} LPA
                  </p>
                )}
              </Field>
            </>
          )}

          {/* Step 8 — Headline */}
          {step === 8 && (
            <>
              <p className="text-gray-500 text-sm leading-relaxed">
                A punchy one-liner that tells recruiters who you are. This shows on your profile and every application.
              </p>
              <Field label="Resume Headline * (min 10 characters)">
                <textarea value={form.resume_headline}
                  onChange={e => set('resume_headline', e.target.value)}
                  rows={3} maxLength={200}
                  placeholder="Senior ML Engineer | 5 yrs | Python, LangChain, AWS | Open to remote"
                  className="inp resize-none" />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.resume_headline.length}/200</p>
              </Field>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-600 mb-2">Examples:</p>
                <ul className="space-y-1 text-xs text-gray-500">
                  <li>• "Full-Stack Dev | 4 yrs | React, Node.js, AWS | Open to remote"</li>
                  <li>• "Data Scientist | ML & NLP | 3 yrs at Infosys | Python, TensorFlow"</li>
                  <li>• "Product Manager | B2B SaaS | 6 yrs | Ex-Flipkart, Ex-Razorpay"</li>
                </ul>
              </div>
            </>
          )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-3.5 text-surface-500 font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-white/50 backdrop-blur-sm border border-transparent hover:border-white/50 disabled:opacity-30 transition-all shadow-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length ? (
            <button onClick={handleNext} disabled={!canNext()}
              className="flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-glow hover:shadow-glow-lg">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={!canNext() || saving}
              className="flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-glow hover:shadow-glow-lg">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><CheckCircle className="w-4 h-4" /> Complete Profile</>
              }
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .inp { width: 100%; padding: 0.875rem 1.25rem; background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 1px 2px rgba(0,0,0,0.02); border-radius: 1rem; font-size: 0.875rem; font-weight: 600; color: #0f172a; outline: none; transition: all 0.2s; }
        .inp:focus { border-color: #3b82f6; background: #fff; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
        .inp::placeholder { color: #94a3b8; font-weight: 500; }
        select.inp { cursor: pointer; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">{label}</label>
      {children}
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <AuthGuard requiredRole="candidate">
      <OnboardingContent />
    </AuthGuard>
  )
}
