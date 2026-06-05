/**
 * useAuth — Central authentication hook for FiredIn.
 *
 * The single source of truth for:
 *   - Current user data (id, email, role, profile)
 *   - Authentication state (isAuthenticated)
 *   - Auth token for API calls
 *   - Logout function
 *
 * Usage:
 *   const { user, token, role, isAuthenticated, logout } = useAuth()
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface AuthUser {
  id: string
  email: string
  role: 'recruiter' | 'candidate' | 'admin'
  profile?: {
    full_name?: string
    phone?: string
    avatar_url?: string
    company_name?: string
    company_website?: string
    bio?: string
    headline?: string
    skills?: string[]
    resume_url?: string
    experience_years?: number
    parsed_data?: Record<string, unknown>
    onboarding_completed?: boolean
  }
  created_at?: string
}

export interface UseAuthReturn {
  user: AuthUser | null
  token: string | null
  role: 'recruiter' | 'candidate' | 'admin' | null
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => void
  getInitials: () => string
  updateUser: (newData: Partial<AuthUser>) => void
}

import { getApiUrl } from '@/lib/api'

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async () => {
    console.log("[useAuth] Initializing session hydration on load...")
    const storedToken = localStorage.getItem('firedin_token')
    const storedUser = localStorage.getItem('firedin_user')

    if (!storedToken) {
      console.log("[useAuth] No token found in localStorage. User is unauthenticated.")
      setUser(null)
      setToken(null)
      setIsLoading(false)
      return
    }

    console.log("[useAuth] Token found, verifying and fetching fresh profile from backend...")
    let retryCount = 0
    const maxRetries = 5
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch(`${getApiUrl()}/api/v1/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log(`[useAuth] GET /api/v1/auth/me response status: ${response.status}`)
        
        if (response.ok) {
          const freshUser = await response.json()
          console.log("[useAuth] Successfully fetched fresh user profile:", freshUser)
          
          setToken(storedToken)
          setUser(freshUser)
          localStorage.setItem('firedin_user', JSON.stringify(freshUser))
          setIsLoading(false)
          return
        } else if (response.status === 401 || response.status === 403 || response.status === 404) {
          console.error(`[useAuth] Authentication failed with status ${response.status}. Clearing session.`)
          localStorage.removeItem('firedin_token')
          localStorage.removeItem('firedin_user')
          setToken(null)
          setUser(null)
          setIsLoading(false)
          return
        } else {
          throw new Error(`Server returned status ${response.status}`)
        }
      } catch (err: any) {
        retryCount++
        console.warn(`[useAuth] Network error or server error fetching profile (attempt ${retryCount}/${maxRetries}):`, err.message || err)
        if (retryCount >= maxRetries) {
          console.error("[useAuth] Max retries exceeded. Keeping existing local user data to prevent disruption.")
          if (storedUser) {
            try {
              const parsedUser: AuthUser = JSON.parse(storedUser)
              setToken(storedToken)
              setUser(parsedUser)
            } catch {}
          }
          setIsLoading(false)
          return
        }
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }, [])

  useEffect(() => {
    loadUser()
    
    // Listen for manual updates
    const handleUpdate = () => {
      const storedToken = localStorage.getItem('firedin_token')
      const storedUser = localStorage.getItem('firedin_user')
      if (storedToken && storedUser) {
        try {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        } catch {}
      }
    }
    
    window.addEventListener('firedin_user_updated', handleUpdate)
    return () => window.removeEventListener('firedin_user_updated', handleUpdate)
  }, [loadUser])

  const logout = useCallback(() => {
    localStorage.removeItem('firedin_token')
    localStorage.removeItem('firedin_user')
    setUser(null)
    setToken(null)
    router.push('/auth/login')
  }, [router])

  const getInitials = useCallback((): string => {
    if (!user?.profile?.full_name) return 'U'
    const parts = user.profile.full_name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }, [user])

  const updateUser = useCallback((newData: Partial<AuthUser>) => {
    const storedUser = localStorage.getItem('firedin_user')
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      const updatedUser = { ...parsedUser, ...newData }
      if (newData.profile) {
        updatedUser.profile = { ...parsedUser.profile, ...newData.profile }
      }
      localStorage.setItem('firedin_user', JSON.stringify(updatedUser))
      window.dispatchEvent(new Event('firedin_user_updated'))
      setUser(updatedUser)
    }
  }, [])

  return {
    user,
    token,
    role: user?.role ?? null,
    isAuthenticated: !!token && !!user,
    isLoading,
    logout,
    getInitials,
    updateUser,
  }
}
