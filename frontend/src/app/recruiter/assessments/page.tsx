'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BarChart3, Eye, Search, Shield, Loader2,
  CheckCircle, AlertCircle, AlertTriangle,
  ChevronUp, ChevronDown, Briefcase
} from 'lucide-react'
import { assessmentsApi } from '@/services/api'

// ── Verdict chip ───────────────────────────────────────────────────────────────
function VerdictChip({ verdict }: { verdict: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    strong_hire:    { label: '🚀 Strong Hire',    cls: 'bg-green-100 text-green-800 border-green-200' },
    hire:           { label: '✅ Hire',            cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    no_hire:        { label: '❌ No Hire',         cls: 'bg-red-100 text-red-800 border-red-200' },
    strong_no_hire: { label: '🚫 Strong No Hire', cls: 'bg-red-200 text-red-900 border-red-300' },
  }
  const v = cfg[verdict]
  if (!v) return null
  return (
    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${v.cls}`}>
      {v.label}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'tab_guard') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> Tab Guard
    </span>
  )
  if (status === 'early_exit') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" /> Early Exit
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Completed
    </span>
  )
}

// ── Score cell ────────────────────────────────────────────────────────────────
function ScoreCell({ score, isTabGuard }: { score?: number; isTabGuard?: boolean }) {
  if (isTabGuard) return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-black text-surface-300">—</span>
      <span className="text-[9px] text-surface-300 uppercase tracking-wider">N/A</span>
    </div>
  )
  if (score === null || score === undefined) return (
    <span className="text-sm text-surface-400 italic font-medium">N/A</span>
  )
  const s = Math.round(score)
  const { color, ring } = s >= 85 ? { color: 'text-green-700', ring: 'bg-green-100' }
    : s >= 70 ? { color: 'text-blue-700', ring: 'bg-blue-100' }
    : s >= 50 ? { color: 'text-amber-700', ring: 'bg-amber-100' }
    : { color: 'text-red-700', ring: 'bg-red-100' }
  return (
    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${ring}`}>
      <span className={`text-base font-black ${color}`}>{s}</span>
    </div>
  )
}

