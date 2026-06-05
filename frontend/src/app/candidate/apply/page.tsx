'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Brain, Upload, FileText, CheckCircle, ArrowRight,
  Loader2, X, AlertCircle, Briefcase, MapPin,
  DollarSign, Clock, Users, Calendar, Sparkles
} from 'lucide-react'
import { profilesApi, jobsApi, applicationsApi, verificationApi } from '@/services/api'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/AuthGuard'

type Step = 'details' | 'upload' | 'processing' | 'done'

import { Suspense } from 'react'

function ApplyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('details')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [matchScore, setMatchScore] = useState(0)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [job, setJob] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [useSavedResume, setUseSavedResume] = useState(false)
  const [isInvited, setIsInvited] = useState(false)
  const [verification, setVerification] = useState<any>(null)
  const [verificationLoading, setVerificationLoading] = useState(true)

  useEffect(() => {
    const fetchJobDetails = async () => {
      const jobId = searchParams.get('job_id')
      if (!jobId) {
        router.push('/candidate/jobs')
        return
      }

      try {
        const data = await jobsApi.get(jobId)
        setJob(data)
      } catch (err) {
        console.error('Failed to fetch job details', err)
      }
    }
    fetchJobDetails()

    // ── Pre-fill if logged in as candidate; block recruiters ──
    const fetchProfile = async () => {
      const token = localStorage.getItem('firedin_token')
      if (token) {
        try {
          const profileData = await profilesApi.get()

          // Block recruiters/admins — they should not be applying for jobs
          const role = profileData?.role || localStorage.getItem('firedin_role')
          if (role === 'recruiter' || role === 'admin') {
            // Don't pre-fill recruiter details; just leave the form empty
            // so a real candidate can fill it manually
            return
          }

          setProfile(profileData)
          if (profileData?.profile) {
            setForm(prev => ({ 
              ...prev, 
              name: profileData.profile?.full_name || prev.name, 
              email: profileData.email || prev.email 
            }))
          }
        } catch (e) {
          console.error("Failed to load profile for fast apply", e)
        }
      }
    }
    fetchProfile()

    // ── Verification status (candidate-side gate) ─────────────────────────
    const fetchVerification = async () => {
      const token = localStorage.getItem('firedin_token')
      if (!token) {
        setVerificationLoading(false)
        return
      }
      try {
        const res = await verificationApi.status()
        setVerification(res)
      } catch (e) {
        // If this fails, backend will still enforce the verification gate.
        console.error('Failed to load verification status', e)
      } finally {
        setVerificationLoading(false)
      }
    }
    fetchVerification()
  }, [searchParams, router])


  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFile(accepted[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file && !useSavedResume) return toast.error('Please upload your resume or select your saved profile resume.')
    if (!form.name || !form.email) return toast.error('Please fill in your details.')

    setLoading(true)
    setStep('processing')
    
    try {
      const jobId = searchParams.get('job_id') || '73399344-ba6c-4695-ad0c-1802bea7a6e9'
      const formData = new FormData()
      formData.append('job_id', jobId)
      formData.append('candidate_name', form.name)
      formData.append('candidate_email', form.email)
      formData.append('candidate_phone', form.phone || '')
      if (useSavedResume) {
        formData.append('use_saved_profile', 'true')
      } else if (file) {
        formData.append('resume', file)
      }

      const response = await applicationsApi.apply(formData)

      const { application_id, interview_invited } = response
      setIsInvited(interview_invited)
      setStep('done')
      localStorage.setItem('last_app_id', application_id)
    } catch (err: any) {
      console.error(err)
      const msg = err.message || 'Submission failed. Please try again.'
      toast.error(msg)
      setStep('upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 relative overflow-hidden text-surface-900">
      {/* Abstract Background Orbs for Soft UI */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-300/20 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-300/20 rounded-full blur-[100px] pointer-events-none animate-float" />
      
      {/* Premium Navbar */}
      <nav className="h-[72px] bg-white/60 backdrop-blur-xl border-b border-white/40 flex items-center px-6 sticky top-0 z-30 shadow-glass">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/firedin-logo.png" alt="FiredIn" width={40} height={40} priority className="rounded-xl object-cover shadow-glow group-hover:scale-105 transition-transform duration-300" />
            <div>
               <span className="text-xl font-black font-display text-surface-900 tracking-tight block leading-none">FiredIn</span>
               <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Candidate</span>
            </div>
          </Link>
          <div className="text-xs text-surface-500 font-bold uppercase tracking-wider">
             <Link href="/candidate/jobs" className="hover:text-brand-600 transition-colors bg-white/50 px-4 py-2 rounded-full border border-white hover:shadow-sm">Browse Jobs</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {step !== 'done' && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-8 max-w-sm mx-auto overflow-hidden">
              {[
                { s: 'details', label: 'Details', icon: Users },
                { s: 'upload', label: 'Resume', icon: FileText },
                { s: 'processing', label: 'Matching', icon: Brain },
              ].map((item, i) => (
                <div key={item.s} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step === item.s ? 'bg-brand-600 text-white shadow-lg shadow-brand-100 scale-110' : 'bg-white text-surface-400 border border-surface-200'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${step === item.s ? 'text-brand-600' : 'text-surface-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/70 backdrop-blur-xl rounded-4xl border border-white/50 shadow-glass hover:shadow-glass-hover transition-all duration-500 overflow-hidden min-h-[500px] flex flex-col justify-center relative">
          {/* Subtle inner gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          
          {step === 'details' && (
            <div className="p-8 md:p-12 animate-fade-in text-center">
              <div className="max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 mb-6">
                  <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Application Details</span>
                </div>
                <h1 className="text-3xl font-bold font-display text-surface-900 mb-2">{job?.title || 'Senior React Developer'}</h1>
                <p className="text-surface-600 font-medium mb-8">{job?.department || 'Engineering'}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                  <div className="bg-white/50 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-sm hover:shadow-md transition-shadow text-left group">
                    <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 group-hover:text-brand-500 transition-colors">Salary</div>
                    <div className="text-base font-black text-surface-900">₹{job?.salary_min ? job.salary_min : '20'}–{job?.salary_max ? job.salary_max : '35'} <span className="text-xs font-bold text-surface-500">LPA</span></div>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-sm hover:shadow-md transition-shadow text-left group">
                    <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 group-hover:text-brand-500 transition-colors">Experience</div>
                    <div className="text-base font-black text-surface-900">{job?.experience_min || '4'}–{job?.experience_max || '8'} <span className="text-xs font-bold text-surface-500">Yrs</span></div>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-sm hover:shadow-md transition-shadow text-left group">
                    <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 group-hover:text-brand-500 transition-colors">Location</div>
                    <div className="text-base font-black text-surface-900 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-500" /> {job?.location || 'Remote'}</div>
                  </div>
                  <div className="bg-white/50 backdrop-blur-sm p-5 rounded-3xl border border-white shadow-sm hover:shadow-md transition-shadow text-left group">
                    <div className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 group-hover:text-brand-500 transition-colors">Type</div>
                    <div className="text-base font-black text-surface-900 capitalize">{job?.job_type?.replace('_', ' ') || 'Full-time'}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-10 max-w-lg mx-auto">
                  <input 
                    type="text" placeholder="Your Full Name" 
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                  />
                  <input 
                    type="email" placeholder="Your Email Address" 
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-5 py-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                  />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    if (!form.name || !form.email) {
                      toast.error('Please enter your name and email');
                      return;
                    }
                    console.log('Transitioning to upload step');
                    setStep('upload');
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-brand-100"
                >
                  Continue to Resume Upload <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="p-8 md:p-12 animate-fade-in">
              <div className="max-w-xl mx-auto text-center">
                <h2 className="text-2xl font-bold text-surface-900 mb-2">Upload Your Resume</h2>
                <p className="text-surface-500 text-sm mb-8">PDF or DOCX allowed. Max 5MB.</p>



                {profile?.resume_url && (
                  <div 
                    onClick={() => { setUseSavedResume(true); setFile(null); }}
                    className={`mb-6 p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${useSavedResume ? 'border-brand-600 bg-brand-50 shadow-md shadow-brand-100' : 'border-surface-200 bg-white hover:border-brand-300'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${useSavedResume ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'}`}>
                        <Brain className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h4 className={`font-bold ${useSavedResume ? 'text-brand-900' : 'text-surface-900'}`}>Use Saved Profile Resume</h4>
                        <p className={`text-xs ${useSavedResume ? 'text-brand-700' : 'text-surface-500'}`}>Fast Apply using your globally parsed insights</p>
                      </div>
                    </div>
                    {useSavedResume && <CheckCircle className="w-6 h-6 text-brand-600" />}
                  </div>
                )}

                <div 
                  {...getRootProps()} 
                  onClick={(e) => {
                    setUseSavedResume(false)
                    const props = getRootProps()
                    if (props.onClick) props.onClick(e)
                  }}
                  className={`border-2 border-dashed rounded-3xl p-12 transition-all cursor-pointer ${
                  isDragActive ? 'border-brand-500 bg-brand-50' : (useSavedResume ? 'border-surface-200 opacity-50' : 'border-brand-300 bg-white')
                }`}>
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-surface-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-surface-400" />
                    </div>
                    <p className="text-surface-700 font-bold mb-1">
                      {file ? file.name : 'Click to upload or drag and drop new resume'}
                    </p>
                    <p className="text-xs text-surface-500">Instead of using your saved profile</p>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button onClick={() => setStep('details')} className="text-sm font-bold text-surface-400 hover:text-surface-600 transition-colors">Back</button>
                  <button 
                    onClick={handleSubmit}
                    disabled={(!file && !useSavedResume) || verificationLoading}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-black px-8 py-3.5 rounded-2xl transition-all shadow-glow hover:shadow-glow-lg flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Submit Application <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="p-12 text-center animate-fade-in">
              <div className="w-24 h-24 relative mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
                <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-brand-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-surface-900 mb-3">AI is Reviewing Your Resume</h2>
              <p className="text-surface-500 max-w-sm mx-auto text-sm leading-relaxed mb-4">
                Our AI matching engine is comparing your experience, skills, and qualifications against the job requirements...
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                This usually takes 30-60 seconds. Please don't close this window.
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="p-12 text-center animate-bounce-in">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-surface-900 mb-3">Application Submitted!</h2>
              {isInvited ? (
                <>
                  <p className="text-surface-600 max-w-md mx-auto mb-10">
                    Your application has been successfully received. We've analysed your profile and you meet the requirements for the next stage.
                  </p>
                  
                  <Link 
                    href={`/candidate/schedule?app_id=${typeof window !== 'undefined' ? localStorage.getItem('last_app_id') : ''}`}
                    className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-lg shadow-brand-100 hover:scale-105 active:scale-95"
                  >
                    Schedule Your Interview <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-surface-600 max-w-md mx-auto mb-10">
                    Your application has been successfully received and our team will review it. We will reach out to you via email if your profile matches our requirements.
                  </p>
                  
                  <Link 
                    href={`/candidate/jobs`}
                    className="inline-flex items-center justify-center gap-2 bg-brand-100 hover:bg-brand-200 text-brand-700 font-bold px-10 py-4 rounded-2xl transition-all shadow-sm shadow-brand-50"
                  >
                    Browse Other Jobs
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <AuthGuard requiredRole="candidate">
      <Suspense fallback={<div className="p-10 text-center text-surface-500 flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /> Loading application...</div>}>
        <ApplyContent />
      </Suspense>
    </AuthGuard>
  )
}
