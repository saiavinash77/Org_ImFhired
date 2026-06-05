/**
 * AuthInitializer Component
 * 
 * Runs on app load to:
 * 1. Check for valid JWT token
 * 2. Call /api/users/me to hydrate user state
 * 3. Redirect authenticated users away from login page
 * 4. Show loading state while checking auth
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getApiUrl } from '@/lib/api'
import { Loader2 } from 'lucide-react'

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthInitializer] Starting auth initialization...')

      try {
        const token = localStorage.getItem('firedin_token')

        if (!token) {
          console.log('[AuthInitializer] No token found. User is not authenticated.')
          setIsReady(true)
          return
        }

        console.log('[AuthInitializer] Token found. Validating with backend...')

        // Validate token
        const response = await fetch(`${getApiUrl()}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const user = await response.json()
          console.log('[AuthInitializer] Token is valid. User:', user.id)

          // Store user in localStorage
          localStorage.setItem('firedin_user', JSON.stringify(user))
          window.dispatchEvent(new Event('firedin_user_updated'))

          // If user is on login/register page and is authenticated, redirect to dashboard
          if (pathname === '/auth/login' || pathname === '/auth/register') {
            console.log('[AuthInitializer] User is authenticated but on auth page. Redirecting to dashboard.')
            const role = user.role || 'candidate'
            const isComplete = user.profile?.onboarding_completed === true

            if (role === 'recruiter' || role === 'admin') {
              router.push('/dashboard/recruiter')
            } else if (isComplete) {
              router.push('/dashboard/candidate')
            } else {
              router.push('/candidate/onboarding')
            }
            return
          }
        } else if (response.status === 401) {
          console.log('[AuthInitializer] Token is invalid or expired. Clearing session.')
          localStorage.removeItem('firedin_token')
          localStorage.removeItem('firedin_user')
        }
      } catch (err: any) {
        console.error('[AuthInitializer] Error during auth initialization:', err.message || err)
        // Continue anyway - let the app handle it
      } finally {
        setIsReady(true)
      }
    }

    initializeAuth()
  }, [pathname, router])

  // Show loading state while checking auth
  if (!isReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
