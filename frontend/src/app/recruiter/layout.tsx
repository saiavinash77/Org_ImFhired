'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  LayoutDashboard, Briefcase, Users, BarChart3, 
  Settings, LogOut, Bell, ChevronDown, Search, Menu, X,
  TrendingUp, Plus, Sparkles, Globe
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AuthGuard from '@/components/AuthGuard'
import AIAssistantWidget from '@/components/AIAssistantWidget'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  { href: '/recruiter', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/recruiter/jobs', icon: Briefcase, label: 'Job Postings' },
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
  const companyInitials = companyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const userRole = user?.profile?.headline ?? 'Recruiter'

  const handleLogout = () => {
    logout()
    router.push('/auth/login?role=recruiter')
  }

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const params = new URLSearchParams(searchParams.toString())
      if (searchQuery) {
        params.set('q', searchQuery)
      } else {
        params.delete('q')
      }
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  return (
    <div className="min-h-screen flex page-bg" style={{ minHeight: '100vh' }}>

      {/* ─── Ambient Orbs (behind everything) ─── */}
      <div className="orb orb-brand animate-orb"      style={{ width: 500, height: 500, top: '-120px',   right: '-80px',  opacity: 0.9 }} />
      <div className="orb orb-accent animate-orb-slow" style={{ width: 380, height: 380, bottom: '60px',  right: '120px',  opacity: 0.7 }} />
      <div className="orb orb-blue  animate-orb"      style={{ width: 420, height: 420, bottom: '-100px', left: '-60px',   opacity: 0.8, animationDelay: '4s' }} />

      {/* ─── SIDEBAR ─── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: 'rgba(8, 12, 30, 0.88)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.25), inset -1px 0 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Logo */}
        <div className="h-[68px] flex items-center px-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <Link href="/recruiter" className="flex items-center gap-2.5 group">
            <Image src="/hireai-logo.png" alt="HireAI" width={36} height={36} className="rounded-xl object-cover logo-glow group-hover:scale-105 transition-transform" />
            <div>
              <div className="text-white font-bold text-sm leading-tight">HireAI</div>
              <div className="text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>Recruitment Platform</div>
            </div>
          </Link>
        </div>

        {/* Company Selector */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-indigo-300"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
              {companyInitials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-white truncate">{companyName}</div>
              <div className="text-xs" style={{ color: 'rgba(100,116,139,0.8)' }}>Pro Plan</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(100,116,139,0.6)' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="text-xs font-bold uppercase tracking-[0.1em] px-3 mb-3" style={{ color: 'rgba(100,116,139,0.6)' }}>Main Menu</div>
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/recruiter' && pathname.startsWith(href))
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active ? 'text-white' : 'hover:bg-white/5'
                }`}
                style={active
                  ? {
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(217,70,239,0.12) 100%)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.15)',
                    }
                  : { color: 'rgba(148,163,184,0.75)', border: '1px solid transparent' }
                }>
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-indigo-400' : ''}`} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#818cf8' }} />}
              </Link>
            )
          })}
          
          <div className="pt-4 mt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-all duration-150"
              style={{ color: 'rgba(148,163,184,0.75)', border: '1px solid transparent' }}>
              <Globe className="w-4 h-4 flex-shrink-0" />
              Public Homepage
            </Link>
          </div>
        </nav>

        {/* AI Badge */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button 
            onClick={() => setAssistantOpen(true)}
            className="w-full text-left px-3 py-2.5 rounded-xl mb-2 transition-transform hover:scale-[1.02] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(217,70,239,0.12) 100%)',
              border: '1px solid rgba(99,102,241,0.22)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300">AI Assistant</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(100,116,139,0.8)' }}>Get instant insights on any candidate or role.</p>
          </button>
        </div>

        {/* User Profile */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
            style={{ border: '1px solid transparent' }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)' }}
            >
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{displayName}</div>
              <div className="text-xs truncate" style={{ color: 'rgba(100,116,139,0.8)' }}>{userRole}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-red-400/10"
              style={{ color: 'rgba(100,116,139,0.7)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(100,116,139,0.7)')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Glass Topbar */}
        <header className="h-[68px] flex items-center gap-4 px-6 sticky top-0 z-20 glass-topbar">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-surface-500 hover:text-surface-800 transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Glass Search */}
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                placeholder="Search candidates, roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-surface-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Glass Notification Bell */}
            <NotificationBell />
            
            {/* Post Job */}
            <Link href="/recruiter/jobs/new"
              className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95 btn-primary"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)', boxShadow: '0 4px 14px rgba(99,102,241,0.38)' }}>
              <Plus className="w-4 h-4" />
              Post Job
            </Link>
          </div>
        </header>

            {/* Page Content */}
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
