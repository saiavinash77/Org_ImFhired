'use client'

import { useState, useEffect } from 'react'
import { getApiUrl } from '@/lib/api'
import Link from 'next/link'
import {
  Briefcase, Users, CheckCircle, Clock, TrendingUp,
  ArrowUpRight, ArrowRight, Video, Star, ChevronRight,
  Zap, BarChart3, Calendar, Sparkles, Loader2, Search
} from 'lucide-react'

import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { analyticsApi, searchApi } from '@/services/api'

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  applied:      { label: 'Applied',     bg: 'rgba(100,116,139,0.1)',color: '#64748b' },
  screening:    { label: 'Screening',   bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  invited:      { label: 'Invited',     bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9' },
  scheduled:    { label: 'Scheduled',   bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  interviewing: { label: 'Interviewing',bg: 'rgba(168,85,247,0.1)', color: '#a855f7' },
  interviewed:  { label: 'Interviewed', bg: 'rgba(217,70,239,0.1)', color: '#d946ef' },
  offered:      { label: 'Offered',     bg: 'rgba(34,197,94,0.1)',  color: '#22c55e' },
  rejected:     { label: 'Rejected',    bg: 'rgba(239,68,68,0.09)', color: '#ef4444' },
}

const getIconComp = (iconName: string) => {
  switch (iconName) {
    case 'Briefcase': return Briefcase;
    case 'Users': return Users;
    case 'Video': return Video;
    case 'CheckCircle': return CheckCircle;
    default: return Briefcase;
  }
}

export default function RecruiterDashboard() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const query = searchParams.get('q')?.toLowerCase() || ''
  
  const firstName = user?.profile?.full_name?.split(' ')[0] ?? 'Recruiter'
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [interviews, setInterviews] = useState<any[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchDashboard = async () => {
      try {
        const data: any = await analyticsApi.getDashboard()
        if (isMounted) {
          setStats(data.stats || [])
          setCandidates(data.recentCandidates || [])
          setInterviews(data.upcomingInterviews || [])
        }
      } catch (err) {
        if (isMounted) console.error('Failed to fetch dashboard data', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    
    // Initial fetch
    fetchDashboard()

    // In AWS mode we avoid Supabase realtime; dashboard refreshes via
    // initial fetch and subsequent page navigations.
    return () => {
      isMounted = false
    }
  }, [])

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  if (loading) {
    return (
      <div className="h-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="text-surface-500 font-medium">Loading Dashboard...</p>
      </div>
    )
  }

  const filteredCandidates = candidates.filter(c => 
    (c.name || '').toLowerCase().includes(query) || 
    (c.role || '').toLowerCase().includes(query)
  )

  const filteredInterviews = interviews.filter(iv => 
    (iv.candidate || '').toLowerCase().includes(query) || 
    (iv.role || '').toLowerCase().includes(query)
  )

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-black font-display text-surface-900 tracking-tight">Good morning, {firstName} 👋</h1>
          <p className="text-surface-500 font-medium mt-1 text-sm">Here's what's happening with your hiring today.</p>
          
          {/* Main Dashboard Search Bar */}
          <div className="mt-6 max-w-2xl relative group">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-surface-400 group-focus-within:text-brand-500 transition-colors" />
             </div>
             <input
                type="text"
                placeholder="Search candidates by name, skills, or role..."
                className="block w-full pl-12 pr-4 py-4 bg-white border border-surface-200 rounded-2xl leading-5 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium text-base shadow-sm"
                value={query}
                onChange={(e) => {
                  const val = e.target.value
                  const params = new URLSearchParams(window.location.search)
                  if (val) params.set('q', val)
                  else params.delete('q')
                  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
                  // Trigger local state update if needed, though searchParams hook will catch it on re-render
                  window.location.reload() // Simple way to trigger refresh for MVP
                }}
             />
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <kbd className="hidden sm:inline-flex items-center px-2 py-1 border border-surface-200 rounded-lg text-[10px] font-bold text-surface-400 bg-surface-50">
                  ⌘ K
                </kbd>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="glass-card flex items-center gap-2 text-sm text-surface-700 font-semibold px-4 py-3" style={{ borderRadius: '1rem' }}>
            <Calendar className="w-4 h-4 text-brand-500" />
            {formattedDate}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => {
          const IconC = getIconComp(s.icon)
          return (
            <div
              key={s.label}
              className={`glass-card ${s.accent} p-5 animate-slide-up-fade`}
              style={{ animationDelay: `${i * 80}ms`, opacity: 0, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.iconBg }}>
                  <IconC className="w-5 h-5" style={{ color: s.iconColor }} />
                </div>
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={s.trend === 'up'
                    ? { background: 'rgba(34,197,94,0.12)', color: '#16a34a' }
                    : { background: 'rgba(100,116,139,0.1)', color: '#64748b' }
                  }
                >
                  {s.change}
                </span>
              </div>
              <div className="text-2xl font-bold font-display text-surface-900 mb-0.5">{s.value}</div>
              <div className="text-xs text-surface-600 font-semibold uppercase tracking-wider">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Recent Applications */}
        <div className="lg:col-span-2 glass-card overflow-hidden" style={{ padding: 0 }}>
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            <h2 className="font-bold text-surface-900 font-display text-sm">Recent Applications</h2>
            <Link href="/recruiter/candidates"
              className="text-[10px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 transition-colors uppercase tracking-wider">
              View all <ChevronRight className="w-2.5 h-2.5" />
            </Link>
          </div>
          <div>
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((c, i) => (
                <div
                  key={c.name + i}
                  className="px-5 py-2.5 flex items-center gap-3 group transition-all duration-200"
                  style={{
                    borderBottom: i < filteredCandidates.length - 1 ? '1px solid rgba(255,255,255,0.45)' : 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)' }}>
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                       <div className="font-semibold text-surface-900 text-sm truncate">{c.name}</div>
                       {c.is_verified && (
                         <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm flex-shrink-0" title="Verified Professional">
                            <CheckCircle className="w-2.5 h-2.5 text-white stroke-[3px]" />
                         </div>
                       )}
                    </div>
                    <div className="text-xs text-surface-600 font-medium truncate">{c.role}</div>
                  </div>
                  <div className="w-14 text-right shrink-0">
                    <div className={`text-base font-bold font-display leading-none ${c.score >= 70 ? 'text-green-600' : c.score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {c.score > 0 ? Math.round(c.score) : '-'}
                    </div>
                    <div className="text-[8px] text-surface-500 font-bold uppercase tracking-widest mt-0.5">score</div>
                  </div>
                  <div className="w-20 shrink-0 flex justify-center">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full w-full text-center block"
                      style={{ background: statusConfig[c.status]?.bg || statusConfig['applied'].bg, color: statusConfig[c.status]?.color || statusConfig['applied'].color }}
                    >
                      {statusConfig[c.status]?.label || c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-end shrink-0">
                    {c.status === 'screening' || c.status === 'applied' ? (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          const token = localStorage.getItem('firedin_token')
                          const API_URL = getApiUrl()
                          try {
                            const res = await fetch(`${API_URL}/api/v1/applications/${c.id}/invite`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            })
                            if (res.ok) {
                              window.location.reload()
                            }
                          } catch (err) {
                            console.error('Invite failed', err)
                          }
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-all active:scale-95 border border-green-200/50"
                      >
                        <Video className="w-3 h-3" /> INVITE
                      </button>
                    ) : (
                      <div className="text-xs text-surface-500 font-semibold hidden sm:block w-16 text-right">{c.time}</div>
                    )}
                    <Link href={`/recruiter/candidates?q=${c.name}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-5 flex justify-end">
                      <ArrowRight className="w-4 h-4 text-brand-500" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-surface-500 text-sm">No candidates matching "{query}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="glass-card overflow-hidden flex flex-col" style={{ padding: 0 }}>
          <div className="flex items-center justify-between px-5 py-3 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.5)' }}>
            <h2 className="font-bold text-surface-900 font-display text-sm">Upcoming Interviews</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
              {filteredInterviews.length}
            </span>
          </div>
          <div className="p-4 space-y-3 flex-1">
            {filteredInterviews.length > 0 ? (
              filteredInterviews.map((iv, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.75)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #d946ef 100%)' }}>
                    {iv.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-surface-900 text-xs">{iv.candidate}</div>
                    <div className="text-[10px] text-surface-500 font-medium mb-1 truncate">{iv.role}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold text-surface-600"
                        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(226,232,240,0.8)' }}>
                        {iv.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center flex-1 flex flex-col items-center justify-center text-surface-400">
                <Video className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-semibold">No upcoming interviews</p>
              </div>
            )}
            
          </div>
          <div className="p-4 pt-0">
             <Link href="/recruiter/assessments"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-indigo-700 text-sm font-semibold transition-all duration-200 mt-auto"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
              >
                <BarChart3 className="w-4 h-4" />
                View All Assessments
              </Link>
          </div>
        </div>
      </div>


      {/* ── CTA Banner ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-dark) 50%, #c026d3 100%)',
          boxShadow: '0 8px 32px rgba(255,94,42,0.35), 0 2px 8px rgba(255,94,42,0.2)',
        }}>
        {/* Noise overlay for glass texture */}
        <div className="absolute inset-0 noise" style={{ borderRadius: '1rem' }} />
        {/* Inner highlight */}
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent 60%)', pointerEvents: 'none' }} />
        {/* Orb inside banner */}
        <div className="absolute right-0 top-0 w-72 h-72 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', transform: 'translate(40%, -40%)', filter: 'blur(32px)' }} />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text- желтый-300" />
              <h3 className="font-bold text-lg font-display">AI Matching Engine Ready</h3>
            </div>
            <p className="text-brand-100 text-sm">Review your latest applications and shortlist candidates.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/recruiter/candidates"
              className="flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#4f46e5', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
              <Users className="w-4 h-4" />
              Manage Candidates
            </Link>
            <Link href="/recruiter/jobs/new"
              className="flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
              + Post Job
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
