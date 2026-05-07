'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { getApiUrl } from '@/lib/api'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

import { Suspense } from 'react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || 'candidate'

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // AWS-only mode: social login callback is not supported in this build.
        // Keep this route to avoid 404s from old OAuth redirects.
        toast.error('Social login is not supported. Please use email/password login.')
        router.push(`/auth/login?role=${role}`)
      } catch (err: any) {
        console.error('Auth callback error:', err)
        toast.error('Social authentication failed. Please try again.')
        router.push('/auth/login')
      }
    }

    handleCallback()
  }, [router, role])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="flex justify-center">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 tracking-tight">Completing authentication...</h1>
        <p className="text-surface-500 text-sm">Please wait while we sync your profile and prepare your dashboard.</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-brand-600 animate-spin" /></div>}>
      <AuthCallbackContent />
    </Suspense>
  )
}
