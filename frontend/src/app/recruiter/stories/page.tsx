'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'
import {
  Sparkles, BookOpen, Clock, Tag, Users,
  UserPlus, Briefcase, Loader2, RefreshCw, Filter
} from 'lucide-react'

const timeAgo = (dateStr: string) => {
  const d = new Date(dateStr)
  const now = new Date()
  const h = Math.floor((now.getTime() - d.getTime()) / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const matchColor = (score: number) =>
  score >= 70 ? 'text-green-700 bg-green-50 border-green-200' :
  score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200' :
  'text-slate-600 bg-slate-50 border-slate-200'

const STICKY_COLORS = [
  'bg-amber-100 border-amber-200 text-amber-900',
  'bg-rose-100 border-rose-200 text-rose-900',
  'bg-cyan-100 border-cyan-200 text-cyan-900',
  'bg-emerald-100 border-emerald-200 text-emerald-900',
  'bg-violet-100 border-violet-200 text-violet-900',
  'bg-orange-100 border-orange-200 text-orange-900',
]

export default function StoriesFeedPage() {
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [filterTag, setFilterTag] = useState('')
  const [allTags, setAllTags] = useState<string[]>([])

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('firedin_token')
      const API_URL = getApiUrl()
      const url = filterTag
        ? `${API_URL}/api/v1/stories/feed?tag=${encodeURIComponent(filterTag)}`
        : `${API_URL}/api/v1/stories/feed`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setStories(data)

      const tags = new Set<string>()
      data.forEach((s: any) => (s.ai_tags || []).forEach((t: string) => tags.add(t)))
      setAllTags(Array.from(tags).slice(0, 15))
    } catch (err) {
      console.error('Failed to load stories feed', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFeed() }, [filterTag])

  const toggleSave = (candidateId: string) => {
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(candidateId) ? next.delete(candidateId) : next.add(candidateId)
      return next
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-brand-100 rounded-lg text-brand-600">
               <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-600">
              Work Stories Feed
            </span>
          </div>
          <h1 className="text-3xl font-black text-surface-900">Sticky Notes of Success</h1>
          <p className="text-surface-500 text-sm font-medium mt-2">
            Daily snapshots of what candidates are building right now. 
            AI automatically highlights talent that matches your open roles.
          </p>
        </div>
        <button
          onClick={fetchFeed}
          className="flex items-center gap-2 text-sm font-bold text-surface-700 bg-white border border-surface-200 hover:border-brand-300 px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Wall
        </button>
      </div>

      {/* Tag Wall */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 items-center bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-surface-100">
          <Filter className="w-4 h-4 text-surface-400 mr-2" />
          <button
            onClick={() => setFilterTag('')}
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
              !filterTag ? 'bg-surface-900 text-white shadow-lg' : 'bg-white text-surface-600 border border-surface-200 hover:border-brand-300'
            }`}
          >
            All Notes
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${
                filterTag === tag ? 'bg-brand-600 text-white border-brand-600 shadow-lg' : 'bg-white text-surface-600 border-surface-200 hover:border-brand-300'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid Wall */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
          <p className="text-surface-500 font-bold animate-pulse">Scanning the wall...</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-32 bg-white/50 rounded-4xl border border-dashed border-surface-200">
          <div className="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-surface-300" />
          </div>
          <p className="text-xl font-black text-surface-700">The wall is empty</p>
          <p className="text-surface-400 font-medium mt-2">
            Candidates haven't posted their daily sticky notes yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {stories.map((story, idx) => {
            const isSaved = savedIds.has(story.candidate_id)
            const matchScore = story.match_score || 0
            const hasMatch = matchScore > 0 && story.matched_job
            const colorClass = STICKY_COLORS[idx % STICKY_COLORS.length]
            
            return (
              <div
                key={story.id}
                className={`group relative aspect-square p-5 rounded-sm shadow-xl transition-all duration-300 hover:scale-[1.05] hover:-rotate-1 flex flex-col ${colorClass} overflow-hidden`}
                style={{ 
                  transform: `rotate(${(idx % 3 === 0 ? 1.5 : idx % 3 === 1 ? -1.5 : 0.8)}deg)`,
                  boxShadow: '5px 5px 15px rgba(0,0,0,0.08)'
                }}
              >
                {/* Tape Effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-8 bg-white/30 backdrop-blur-sm -rotate-2 border-x border-black/5" />

                {/* Match Ribbon */}
                {hasMatch && (
                  <div className="absolute top-4 right-[-30px] rotate-45 bg-brand-600 text-white text-[9px] font-black py-1 px-10 shadow-lg border-b border-brand-700">
                    {matchScore}% MATCH
                  </div>
                )}

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4 opacity-60">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {timeAgo(story.created_at)}
                    </span>
                  </div>

                  <p className="text-lg font-bold leading-snug mb-6 font-display line-clamp-6">
                    {story.content}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {(story.ai_tags || []).map((tag: string) => (
                      <span key={tag} className="text-[10px] font-black px-2 py-0.5 rounded-md bg-black/5 border border-black/5">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer / Candidate */}
                <div className="pt-4 border-t border-black/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-xs truncate">
                        {story.full_name}
                      </div>
                      <div className="text-[9px] font-bold opacity-60 truncate">
                        {story.headline || 'Tech Professional'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                       <button 
                        onClick={() => toggleSave(story.candidate_id)}
                        className={`p-2 rounded-xl transition-all ${isSaved ? 'bg-brand-600 text-white' : 'bg-black/5 hover:bg-black/10'}`}
                       >
                         <Tag className="w-3.5 h-3.5" />
                       </button>
                       <Link 
                        href={`/recruiter/search?candidate=${story.candidate_id}`}
                        className="p-2 bg-black/5 hover:bg-black/10 rounded-xl transition-all"
                       >
                         <Users className="w-3.5 h-3.5" />
                       </Link>
                    </div>
                  </div>
                </div>

                {/* Action Button Pop-in */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Link 
                    href={`/recruiter/candidates?q=${story.full_name}`}
                    className="bg-surface-900 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite to Apply
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-surface-400 text-[10px] font-black uppercase tracking-[0.3em] mt-20 pb-10">
        End of the story wall
      </p>
    </div>
  )
}
