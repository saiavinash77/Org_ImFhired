'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard, Briefcase, Users, BarChart3,
  Settings, LogOut, Search, Menu, X,
  TrendingUp, Plus, Globe
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import AIAssistantWidget from '@/components/AIAssistantWidget'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  { href: '/recruiter', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/recruiter/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/recruiter/candidates', icon: Users, label: 'Candidates' },
  { href: '/recruiter/assessments', icon: BarChart3, label: 'Assessments' },
  { href: '/recruiter/analytics', icon: TrendingUp, label: 'Analytics' },
  { href: '/recruiter/settings', icon: Settings, label: 'Settings' },
]

function RecruiterLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const { user, getInitials, logout } = useAuth()

  const displayName = user?.profile?.full_name ?? user?.email ?? 'Recruiter'
  const companyName = user?.profile?.company_name ?? 'Your Company'
  const initials = getInitials()

  const handleLogout = () => {
    logout()
    router.push('/auth/login?role=recruiter')
  }

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const params = new URLSearchParams(searchParams.toString())
      if (searchQuery) params.set('q', searchQuery)
      else params.delete('q')
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── SIDEBAR ─── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-60 flex flex-col bg-white border-r border-gray-100 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>

        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-gray-100">
          <Link href="/recruiter" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-[9px]">IF</span>
            </div>
            <span className="font-black text-gray-900 text-sm">ImFhired</span>
          </Link>
        </div>

        {/* Company */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-50">
            <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
              {companyName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{companyName}</div>
              <div className="text-[10px] text-gray-400">Recruiter</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/recruiter' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : ''}`} />
                {label}
              </Link>
            )
          })}

          <div className="pt-3 mt-3 border-t border-gray-100">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all">
              <Globe className="w-4 h-4" />
              Homepage
            </Link>
          </div>
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">{displayName}</div>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── MAIN ─── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Topbar */}
        <header className="h-14 flex items-center gap-4 px-6 bg-white border-b border-gray-100 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-400 hover:text-gray-700">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                placeholder="Search candidates, roles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-gray-700 bg-gray-50 border border-gray-200 focus:outline-none focus:border-blue-400 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell />

            <Link href="/recruiter/jobs/new"
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Post Job
            </Link>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

      <AIAssistantWidget isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  )
}

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="recruiter">
      <RecruiterLayoutInner>{children}</RecruiterLayoutInner>
    </AuthGuard>
  )
}
