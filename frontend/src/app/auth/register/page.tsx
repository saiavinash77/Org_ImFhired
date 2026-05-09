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
      localStorage.setItem('imfhired_token', data.access_token)
      localStorage.setItem('imfhired_user', JSON.stringify(data.user))
      toast.success('Account created!')
      router.push(role === 'recruiter' ? '/recruiter' : '/candidate/onboarding')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(37,99,235,0.08)' }} />

      <div className="relative w-full max-w-md mx-auto px-4 py-12">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-[9px]">IF</span>
          </div>
          <span className="font-black text-gray-900 text-lg">ImFhired</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>Create your account</h1>
          <p className="text-gray-500 text-sm mb-6">
            Already have an account?{' '}
            <Link href={`/auth/login?role=${role}`} className="text-blue-600 font-semibold hover:text-blue-700">
              Sign in
            </Link>
          </p>

          {/* Role tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
            {['candidate', 'recruiter'].map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2 text-sm font-semibold text-center rounded-lg transition-all ${
                  role === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {r === 'candidate' ? 'Job Seeker' : 'Recruiter'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required
                placeholder="Sai Avinash" className="auth-input" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                placeholder="you@example.com" className="auth-input" />
            </div>
            {role === 'recruiter' && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company Name</label>
                <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                  placeholder="TechCorp India" className="auth-input" />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} required
                  placeholder="Min 8 chars, include a number" className="auth-input pr-12" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">At least 8 characters with one number</p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-colors mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          By signing up you agree to our <a href="#" className="text-blue-600 hover:underline">Terms</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>

      <style jsx global>{`
        .auth-input { width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem; border: 1.5px solid #e5e7eb; background: #f9fafb; font-size: 0.875rem; font-weight: 500; color: #111827; outline: none; transition: all 0.15s; }
        .auth-input:focus { border-color: #2563eb; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .auth-input::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}>
      <RegisterContent />
    </Suspense>
  )
}
