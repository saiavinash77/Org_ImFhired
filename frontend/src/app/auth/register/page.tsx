'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl } from '@/lib/api'

const benefits = {
  recruiter: [
    'Post and manage unlimited job listings',
    'Automated resume screening and candidate shortlisting',
    'Conduct structured AI video interviews at scale',
    'Receive comprehensive candidate evaluation reports',
    'Reduce screening time by over 80% per role',
  ],
  candidate: [
    'Complete your application in under two minutes',
    'Fair, objective AI-powered evaluation — zero bias',
    'Interview on your schedule, from anywhere',
    'Receive structured feedback after every interview',
    'Manage all your applications in a single dashboard',
  ],
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(searchParams.get('role') || 'recruiter')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', company: '' })

  const [loadingMsg, setLoadingMsg] = useState('Creating account...')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.')
    setLoading(true)
    setLoadingMsg('Creating account...')

    // Update message after 3 s so user knows it's still working
    const msgTimer = setTimeout(() => setLoadingMsg('Almost there, please wait...'), 3000)

    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role: role,
          company_name: role === 'recruiter' ? form.company : undefined
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Registration failed')
      }

      const data = await response.json()
      localStorage.setItem('hireai_token', data.access_token)
      localStorage.setItem('hireai_user', JSON.stringify(data.user))

      toast.success('Account created. Welcome to HireAI.')
      // Candidates go to onboarding first, recruiters go straight to jobs
      if (role === 'recruiter') {
        router.push('/recruiter/jobs')
      } else {
        router.push('/candidate/onboarding')
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.')
    } finally {
      clearTimeout(msgTimer)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0c1e' }}>

      {/* ─── Ambient Orbs ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-brand animate-orb"
          style={{ width: 600, height: 600, top: '-140px', right: '-100px', opacity: 0.85 }} />
        <div className="orb orb-accent animate-orb-slow"
          style={{ width: 400, height: 400, bottom: '80px', right: '300px', opacity: 0.7 }} />
        <div className="orb orb-blue animate-orb"
          style={{ width: 480, height: 480, bottom: '-120px', left: '-80px', opacity: 0.75, animationDelay: '6s' }} />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
      </div>

      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex flex-col w-[520px] relative overflow-hidden p-14"
        style={{ background: 'rgba(8, 12, 30, 0.6)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, rgba(99,102,241,0.12) 0%, transparent 50%, rgba(217,70,239,0.07) 100%)',
        }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-16 group">
            <Image src="/hireai-logo.png" alt="HireAI" width={44} height={44} priority
              className="rounded-xl object-cover logo-glow group-hover:scale-105 transition-transform" />
            <div className="text-white font-bold text-xl tracking-tight">HireAI</div>
          </Link>

          {/* Headline */}
          <div className="mb-10">
            <h2 className="text-4xl font-black text-white leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
              {role === 'recruiter' ? (
                <>Hire With<br /><span className="gradient-text">Confidence</span></>
              ) : (
                <>Find Your Next<br /><span className="gradient-text">Opportunity</span></>
              )}
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              {role === 'recruiter'
                ? 'Automate your entire recruitment workflow — from initial screening to structured final assessments.'
                : 'Experience a transparent, bias-free AI interview process from the comfort of your home.'}
            </p>
          </div>

          {/* Benefits list */}
          <ul className="space-y-3 mb-auto">
            {benefits[role as 'recruiter' | 'candidate'].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <CheckCircle className="w-3 h-3 text-indigo-400" />
                </div>
                <span className="text-slate-300 text-sm font-medium leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div className="mt-12 pt-8 flex items-center gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex -space-x-2.5">
              {['PS', 'RM', 'AG'].map((i, idx) => (
                <div key={idx} className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shadow-md"
                  style={{ background: `hsl(${idx * 80 + 200}, 60%, 50%)`, borderColor: 'rgba(10,12,30,0.8)' }}>{i}</div>
              ))}
            </div>
            <div className="text-slate-400 text-xs font-medium">
              Trusted by <strong className="text-white">2,000+</strong> companies and <strong className="text-white">50,000+</strong> professionals worldwide
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL (glass form) ─── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md relative">
          <div
            className="rounded-3xl p-8 lg:p-10"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderTopColor: 'rgba(255, 255, 255, 0.28)',
              backdropFilter: 'blur(28px) saturate(180%)',
              WebkitBackdropFilter: 'blur(28px) saturate(180%)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            {/* Mobile Logo */}
            <Link href="/" className="flex items-center gap-3 mb-8 lg:hidden">
              <Image src="/hireai-logo.png" alt="HireAI" width={36} height={36} className="rounded-xl object-cover logo-glow" />
              <span className="text-xl font-bold text-white tracking-tight">HireAI</span>
            </Link>

            <div className="mb-7">
              <h1 className="text-3xl font-black text-white mb-2" style={{ letterSpacing: '-0.025em' }}>Create your account</h1>
              <p className="text-slate-400 font-medium text-sm">
                Already have an account?{' '}
                <Link href={`/auth/login?role=${role}`}
                  className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Role Toggle */}
            <div className="flex rounded-2xl p-1 mb-7"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {['recruiter', 'candidate'].map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className="flex-1 py-2.5 text-sm font-semibold text-center rounded-xl capitalize transition-all duration-200"
                  style={role === r
                    ? {
                        background: 'rgba(255,255,255,0.12)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.18)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      }
                    : { color: 'rgba(148,163,184,0.7)', border: '1px solid transparent' }
                  }>
                  {r === 'recruiter' ? 'I am Hiring' : 'I am a Candidate'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required
                  placeholder="Priya Sharma"
                  className="glass-input-dark w-full px-4 py-3.5 rounded-xl text-sm font-medium" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Work Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                  placeholder="priya@company.com"
                  className="glass-input-dark w-full px-4 py-3.5 rounded-xl text-sm font-medium" />
              </div>
              {role === 'recruiter' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Company Name</label>
                  <input value={form.company} onChange={e => setForm({...form, company: e.target.value})}
                    placeholder="TechCorp India"
                    className="glass-input-dark w-full px-4 py-3.5 rounded-xl text-sm font-medium" />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                    placeholder="Minimum 8 characters"
                    className="glass-input-dark w-full px-4 py-3.5 rounded-xl text-sm font-medium pr-12" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 pt-1">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-indigo-400 font-semibold hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-indigo-400 font-semibold hover:underline">Privacy Policy</a>.
              </p>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 text-white font-bold py-4 rounded-2xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2 btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)',
                  boxShadow: '0 8px 28px rgba(99,102,241,0.45), 0 2px 8px rgba(99,102,241,0.3)',
                }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {loadingMsg}</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0c1e' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
