'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { ShieldCheck, LogOut, LayoutDashboard, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login')
      } else if (role !== 'admin') {
        // Redirect unauthorized users to their respective dashboards
        router.push(role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, role, router])

  if (isLoading || role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <ShieldCheck className="w-12 h-12 text-primary" />
          <p className="text-white font-medium">Verifying Admin Access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-zinc-950 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Admin<span className="text-primary">Ops</span></span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/admin/dashboard" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium"
          >
            <LayoutDashboard className="w-5 h-5" />
            System Overview
          </Link>
          <Link 
            href="#" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-black to-black -z-10" />
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
