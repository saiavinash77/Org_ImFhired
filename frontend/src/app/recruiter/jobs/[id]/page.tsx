'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, MapPin, Briefcase, IndianRupee, Clock, Users, Share2, Linkedin, CheckCircle } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import toast from 'react-hot-toast'

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<any>(null)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const API_URL = getApiUrl()
        const response = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        if (!response.ok) throw new Error('Job not found')
        const data = await response.json()
        setJob(data)
      } catch (err: any) {
        toast.error(err.message)
        router.push('/recruiter/jobs')
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [id, router])

  const handleShareLinkedIn = () => {
    if (!job) return
    const jobUrl = `${window.location.origin}/candidate/jobs?id=${job.id}`
    const text = `🚀 We're hiring: ${job.title}\n📍 ${job.location || 'Remote'} | ${job.job_type?.replace('_', ' ') || 'Full-time'}\n\nApply via FiredIn — AI-powered interviews, instant results.\n\n👉 Apply here: ${jobUrl}`
    const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
    const w = 600, h = 650
    const left = Math.max(0, (window.screen.width - w) / 2)
    const top = Math.max(0, (window.screen.height - h) / 2)
    window.open(shareUrl, 'linkedin-share', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1`)
  }

  const [copied, setCopied] = useState(false)
  const handleCopyLink = () => {
    if (!job) return
    const jobUrl = `${window.location.origin}/candidate/jobs?id=${job.id}`
    navigator.clipboard.writeText(jobUrl)
    setCopied(true)
    toast.success('Job link copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job?')) return
    
    const token = localStorage.getItem('firedin_token')
    if (!token) return toast.error('Auth required')

    try {
      const API_URL = getApiUrl()
      const response = await fetch(`${API_URL}/api/v1/jobs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to delete job')
      toast.success('Job deleted')
      router.push('/recruiter/jobs')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading || !job) {
    return (
      <div className="p-10 text-center text-surface-500 animate-pulse">
        <div className="w-16 h-16 bg-surface-200 rounded-2xl mx-auto mb-4"></div>
        <div className="h-6 w-48 bg-surface-200 rounded mx-auto mb-2"></div>
        <div className="h-4 w-32 bg-surface-200 rounded mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <Link href="/recruiter/jobs" className="flex items-center gap-2 text-sm font-semibold text-surface-600 hover:text-surface-900 mb-6 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold font-display text-surface-900">{job.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${job.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-surface-100 text-surface-600 border border-surface-200'}`}>
                {job.status === 'active' ? 'Live' : job.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-surface-600 font-medium">
              <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-brand-500" /> {job.department}</span>
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-brand-500" /> {job.location}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-500" /> {job.job_type?.replace('_', ' ')}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href={`/recruiter/jobs/${id}/edit`} className="px-5 py-2.5 bg-white border-2 border-surface-200 text-surface-700 font-bold rounded-xl hover:bg-surface-50 hover:border-surface-300 transition-colors flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </Link>
            <button onClick={handleDelete} className="w-11 h-11 flex items-center justify-center bg-white border-2 border-red-100 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-surface-50 rounded-2xl p-5 border border-surface-100">
            <div className="text-surface-500 text-xs font-bold uppercase tracking-wider mb-1">Salary Range</div>
            <div className="text-lg font-bold text-surface-900 flex items-center gap-1.5">
              <IndianRupee className="w-5 h-5 text-surface-400" />
              {job.salary_min && job.salary_max ? `${job.salary_min} - ${job.salary_max} LPA` : 'Not Specified'}
            </div>
          </div>
          <div className="bg-surface-50 rounded-2xl p-5 border border-surface-100">
            <div className="text-surface-500 text-xs font-bold uppercase tracking-wider mb-1">Experience Required</div>
            <div className="text-lg font-bold text-surface-900 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-surface-400" />
              {job.experience_min} - {job.experience_max} Years
            </div>
          </div>
          <div className="bg-brand-50 rounded-2xl p-5 border border-brand-100">
            <div className="text-brand-600 text-xs font-bold uppercase tracking-wider mb-1">Total Applications</div>
            <div className="text-2xl font-black font-display text-brand-900 flex items-center justify-between">
              {job.applications_count || 0}
              <Link href={`/recruiter/candidates?job_id=${id}`} className="text-sm font-bold bg-white text-brand-700 px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-100 transition-colors flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> View
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-lg font-bold font-display text-surface-900 mb-4 border-b border-surface-100 pb-2">Job Description</h2>
              <div className="prose prose-sm max-w-none text-surface-700 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-surface-50 rounded-2xl p-6 border border-surface-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-900 mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.requirements?.map((skill: string) => (
                  <span key={skill} className="px-3 py-1.5 bg-white border border-surface-200 text-surface-700 text-xs font-bold rounded-lg shadow-sm">
                    {skill}
                  </span>
                ))}
                {(!job.requirements || job.requirements.length === 0) && (
                  <span className="text-sm text-surface-500">No specific skills listed.</span>
                )}
              </div>
            </section>

            <section className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-900 mb-4">Post & Share</h2>
              <div className="space-y-3">
                <button
                  onClick={handleShareLinkedIn}
                  className="w-full flex items-center justify-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold py-2.5 rounded-xl transition-colors active:scale-95">
                  <Linkedin className="w-4 h-4" /> Share on LinkedIn
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 bg-white border-2 border-surface-200 hover:bg-surface-50 hover:border-surface-300 text-surface-700 font-semibold py-2.5 rounded-xl transition-colors active:scale-95">
                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
