'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import {
  Search, Sparkles, Loader2, FileText, BookOpen,
  Briefcase, User, ChevronRight, Zap, AlertCircle, CheckCircle2, Shield
} from 'lucide-react'

const EXAMPLE_QUERIES = [
  'Senior Python developer with ML experience, 5+ years',
  'Frontend engineer who knows React and TypeScript, open to remote',
  'Full-stack developer with Node.js and PostgreSQL background',
  'Data scientist with fintech experience and strong SQL skills',
  'DevOps engineer with AWS, Kubernetes, and CI/CD expertise',
]

const scoreRing = (score: number) =>
  score >= 80 ? 'text-red-400 bg-red-950/50 border border-red-500/30' :
  score >= 60 ? 'text-orange-400 bg-orange-950/50 border border-orange-500/30' :
  score >= 40 ? 'text-amber-400 bg-amber-950/50 border border-amber-500/30' :
  'text-slate-400 bg-slate-900/50 border border-slate-700/30'

export default function AISearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (q?: string) => {
    const searchQuery = q || query
    if (!searchQuery.trim() || searchQuery.trim().length < 5) {
      setError('Please describe what kind of candidate you need.')
      return
    }
    setError('')
    setLoading(true)
    setResults(null)
    try {
      const token = localStorage.getItem('firedin_token')
      const API_URL = getApiUrl()
      const res = await fetch(`${API_URL}/api/v1/search/candidates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: searchQuery, limit: 20 })
      })
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data)
      if (q) setQuery(q)
    } catch (err) {
      setError('Search failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-red-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.25em] text-red-500">
              AI Candidate Finder &bull; Tactical Intelligence
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase font-poppins">
            Find Your <span className="text-red-500">Verified</span> Talent
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-2 max-w-xl">
            Describe your requirement in natural language. Our pgvector engine performs high-precision semantic matching over candidate resumes, logged work stories, and verified interview transcripts.
          </p>
        </div>
      </div>

      {/* Search Console */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl p-6">
        <div className="relative mb-4">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSearch())}
            placeholder={`Describe your ideal candidate...\n\nExample: "Senior Python developer with 5+ years experience, based in Bangalore, strong in FastAPI and PostgreSQL."`}
            className="w-full min-h-[120px] pl-4 pr-4 py-3.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none text-sm text-white placeholder:text-slate-500 font-medium resize-none transition-all"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-4 bg-red-950/40 px-4 py-2.5 rounded-xl border border-red-500/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] text-sm uppercase tracking-wider"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Querying Embeddings...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Run Vector Search</>
            )}
          </button>
          {results && (
            <span className="text-sm text-slate-400 font-semibold uppercase tracking-wider">
              {results.total_found} high-signal matches found
            </span>
          )}
        </div>

        {/* Examples */}
        <div className="mt-6 pt-5 border-t border-slate-900">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Pre-engineered queries</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map(q => (
              <button
                key={q}
                onClick={() => handleSearch(q)}
                className="text-xs font-bold text-red-400 bg-red-950/30 hover:bg-red-950/60 border border-red-500/20 px-3.5 py-2 rounded-lg transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Intent breakdown */}
      {results?.intent && (
        <div className="bg-slate-950 border border-red-500/10 rounded-2xl p-5 shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-500 mb-3">Intent extraction intelligence</p>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-300">
            {results.intent.skills?.length > 0 && (
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                🛠 SKILLS: <span className="text-red-400">{results.intent.skills.join(', ')}</span>
              </span>
            )}
            {results.intent.min_years && (
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                📅 MIN EXPERIENCE: <span className="text-red-400">{results.intent.min_years} years</span>
              </span>
            )}
            {results.intent.role_keywords?.length > 0 && (
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                💼 ROLE TARGET: <span className="text-red-400">{results.intent.role_keywords.join(', ')}</span>
              </span>
            )}
            {results.intent.domains?.length > 0 && (
              <span className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                🏢 DOMAINS: <span className="text-red-400">{results.intent.domains.join(', ')}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results grid/list */}
      {results?.results?.length > 0 && (
        <div className="space-y-4">
          {results.results.map((c: any, idx: number) => {
            const isVerified = c.verification_status === 'completed' || c.verification_status === 'verified';
            return (
              <div
                key={c.id}
                className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                  isVerified
                    ? 'bg-slate-950 border-2 border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.15)] hover:border-red-500 hover:shadow-[0_0_40px_rgba(239,68,68,0.25)]'
                    : 'bg-slate-950 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Neon Verification Badge */}
                {isVerified && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-red-600 to-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-bl-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-aggressive-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>FiredIn-Verified Candidate</span>
                  </div>
                )}

                <div className="flex flex-col md:flex-row items-start gap-5">
                  {/* Rank & Avatar */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="text-[11px] font-black text-slate-500">MATCH RANK #{idx + 1}</div>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-black text-lg shadow-inner">
                      {c.initials}
                    </div>
                  </div>

                  {/* Core details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="font-black text-white text-lg tracking-tight font-poppins">{c.name}</h3>
                      <div className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-lg ${scoreRing(c.match_score)}`}>
                        {c.match_score}% MATCH VALUE
                      </div>
                      {isVerified && c.verification_score && (
                        <div className="text-xs font-bold text-red-400 bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded-lg">
                          INTERVIEW RATING: {c.verification_score.toFixed(0)}%
                        </div>
                      )}
                    </div>

                    {c.headline && (
                      <p className="text-sm text-slate-300 font-medium mb-3">{c.headline}</p>
                    )}

                    {/* Quick metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-bold mb-4">
                      {c.experience_years > 0 && (
                        <span className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-lg">
                          <Briefcase className="w-3.5 h-3.5 text-red-500" />
                          {c.experience_years} Yrs Experience
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-lg">
                        📍 {c.location || 'Remote'}
                      </span>
                      {c.story_count > 0 && (
                        <span className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-lg text-red-400">
                          <BookOpen className="w-3.5 h-3.5 text-red-500" />
                          {c.story_count} Verified Logged Stories
                        </span>
                      )}
                    </div>

                    {/* Match explanation block */}
                    {c.match_reason && (
                      <div className="mb-4 p-3 bg-red-950/20 border border-red-500/10 rounded-xl font-mono text-[11px] text-red-200">
                        <span className="text-red-500 font-bold">▶ [MATCH INTELLIGENCE]:</span> {c.match_reason}
                      </div>
                    )}

                    {/* Technical Skills */}
                    {c.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {c.skills.slice(0, 8).map((skill: string) => (
                          <span key={skill} className="text-[10px] font-extrabold text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Daily Work stories tags */}
                    {c.story_tags?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-900">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Commits:</span>
                        {c.story_tags.slice(0, 5).map((tag: string) => (
                          <span key={tag} className="text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-500/20 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Console */}
                  <div className="flex flex-row md:flex-col gap-2.5 flex-shrink-0 w-full md:w-auto">
                    {c.resume_url && (
                      <a
                        href={c.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2.5 rounded-xl transition-all"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        View CV
                      </a>
                    )}
                    <Link
                      href={`/recruiter/candidates?q=${c.name}`}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 px-4 py-2.5 rounded-xl transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] uppercase tracking-wider"
                    >
                      Console <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {results?.results?.length === 0 && (
        <div className="text-center py-16 bg-slate-950 rounded-2xl border border-slate-900 shadow-xl">
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="font-black text-white uppercase tracking-wider">No direct matches</p>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Our search engine couldn't resolve a fit. Try clarifying tech stack keywords or expanding experience bounds.
          </p>
        </div>
      )}
    </div>
  )
}
