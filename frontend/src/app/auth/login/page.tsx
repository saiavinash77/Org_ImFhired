'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Loader2, Shield, Zap, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl } from '@/lib/api'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Signing in...')
  const [form, setForm] = useState({ email: '', password: '' })
  const role = searchParams.get('role') || 'recruiter'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoadingMsg('Signing in...')
    const msgTimer = setTimeout(() => setLoadingMsg('Almost there...'), 3000)
    
    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      const API_URL = getApiUrl()
      console.log(`[Login] Attempting login to: ${API_URL}/api/v1/auth/login`)
      
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      console.log(`[Login] Response received: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Login failed')
      }
      const data = await response.json()
      localStorage.setItem('hireai_token', data.access_token)
      localStorage.setItem('hireai_user', JSON.stringify(data.user))
      toast.success('Welcome back!')
      
      // Route using the actual database role rather than the selected tab
      const dbRole = data.user?.role || 'candidate'
      router.push(dbRole === 'recruiter' || dbRole === 'admin' ? '/recruiter/jobs' : '/candidate/dashboard')
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.error('Login request timed out. Please check if the backend is running.')
      } else {
        toast.error(err.message || 'Invalid credentials. Please try again.')
      }
      console.error('[Login] Error:', err)
    } finally {
      clearTimeout(msgTimer)
      clearTimeout(timeoutId)
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
        {/* Subtle dot grid overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
      </div>

      {/* ─── LEFT PANEL (dark brand side) ─── */}
      <div className="hidden lg:flex flex-col w-[520px] relative overflow-hidden p-14"
        style={{ background: 'rgba(8, 12, 30, 0.6)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Glass inner highlight */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(160deg, rgba(99,102,241,0.12) 0%, transparent 50%, rgba(217,70,239,0.07) 100%)',
        }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-16 group">
            <Image src="/hireai-logo.png" alt="HireAI" width={44} height={44} priority
              className="rounded-xl object-cover logo-glow group-hover:scale-105 transition-transform" />
            <div>
              <div className="text-white font-bold text-xl tracking-tight">HireAI</div>
            </div>
          </Link>

          {/* Headline */}
          <div className="mb-12">
            <h2 className="text-4xl font-black text-white leading-tight mb-4" style={{ letterSpacing: '-0.03em' }}>
              The Intelligent Way<br />
              to <span className="gradient-text">Evaluate Talent</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              AI-powered interview platform that evaluates candidates comprehensively, consistently, and without bias.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4 mb-auto">
            {[
              { icon: Zap,     text: 'Structured, multi-round interview framework' },
              { icon: Users,   text: 'Conversational voice AI with natural dialogue' },
              { icon: Shield,  text: 'Objective, standardised candidate evaluation' },
              { icon: ArrowRight, text: 'Comprehensive role-specific skill assessment' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <f.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-slate-300 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <blockquote className="text-slate-300 text-sm leading-relaxed italic mb-4"
              style={{ borderLeft: '2px solid #6366f1', paddingLeft: '1rem' }}>
              &ldquo;HireAI transformed our talent pipeline. We hired a 50-person engineering team in half the time, with measurably better outcomes.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #d946ef)' }}>VK</div>
              <span className="text-slate-400 text-sm">Vikram Kapoor, VP Engineering, ScaleAI India</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL (glass form) ─── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* The glass card */}
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
              <h1 className="text-3xl font-black text-white mb-2" style={{ letterSpacing: '-0.025em' }}>Welcome back</h1>
              <p className="text-slate-400 font-medium text-sm">
                New to HireAI?{' '}
                <Link href={`/auth/register?role=${role}`}
                  className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                  Create a free account
                </Link>
              </p>
            </div>

            {/* Role Toggle */}
            <div className="flex rounded-2xl p-1 mb-7"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {['recruiter', 'candidate'].map(r => (
                <Link key={r} href={`/auth/login?role=${r}`}
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
                  {r}
                </Link>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  className="glass-input-dark w-full px-4 py-3.5 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-300">Password</label>
                  <Link href="/auth/forgot-password"
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="glass-input-dark w-full px-4 py-3.5 rounded-xl text-sm font-medium pr-12"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 text-white font-bold py-4 rounded-2xl transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)',
                  boxShadow: '0 8px 28px rgba(99,102,241,0.45), 0 2px 8px rgba(99,102,241,0.3)',
                }}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {loadingMsg}</>  
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Social/OAuth login removed for AWS-only setup */}
            <p className="text-center text-xs text-slate-500 mt-8">
              By signing in, you agree to our{' '}
              <a href="#" className="text-indigo-400 hover:underline font-medium">Terms</a> and{' '}
              <a href="#" className="text-indigo-400 hover:underline font-medium">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0c1e' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