// ── Score cell ────────────────────────────────────────────────────────────────
type SortKey = 'overall_score' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function AssessmentListPage() {
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterVerdict, setFilterVerdict] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const res = await assessmentsApi.list()
        setAssessments(res)
      } catch (err) {
        console.error('Failed to fetch assessments', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAssessments()
  }, [])

  // Derive counts
  const counts = {
    all:        assessments.length,
    completed:  assessments.filter(a => (a.detailed_report?.completion_status || 'completed') === 'completed').length,
    early_exit: assessments.filter(a => a.detailed_report?.completion_status === 'early_exit').length,
    tab_guard:  assessments.filter(a => a.detailed_report?.completion_status === 'tab_guard').length,
  }

  const verdictCounts = {
    all:            assessments.length,
    strong_hire:    assessments.filter(a => a.verdict === 'strong_hire').length,
    hire:           assessments.filter(a => a.verdict === 'hire').length,
    no_hire:        assessments.filter(a => a.verdict === 'no_hire').length,
    strong_no_hire: assessments.filter(a => a.verdict === 'strong_no_hire').length,
  }

  // Filter + sort
  const filtered = assessments
    .filter(a => {
      const dr = a.detailed_report || {}
      const status = dr.completion_status || 'completed'
      const name = (dr.candidate_name || a.interviews?.applications?.users?.name || '').toLowerCase()
      const job = (dr.job_title || a.interviews?.applications?.jobs?.title || '').toLowerCase()
      const term = search.toLowerCase()
      const matchSearch = !term || name.includes(term) || job.includes(term)
      const matchStatus = filterStatus === 'all' || status === filterStatus
      const matchVerdict = filterVerdict === 'all' || a.verdict === filterVerdict
      return matchSearch && matchStatus && matchVerdict
    })
    .sort((a, b) => {
      const aVal = sortKey === 'overall_score' ? (a.overall_score || 0) : new Date(a.created_at).getTime()
      const bVal = sortKey === 'overall_score' ? (b.overall_score || 0) : new Date(b.created_at).getTime()
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className={`ml-1 inline-flex flex-col gap-px ${sortKey === col ? 'opacity-100' : 'opacity-30'}`}>
      <ChevronUp className={`w-2.5 h-2.5 ${sortKey === col && sortDir === 'asc' ? 'text-brand-600' : 'text-surface-400'}`} />
      <ChevronDown className={`w-2.5 h-2.5 ${sortKey === col && sortDir === 'desc' ? 'text-brand-600' : 'text-surface-400'}`} />
    </span>
  )

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
      <p className="text-surface-500 text-sm font-medium">Loading assessments...</p>
    </div>
  )

  return (
    <div className="p-6 max-w-screen-xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 mb-1">Recruiter Dashboard</div>
          <h1 className="text-2xl font-black text-surface-900">AI Assessments</h1>
          <p className="text-surface-500 text-sm font-medium mt-1">
            {assessments.length} total candidate{assessments.length !== 1 ? 's' : ''} assessed
          </p>
        </div>

        {/* Summary stats */}
        <div className="flex gap-3">
          {[
            { key: 'strong_hire', count: verdictCounts.strong_hire, color: 'text-green-700 bg-green-50 border-green-200', label: 'Strong Hire 🚀' },
            { key: 'hire', count: verdictCounts.hire, color: 'text-blue-700 bg-blue-50 border-blue-200', label: 'Hire ✅' },
            { key: 'no_hire', count: verdictCounts.no_hire + verdictCounts.strong_no_hire, color: 'text-red-700 bg-red-50 border-red-200', label: 'No Hire ❌' },
          ].map(s => (
            <div key={s.key} className={`flex flex-col items-center px-4 py-2.5 rounded-2xl border ${s.color}`}>
              <span className="text-xl font-black">{s.count}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search + Filters ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-4 mb-5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by candidate name or job title..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 text-sm font-medium text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 bg-surface-50" />
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all',        label: 'All',        count: counts.all },
              { key: 'completed',  label: 'Completed',  count: counts.completed },
              { key: 'early_exit', label: 'Early Exit', count: counts.early_exit },
              { key: 'tab_guard',  label: 'Tab Guard',  count: counts.tab_guard },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all
                  ${filterStatus === f.key
                    ? 'bg-surface-900 text-white border-surface-900 shadow-sm'
                    : 'bg-surface-50 text-surface-600 border-surface-200 hover:border-surface-400'}`}>
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black
                  ${filterStatus === f.key ? 'bg-white/20 text-white' : 'bg-surface-200 text-surface-600'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Verdict filter */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-100">
          <span className="text-xs font-bold text-surface-400 self-center mr-1">Verdict:</span>
          {[
            { key: 'all', label: 'All Verdicts' },
            { key: 'strong_hire', label: '🚀 Strong Hire' },
            { key: 'hire', label: '✅ Hire' },
            { key: 'no_hire', label: '❌ No Hire' },
            { key: 'strong_no_hire', label: '🚫 Strong No Hire' },
          ].map(v => (
            <button key={v.key} onClick={() => setFilterVerdict(v.key)}
              className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-all
                ${filterVerdict === v.key
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-surface-600 border-surface-200 hover:border-surface-400'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-surface-500">Candidate</th>
                <th className="text-left px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-surface-500">Role</th>
                <th className="text-center px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-surface-500">Status</th>
                <th className="text-center px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-surface-500">Rounds</th>
                <th className="text-center px-4 py-3.5 cursor-pointer select-none"
                  onClick={() => toggleSort('overall_score')}>
                  <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-surface-500">
                    Score <SortIcon col="overall_score" />
                  </span>
                </th>
                <th className="text-center px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-surface-500">Verdict</th>
                <th className="text-center px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-surface-500">Integrity</th>
                <th className="text-right px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-surface-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-50">
              {filtered.map(a => {
                const dr = a.detailed_report || {}
                const status = dr.completion_status || 'completed'
                const roundsDone: string[] = dr.rounds_completed || []
                const isTabGuard = status === 'tab_guard'
                const candidateName = dr.candidate_name || a.interviews?.applications?.users?.name || 'Unknown'
                const jobTitle = dr.job_title || a.interviews?.applications?.jobs?.title || 'Unknown Role'
                const integrityScore = dr.security_report?.integrity_score ?? 100
                const integStr = Math.round(integrityScore)

                return (
                  <tr key={a.id}
                    className={`transition-colors hover:bg-surface-50 ${isTabGuard ? 'bg-red-50/30' : ''}`}>

                    {/* Candidate */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm
                          ${isTabGuard ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'}`}>
                          {candidateName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-surface-900 text-sm leading-tight">{candidateName}</div>
                          <div className="text-[10px] text-surface-400 font-medium uppercase tracking-wide mt-0.5">
                            {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                        <span className="text-sm font-semibold text-surface-700 truncate max-w-[160px]">{jobTitle}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <StatusBadge status={status} />
                    </td>

                    {/* Rounds */}
                    <td className="px-4 py-4 text-center">
                      {roundsDone.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {roundsDone.map(r => (
                            <span key={r} className="text-[9px] font-black uppercase tracking-wider bg-brand-50 text-brand-600 border border-brand-100 px-1.5 py-0.5 rounded-full">
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-surface-300 italic">None</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="px-4 py-4 text-center">
                      <ScoreCell score={a.overall_score} isTabGuard={isTabGuard} />
                    </td>

                    {/* Verdict */}
                    <td className="px-4 py-4 text-center">
                      <VerdictChip verdict={a.verdict} />
                    </td>

                    {/* Integrity */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Shield className={`w-4 h-4 ${integStr >= 80 ? 'text-green-500' : integStr >= 50 ? 'text-amber-500' : 'text-red-500'}`} />
                        <span className={`text-sm font-black ${integStr >= 80 ? 'text-green-700' : integStr >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                          {integStr}%
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <Link href={`/recruiter/assessments/${a.interview_id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-3 py-2 rounded-xl transition-all">
                        <Eye className="w-3.5 h-3.5" /> View Report
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-surface-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-surface-400" />
            </div>
            <p className="font-black text-surface-700">No assessments found</p>
            <p className="text-sm text-surface-400 mt-1">
              {search || filterStatus !== 'all' || filterVerdict !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Assessments will appear here once candidates complete their interviews'}
            </p>
          </div>
        )}
      </div>

      {/* Row count */}
      {filtered.length > 0 && (
        <p className="text-xs text-surface-400 text-center mt-4 font-medium">
          Showing {filtered.length} of {assessments.length} assessments
        </p>
      )}
    </div>
  )
}
