'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return toast.error('Please enter your email.')
    setLoading(true)
    try {
      await fetch(`${getApiUrl()}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      toast.success('Reset code sent! Check your email.')
      setStep('reset')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters.')
    if (!/\d/.test(newPassword)) return toast.error('Password must contain at least one number.')
    setLoading(true)
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/auth/confirm-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Reset failed')
      toast.success('Password reset successfully!')
      router.push('/auth/login')
    } catch (err: any) {
      toast.error(err.message || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(37,99,235,0.08)' }} />

      <div className="relative w-full max-w-md mx-auto px-4 py-12">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-[9px]">IF</span>
          </div>
          <span className="font-black text-gray-900 text-lg">ImFhired</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {step === 'email' ? (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>Reset your password</h1>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send a 6-digit reset code.</p>
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-gray-400" />
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  📧 The reset code will be sent from <strong>no-reply@verificationemail.com</strong> (AWS). Check your spam folder if you don't see it.
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <>Send Reset Code <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => setStep('email')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>Enter reset code</h1>
              <p className="text-gray-500 text-sm mb-6">Check your email at <strong>{email}</strong> for the 6-digit code.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reset Code</label>
                  <input value={code} onChange={e => setCode(e.target.value)} required
                    placeholder="123456" maxLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all text-center tracking-widest text-lg placeholder:text-gray-400 placeholder:tracking-normal placeholder:text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={newPassword}
                      onChange={e => setNewPassword(e.target.value)} required
                      placeholder="Min 8 chars, include a number"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all pr-12 placeholder:text-gray-400" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
