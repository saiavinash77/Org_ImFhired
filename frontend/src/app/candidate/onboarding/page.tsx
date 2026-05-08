'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getApiUrl } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import {
  User, Briefcase, GraduationCap, MapPin, FileText,
  ChevronRight, ChevronLeft, Loader2, CheckCircle, Plus, X
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Basic Info',    icon: User },
  { id: 2, label: 'Work Status',   icon: Briefcase },
  { id: 3, label: 'Employment',    icon: Briefcase },
  { id: 4, label: 'Skills',        icon: FileText },
  { id: 5, label: 'Education',     icon: GraduationCap },
  { id: 6, label: 'Preferences',   icon: MapPin },
  { id: 7, label: 'Headline',      icon: FileText },
]

const NOTICE_OPTIONS = ['Immediate', '15 days', '1 month', '2 months', '3 months', '6 months']
const COURSE_TYPES = ['Full-time', 'Part-time', 'Distance Learning', 'Online']
const QUALIFICATIONS = ['10th', '12th', 'Diploma', "Bachelor's", "Master's", 'PhD', 'Other']
const INDUSTRIES = ['IT & Software', 'Finance & Banking', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Media', 'Government', 'Other']

export default function OnboardingPage() {
  const router = useRouter()
  const { token, updateUser } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [skillInput, setSkillInput] = useState('')

  const [form, setForm] = useState({
    // Step 1
    full_name: '', phone: '', location: '',
    // Step 2
    work_status: 'experienced',
    // Step 3
    current_company: '', job_title: '',
    total_experience_months: 0, current_salary: 0, notice_period: '1 month',
    // Step 4
    skills: [] as string[], industry: '', department: '',
    // Step 5
    highest_qualification: "Bachelor's", university: '',
    specialization: '', course_type: 'Full-time', graduation_year: new Date().getFullYear(),
    // Step 6
    preferred_locations: [] as string[], expected_salary: 0,
    // Step 7
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

  const handleFinish = async () => {
    setSaving(true)
    try {
      const API_URL = getApiUrl()
      const payload = {
        ...form,
        experience_years: parseFloat((form.total_experience_months / 12).toFixed(1)),
        onboarding_completed: true,
        headline: form.resume_headline,
      }
      await axios.put(`${API_URL}/api/v1/profiles/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Profile complete! Starting verification...')
      // Trigger verification interview
      const vRes = await axios.post(`${API_URL}/api/v1/verification/start`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { interview_id } = vRes.data
      router.push(`/candidate/verify/${interview_id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const canNext = () => {
    if (step === 1) return form.full_name.trim() && form.phone.trim() && form.location.trim()
    if (step === 3 && form.work_status === 'experienced') return form.current_company.trim() && form.job_title.trim()
    if (step === 4) return form.skills.length > 0
    if (step === 7) return form.resume_headline.trim().length >= 10
    return true
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      {/* Header */}
      <nav className="h-16 bg-white border-b border-surface-100 flex items-center px-6">
        <Image src="/hireai-logo.png" alt="HireAI" width={36} height={36} className="rounded-xl mr-3" />
        <span className="font-black text-surface-900">HireAI</span>
        <span className="ml-3 text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full">Onboarding</span>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-black transition-all ${
                step > s.id ? 'bg-green-500 text-white' :
                step === s.id ? 'bg-brand-600 text-white' :
                'bg-surface-200 text-surface-400'
              }`}>
                {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${step > s.id ? 'bg-green-400' : 'bg-surface-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step label */}
        <div className="mb-6">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">Step {step} of {STEPS.length}</p>
          <h1 className="text-2xl font-black text-surface-900">{STEPS[step-1].label}</h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-8 space-y-5">

          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <>
              <div>
                <label className="label-sm">Full Name *</label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Sai Avinash Mandali" className="input-field" />
              </div>
              <div>
                <label className="label-sm">Mobile Number *</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+91 98765 43210" className="input-field" />
              </div>
              <div>
                <label className="label-sm">Current Location *</label>
                <input value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="Hyderabad, Telangana" className="input-field" />
              </div>
            </>
          )}

          {/* Step 2 — Work Status */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-surface-600 text-sm">Are you a fresher or do you have work experience?</p>
              {['fresher', 'experienced'].map(opt => (
                <button key={opt} onClick={() => set('work_status', opt)}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
                    form.work_status === opt
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-surface-200 hover:border-brand-300'
                  }`}>
                  <div className="font-bold text-surface-900 capitalize">{opt}</div>
                  <div className="text-sm text-surface-500 mt-1">
                    {opt === 'fresher' ? 'I am a recent graduate with no full-time work experience' : 'I have professional work experience'}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3 — Employment Details */}
          {step === 3 && (
            <>
              {form.work_status === 'experienced' ? (
                <>
                  <div>
                    <label className="label-sm">Current / Last Company *</label>
                    <input value={form.current_company} onChange={e => set('current_company', e.target.value)}
                      placeholder="Google, TCS, Startup..." className="input-field" />
                  </div>
                  <div>
                    <label className="label-sm">Job Title *</label>
                    <input value={form.job_title} onChange={e => set('job_title', e.target.value)}
                      placeholder="Senior Software Engineer" className="input-field" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-sm">Total Experience (months)</label>
                      <input type="number" min={0} value={form.total_experience_months}
                        onChange={e => set('total_experience_months', parseInt(e.target.value) || 0)}
                        className="input-field" />
                      <p className="text-xs text-surface-400 mt-1">
                        = {(form.total_experience_months / 12).toFixed(1)} years
                      </p>
                    </div>
                    <div>
                      <label className="label-sm">Current Annual Salary (₹)</label>
                      <input type="number" min={0} value={form.current_salary}
                        onChange={e => set('current_salary', parseInt(e.target.value) || 0)}
                        className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="label-sm">Notice Period</label>
                    <select value={form.notice_period} onChange={e => set('notice_period', e.target.value)}
                      className="input-field">
                      {NOTICE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-surface-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-surface-300" />
                  <p className="font-medium">As a fresher, skip to the next step to add your skills.</p>
                </div>
              )}
            </>
          )}

          {/* Step 4 — Skills & Industry */}
          {step === 4 && (
            <>
              <div>
                <label className="label-sm">Key Skills * (add at least 1)</label>
                <div className="flex gap-2">
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Python, React, Machine Learning..." className="input-field flex-1" />
                  <button onClick={addSkill}
                    className="px-4 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 text-sm font-semibold rounded-lg border border-brand-100">
                      {s}
                      <button onClick={() => removeSkill(s)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-sm">Industry</label>
                <select value={form.industry} onChange={e => set('industry', e.target.value)} className="input-field">
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label-sm">Department / Job Role</label>
                <input value={form.department} onChange={e => set('department', e.target.value)}
                  placeholder="Engineering, Data Science, Product..." className="input-field" />
              </div>
            </>
          )}

          {/* Step 5 — Education */}
          {step === 5 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-sm">Highest Qualification</label>
                  <select value={form.highest_qualification} onChange={e => set('highest_qualification', e.target.value)} className="input-field">
                    {QUALIFICATIONS.map(q => <option key={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-sm">Course Type</label>
                  <select value={form.course_type} onChange={e => set('course_type', e.target.value)} className="input-field">
                    {COURSE_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-sm">University / College</label>
                <input value={form.university} onChange={e => set('university', e.target.value)}
                  placeholder="IIT Hyderabad, JNTU..." className="input-field" />
              </div>
              <div>
                <label className="label-sm">Specialization / Major</label>
                <input value={form.specialization} onChange={e => set('specialization', e.target.value)}
                  placeholder="Computer Science, Data Science..." className="input-field" />
              </div>
              <div>
                <label className="label-sm">Graduation Year</label>
                <input type="number" min={1990} max={2030} value={form.graduation_year}
                  onChange={e => set('graduation_year', parseInt(e.target.value))} className="input-field" />
              </div>
            </>
          )}

          {/* Step 6 — Preferences */}
          {step === 6 && (
            <>
              <div>
                <label className="label-sm">Preferred Work Locations</label>
                <div className="flex gap-2">
                  <input id="loc-input" placeholder="Hyderabad, Bangalore, Remote..."
                    className="input-field flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addLocation((e.target as HTMLInputElement).value.trim());
                        (e.target as HTMLInputElement).value = ''
                      }
                    }} />
                  <button onClick={() => {
                    const inp = document.getElementById('loc-input') as HTMLInputElement
                    addLocation(inp.value.trim()); inp.value = ''
                  }} className="px-4 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.preferred_locations.map(l => (
                    <span key={l} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-100 text-surface-700 text-sm font-semibold rounded-lg">
                      {l} <button onClick={() => removeLocation(l)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-sm">Expected Annual Salary (₹)</label>
                <input type="number" min={0} value={form.expected_salary}
                  onChange={e => set('expected_salary', parseInt(e.target.value) || 0)}
                  placeholder="1200000" className="input-field" />
                {form.expected_salary > 0 && (
                  <p className="text-xs text-surface-400 mt-1">
                    = ₹{(form.expected_salary / 100000).toFixed(1)} LPA
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 7 — Resume Headline */}
          {step === 7 && (
            <>
              <p className="text-surface-600 text-sm leading-relaxed">
                Write a short, punchy headline that summarises your role, experience, and key skills. This appears on your profile and job applications.
              </p>
              <div>
                <label className="label-sm">Resume Headline * (min 10 characters)</label>
                <textarea value={form.resume_headline}
                  onChange={e => set('resume_headline', e.target.value)}
                  rows={3} maxLength={200}
                  placeholder="GenAI Developer with 2+ years building LLM-powered apps using Python, LangChain & FastAPI"
                  className="input-field resize-none" />
                <p className="text-xs text-surface-400 mt-1 text-right">{form.resume_headline.length}/200</p>
              </div>
              <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
                <p className="text-xs font-bold text-brand-700 mb-2">Examples:</p>
                <ul className="space-y-1 text-xs text-brand-600">
                  <li>• "Full-Stack Developer | 4 yrs | React, Node.js, AWS | Open to remote"</li>
                  <li>• "Data Scientist | ML & NLP | 3 yrs at Infosys | Python, TensorFlow"</li>
                  <li>• "Fresher | B.Tech CSE 2024 | Passionate about AI/ML | Python, PyTorch"</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-3 text-surface-600 font-bold rounded-xl hover:bg-surface-100 disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="flex items-center gap-2 px-8 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold rounded-xl transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={!canNext() || saving}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold rounded-xl transition-colors">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Complete & Start Verification</>}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .label-sm { display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
        .input-field { width: 100%; padding: 0.875rem 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 500; color: #0f172a; outline: none; transition: all 0.15s; }
        .input-field:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        select.input-field { cursor: pointer; }
      `}</style>
    </div>
  )
}
