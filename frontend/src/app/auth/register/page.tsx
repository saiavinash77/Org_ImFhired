'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl } from '@/lib/api'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState(searchParams.get('role') || 'candidate')
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', company: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters.')
    if (!/\d/.test(form.password)) return toast.error('Password must contain at least one number.')
    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role,
          company_name: role === 'recruiter' ? form.company : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Registration failed')
      localStorage.setItem('firedin_token', data.access_token)
      localStorage.setItem('firedin_user', JSON.stringify(data.user))
      toast.success('Account created!')
      router.push(role === 'recruiter' ? '/recruiter' : '/candidate/onboarding')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary-50 flex items-center justify-center relative overflow-hidden checkmark-lines-bg">
      <div className="checkmark-lines-content">
      {/* Animated Gradient Blobs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-primary-300/30 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-rose/30 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-15" style={{
        backgroundImage: 'linear-gradient(rgba(0,120,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,120,212,0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative w-full max-w-md mx-auto px-4 py-12 z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 group animate-fade-smooth-slide">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
            <span className="text-white font-black text-[12px]">IF</span>
          </div>
          <span className="font-black font-display text-surface-900 text-2xl tracking-tight">FiredIn</span>
        </Link>

        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-primary-200 shadow-glass hover:shadow-glass-hover transition-smooth duration-500 p-8 relative overflow-hidden animate-slideIn3d">
          {/* Subtle inner gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-black font-display text-surface-900 mb-2 drop-shadow-sm text-aggressive" style={{ letterSpacing: '-0.02em' }}>Create your account</h1>
            <p className="text-surface-600 text-sm mb-8 font-medium">
              Already have an account?{' '}
              <Link href={`/auth/login?role=${role}`} className="text-primary-600 font-bold hover:text-primary-700 underline-stylish transition-colors">
                Sign in
              </Link>
            </p>

            {/* Role tabs */}
            <div className="flex gap-1 p-1.5 bg-primary-50 backdrop-blur-sm rounded-xl mb-8 border border-primary-200">
              {['candidate', 'recruiter'].map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-center rounded-lg transition-smooth capitalize ${
                    role === r ? 'bg-white text-primary-700 shadow-sm border border-primary-300' : 'text-surface-600 hover:text-primary-600'
                  }`}>
                  {r === 'candidate' ? 'Job Seeker' : 'Recruiter'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="animate-fade-smooth-slide" style={{ animationDelay: '0.1s' }}>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required
                  placeholder="Sai Avinash" className="w-full px-5 py-3.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-medium text-surface-900 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-smooth shadow-sm placeholder:text-surface-400" />
              </div>
              <div className="animate-fade-smooth-slide" style={{ animationDelay: '0.15s' }}>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  placeholder="you@example.com" className="w-full px-5 py-3.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-medium text-surface-900 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-smooth shadow-sm placeholder:text-surface-400" />
              </div>
              {role === 'recruiter' && (
                <div className="animate-fade-smooth-slide" style={{ animationDelay: '0.2s' }}>
                  <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2">Company Name</label>
                  <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                    placeholder="TechCorp India" className="w-full px-5 py-3.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-medium text-surface-900 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-smooth shadow-sm placeholder:text-surface-400" />
                </div>
              )}
              <div className="animate-fade-smooth-slide" style={{ animationDelay: '0.25s' }}>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} required
                    placeholder="Min 8 chars, include a number" className="w-full px-5 py-3.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-medium text-surface-900 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-smooth shadow-sm pr-12 placeholder:text-surface-400" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-primary-600 transition-colors">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-widest mt-2">At least 8 characters with one number</p>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] transition-smooth shadow-md hover:shadow-lg hover-lift-3d mt-4 active:scale-95 animate-fade-smooth-slide" style={{ animationDelay: '0.3s' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6 font-medium">
          By signing up you agree to our <a href="#" className="text-primary-600 hover:underline">Terms</a> and <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-smooth-gradient flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>}>
      <RegisterContent />
    </Suspense>
  )
}
