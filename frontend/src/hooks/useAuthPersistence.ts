/**
 * useAuthPersistence Hook
 * 
 * Handles session persistence across page refreshes.
 * On app load, checks for valid JWT token and hydrates user state.
 * Prevents showing login page to already-authenticated users.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApiUrl } from '@/lib/api'

interface User {
  id: string
  email: string
  role: 'candidate' | 'recruiter' | 'admin'
  profile?: {
    full_name?: string
    onboarding_completed?: boolean
    [key: string]: any
  }
  created_at?: string
}

interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  user: User | null
  token: string | null
  error: string | null
}

export function useAuthPersistence() {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    token: null,
    error: null,
  })

  useEffect(() => {
    const restoreSession = async () => {
      console.log('[Auth Persistence] Checking for existing session on app load...')
      
      try {
        // Check for stored token
        const storedToken = localStorage.getItem('firedin_token')
        const storedUser = localStorage.getItem('firedin_user')

        if (!storedToken) {
          console.log('[Auth Persistence] No token found. User is not authenticated.')
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            error: null,
          })
          return
        }

        console.log('[Auth Persistence] Token found. Validating with backend...')

        // Validate token by calling /api/users/me
        const response = await fetch(`${getApiUrl()}/api/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const user = await response.json()
          console.log('[Auth Persistence] Token is valid. User restored:', user.id)
          
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            user,
            token: storedToken,
            error: null,
          })

          // Dispatch event so other components know user is loaded
          window.dispatchEvent(new Event('firedin_user_updated'))
        } else if (response.status === 401) {
          console.log('[Auth Persistence] Token is invalid or expired. Clearing session.')
          localStorage.removeItem('firedin_token')
          localStorage.removeItem('firedin_user')
          
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            error: 'Session expired. Please log in again.',
          })
        } else {
          throw new Error(`Server error: ${response.status}`)
        }
      } catch (err: any) {
        console.error('[Auth Persistence] Error restoring session:', err.message || err)
        
        // On network error, keep the stored user data but mark as loading
        const storedUser = localStorage.getItem('firedin_user')
        const storedToken = localStorage.getItem('firedin_token')
        
        if (storedUser && storedToken) {
          console.log('[Auth Persistence] Network error, but using cached user data.')
          setAuthState({
            isLoading: false,
            isAuthenticated: true,
            user: JSON.parse(storedUser),
            token: storedToken,
            error: null,
          })
        } else {
          setAuthState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
            error: 'Failed to restore session. Please log in again.',
          })
        }
      }
    }

    restoreSession()
  }, [])

  return authState
}

/**
 * Hook to clear session on logout
 */
export function useClearSession() {
  return () => {
    console.log('[Auth Persistence] Clearing session on logout.')
    localStorage.removeItem('firedin_token')
    localStorage.removeItem('firedin_user')
    window.dispatchEvent(new Event('firedin_user_updated'))
  }
}
