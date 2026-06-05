'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl } from '@/lib/api'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const role = searchParams.get('role') || 'candidate'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill in all fields.')
    setLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      console.log(`[Auth Flow] Login: Initiating login request for ${form.email}...`)
      const res = await fetch(`${getApiUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      
      const token = data.access_token
      console.log("[Auth Flow] Login: Cognito authentication success. Custom token received:", token)

      // Store token immediately so subsequent requests can use it
      localStorage.setItem('firedin_token', token)
      
      // Step 2: Fetch fresh profile immediately before redirecting anywhere
      console.log("[Auth Flow] Login: Making immediate GET /api/v1/auth/me request to sync user state...")
      
      let profileResponse = null
      let userProfile = null
      let retryAttempts = 0
      const maxAttempts = 3
      
      while (retryAttempts < maxAttempts) {
        try {
          const profileRes = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          console.log(`[Auth Flow] Login: /api/v1/auth/me response status: ${profileRes.status}`)
          
          if (profileRes.ok) {
            userProfile = await profileRes.json()
            profileResponse = profileRes
            break
          } else if (profileRes.status === 404) {
            profileResponse = profileRes
            break
          } else {
            throw new Error(`Server error: status ${profileRes.status}`)
          }
        } catch (fetchErr: any) {
          retryAttempts++
          console.warn(`[Auth Flow] Login: Network error fetching profile (attempt ${retryAttempts}/${maxAttempts}):`, fetchErr.message || fetchErr)
          if (retryAttempts >= maxAttempts) {
            toast.error("Network connectivity issue. Retrying profile lookup...")
            // If it keeps failing, wait and keep trying
            await new Promise(resolve => setTimeout(resolve, 3000))
            retryAttempts = maxAttempts - 1 // keep trying in loop until success
          }
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      }

      toast.success('Welcome back!')

      if (profileResponse && profileResponse.status === 404) {
        // Step 4: Profile does not exist (brand new user) -> show onboarding
        console.log("[Auth Flow] Login: Profile does not exist (404). Redirecting to onboarding to start fresh.")
        localStorage.setItem('firedin_user', JSON.stringify({ ...data.user, profile: null }))
        window.dispatchEvent(new Event('firedin_user_updated'))
        
        const dbRole = data.user?.role || 'candidate'
        if (dbRole === 'recruiter' || dbRole === 'admin') {
          router.push('/recruiter/jobs')
        } else {
          router.push('/candidate/onboarding')
        }
        return
      }

      if (userProfile) {
        localStorage.setItem('firedin_user', JSON.stringify(userProfile))
        window.dispatchEvent(new Event('firedin_user_updated'))
        
        const dbRole = userProfile.role || 'candidate'
        const isComplete = userProfile.profile?.onboarding_completed === true
        
        console.log(`[Auth Flow] Login: Profile loaded. Role: ${dbRole}, Onboarding Completed: ${isComplete}`)
        
        if (dbRole === 'recruiter' || dbRole === 'admin') {
          // Recruiter goes to dashboard
          console.log("[Auth Flow] Login: Redirecting Recruiter to /recruiter/jobs.")
          router.push('/recruiter/jobs')
        } else {
          // Candidate
          if (isComplete) {
            // Step 3: Complete profile -> redirect directly to candidate dashboard
            console.log("[Auth Flow] Login: Candidate profile is complete. Redirecting directly to /candidate/dashboard.")
            router.push('/candidate/dashboard')
          } else {
            // Step 5: Incomplete profile -> resume from where they left off
            console.log("[Auth Flow] Login: Candidate profile is incomplete. Redirecting to onboarding with resume=true.")
            router.push('/candidate/onboarding?resume=true')
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') toast.error('Request timed out. Is the backend running?')
      else toast.error(err.message || 'Invalid email or password.')
      localStorage.removeItem('firedin_token')
    } finally {
      clearTimeout(timeoutId)
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
            <h1 className="text-3xl font-black font-display text-surface-900 mb-2 drop-shadow-sm text-aggressive" style={{ letterSpacing: '-0.02em' }}>Welcome back</h1>
            <p className="text-surface-600 text-sm mb-8 font-medium">
              Don't have an account?{' '}
              <Link href={`/auth/register?role=${role}`} className="text-primary-600 font-bold hover:text-primary-700 underline-stylish transition-colors">
                Sign up free
              </Link>
            </p>

            {/* Role tabs */}
            <div className="flex gap-1 p-1.5 bg-primary-50 backdrop-blur-sm rounded-xl mb-8 border border-primary-200">
              {['candidate', 'recruiter'].map(r => (
                <Link key={r} href={`/auth/login?role=${r}`}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-center rounded-lg transition-smooth capitalize ${
                    role === r ? 'bg-white text-primary-700 shadow-sm border border-primary-300' : 'text-surface-600 hover:text-primary-600'
                  }`}>
                  {r === 'candidate' ? 'Job Seeker' : 'Recruiter'}
                </Link>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="animate-fade-smooth-slide" style={{ animationDelay: '0.1s' }}>
                <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest mb-2">Email</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-5 py-3.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-medium text-surface-900 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-smooth shadow-sm placeholder:text-surface-400" />
              </div>
              <div className="animate-fade-smooth-slide" style={{ animationDelay: '0.2s' }}>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-black text-surface-500 uppercase tracking-widest">Password</label>
                  <Link href="/auth/forgot-password" className="text-[10px] text-primary-600 font-bold uppercase tracking-widest hover:text-primary-700 underline-stylish transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-5 py-3.5 rounded-xl border border-primary-200 bg-primary-50 text-sm font-medium text-surface-900 focus:outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-smooth shadow-sm pr-12 placeholder:text-surface-400" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-primary-600 transition-colors">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] transition-smooth shadow-md hover:shadow-lg hover-lift-3d mt-4 active:scale-95 animate-fade-smooth-slide" style={{ animationDelay: '0.3s' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-surface-500 mt-6">
          By signing in you agree to our <a href="#" className="text-primary-600 hover:underline">Terms</a> and <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-smooth-gradient flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
