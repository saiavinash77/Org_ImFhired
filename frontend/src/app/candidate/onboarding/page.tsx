'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getApiUrl } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
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

export default function OnboardingPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [skillInput, setSkillInput] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeUrl, setResumeUrl] = useState('')

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
      const API_URL = getApiUrl()
      const formData = new FormData()
      formData.append('resume', file)
      const res = await axios.post(`${API_URL}/api/v1/profiles/me/resume`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      })
      setResumeUrl(res.data.resume_url || '')
      // Auto-fill skills if parsed
      if (res.data.skills?.length > 0 && form.skills.length === 0) {
        set('skills', res.data.skills.slice(0, 15))
      }
      if (res.data.experience_years) {
        set('experience_years', res.data.experience_years)
      }
      toast.success('Resume uploaded and parsed!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
      setResumeFile(null)
    } finally {
      setResumeUploading(false)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const API_URL = getApiUrl()
      const payload = {
        ...form,
        experience_years: form.experience_years ? parseFloat(String(form.experience_years)) : 0,
        current_salary: form.current_salary ? parseInt(String(form.current_salary)) : null,
        expected_salary: form.expected_salary ? parseInt(String(form.expected_salary)) : null,
        onboarding_completed: true,
        headline: form.resume_headline,
      }
      await axios.put(`${API_URL}/api/v1/profiles/me`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success('Profile complete! Starting verification...')
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
    if (step === 3) return form.current_company.trim() && form.job_title.trim()
    if (step === 4) return form.skills.length > 0
    if (step === 8) return form.resume_headline.trim().length >= 10
    return true
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <nav className="h-14 bg-white border-b border-gray-100 flex items-center px-6">
        <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center mr-2">
          <span className="text-white font-black text-[9px]">IF</span>
        </div>
        <span className="font-black text-black">ImFhired</span>
        <span className="ml-3 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Profile Setup</span>
      </nav>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-400 font-medium mb-2">
            <span>Step {step} of {STEPS.length}</span>
            <span>{STEPS[step - 1].label}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step title */}
        <h1 className="text-2xl font-black text-black mb-6" style={{ letterSpacing: '-0.02em' }}>
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

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

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
            className="flex items-center gap-2 px-5 py-3 text-gray-600 font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="flex items-center gap-2 px-8 py-3 bg-black hover:bg-gray-800 disabled:opacity-30 text-white font-bold rounded-xl transition-colors text-sm">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={!canNext() || saving}
              className="flex items-center gap-2 px-8 py-3 bg-black hover:bg-gray-800 disabled:opacity-30 text-white font-bold rounded-xl transition-colors text-sm">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                : <><CheckCircle className="w-4 h-4" /> Complete Profile</>
              }
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        .inp { width: 100%; padding: 0.75rem 1rem; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 500; color: #111827; outline: none; transition: all 0.15s; }
        .inp:focus { border-color: #111827; background: #fff; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
        select.inp { cursor: pointer; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}
