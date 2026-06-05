'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { jobsApi, verificationApi } from '@/services/api'
import { 
  Search, MapPin, Clock, Briefcase, 
  ChevronRight, Sparkles, Zap, Building2,
  DollarSign, GraduationCap, Brain, Share2, Linkedin, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function CandidateJobsPage() {
  const [search, setSearch] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isVerified, setIsVerified] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await jobsApi.list({ is_active: 'true' })
        setJobs(response)
      } catch (err) {
        toast.error('Failed to load jobs')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    const checkVerification = async () => {
      const token = localStorage.getItem('firedin_token')
      if (!token) return
      try {
        const res = await verificationApi.status()
        setIsVerified(res.verified === true)
      } catch {
        setIsVerified(false)
      }
    }
    fetchJobs()
    checkVerification()
  }, [])

  const generateJobSchema = (job: any) => {
    return {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "title": job.title,
      "description": job.description || "Join our team at FiredIn.",
      "datePosted": job.created_at || new Date().toISOString(),
      "validThrough": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      "employmentType": job.job_type === 'full_time' ? 'FULL_TIME' : 'CONTRACTOR',
      "hiringOrganization": {
        "@type": "Organization",
        "name": "FiredIn",
        "sameAs": window.location.origin
      },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": job.location || "Remote",
          "addressCountry": "IN"
        }
      },
      "baseSalary": {
        "@type": "MonetaryAmount",
        "currency": "INR",
        "value": {
          "@type": "QuantitativeValue",
          "value": job.salary_min || 0,
          "minValue": job.salary_min || 0,
          "maxValue": job.salary_max || 0,
          "unitText": "YEAR"
        }
      }
    }
  }

  const handleShare = (job: any, platform: 'linkedin' | 'whatsapp') => {
    const jobUrl = `${window.location.origin}/candidate/jobs?id=${job.id}`
    const text = `I found a great job: ${job.title}!\n📍 ${job.location || 'Remote'} | ${job.job_type?.replace('_', ' ') || 'Full-time'}\n\nCheck it out on FiredIn.`
    
    let url = ''
    if (platform === 'linkedin') {
      const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text + '\n\n👉 Apply here: ' + jobUrl)}`
      const w = 600, h = 650
      const left = Math.max(0, (window.screen.width - w) / 2)
      const top = Math.max(0, (window.screen.height - h) / 2)
      window.open(shareUrl, 'linkedin-share', `width=${w},height=${h},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1`)
      return
    } else if (platform === 'whatsapp') {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n\n👉 Apply here: ' + jobUrl)}`
    }
    
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const filteredJobs = (jobs || []).filter(job => {
    if (!job) return false;
    const searchLower = (search || '').toLowerCase();
    return (
      (job.title || '').toLowerCase().includes(searchLower) ||
      (job.department || '').toLowerCase().includes(searchLower) ||
      (job.location || '').toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-surface-100 pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-5" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">AI-Powered Career Opportunities</span>
              </div>
              <h1 className="text-4xl font-black text-surface-900 font-display tracking-tight mb-4">
                Find Your Next <span className="gradient-text">Great Role</span>
              </h1>
              <p className="text-surface-600 font-medium leading-relaxed">
                Explore open positions at top companies and experience a faster, fairer recruitment process powered by advanced AI screening.
              </p>
            </div>
            
            <div className="w-full md:w-96 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 group-focus-within:text-brand-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search by title, skills, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-surface-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium text-surface-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-surface-100 animate-pulse">
                <div className="w-12 h-12 bg-surface-100 rounded-2xl mb-4" />
                <div className="h-6 bg-surface-100 rounded-full w-3/4 mb-3" />
                <div className="h-4 bg-surface-50 rounded-full w-1/2 mb-6" />
                <div className="space-y-2">
                  <div className="h-3 bg-surface-50 rounded-full" />
                  <div className="h-3 bg-surface-50 rounded-full w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-surface-100 shadow-sm">
            <div className="w-20 h-20 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-surface-300" />
            </div>
            <h3 className="text-xl font-bold text-surface-900 mb-2">No jobs found matching your criteria</h3>
            <p className="text-surface-500">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <div key={job.id} className="group bg-white rounded-3xl border border-surface-100 shadow-sm hover:shadow-card-hover transition-all duration-300 p-6 flex flex-col items-start hover:-translate-y-1">
                <div className="w-14 h-14 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="w-7 h-7 text-brand-600" />
                </div>
                
                <div className="mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-500 bg-brand-50 px-2.5 py-1 rounded-lg">
                    {job.department}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-surface-900 font-display mb-2 group-hover:text-brand-600 transition-colors">
                  {job.title}
                </h3>
                

                
                <div className="space-y-3 mb-6 w-full">
                  <div className="flex items-center gap-2.5 text-sm text-surface-600 font-medium">
                    <MapPin className="w-4 h-4 text-surface-400" />
                    {job.location || 'Remote'}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-surface-900 font-bold">
                    <DollarSign className="w-4 h-4 text-brand-500" />
                    ₹{job.salary_min || 0} – {job.salary_max || 0} LPA
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-surface-600 font-medium">
                    <GraduationCap className="w-4 h-4 text-surface-400" />
                    Min. {job.experience_min || 0} Years Exp.
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-surface-600 font-medium">
                    <Clock className="w-4 h-4 text-surface-400" />
                    {job?.job_type?.replace('_', ' ') || 'Full-time'}
                  </div>
                </div>

                {job.description && (
                  <div className="mb-8 w-full">
                    <p className="text-sm text-surface-500 line-clamp-2 leading-relaxed italic">
                      "{job.description.split('\n')[0].substring(0, 100)}..."
                    </p>
                  </div>
                )}

                <div className="mt-auto w-full pt-6 border-t border-surface-50 flex items-center justify-between gap-4">
                  {/* JSON-LD for Search Engines */}
                  <div className="hidden">
                    <script 
                      type="application/ld+json"
                      dangerouslySetInnerHTML={{ __html: JSON.stringify(generateJobSchema(job)) }}
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleShare(job, 'linkedin')}
                      className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all active:scale-90"
                      title="Share on LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleShare(job, 'whatsapp')}
                      className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all active:scale-90"
                      title="Share on WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Link 
                    href={`/candidate/apply?job_id=${job.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-all shadow-sm active:scale-95 group/btn"
                  >
                    Apply Now
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Featured Section */}
      <div className="max-w-7xl mx-auto px-6 mt-20">
        <div className="bg-surface-900 rounded-[40px] p-8 md:p-12 relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between">
          <div className="absolute inset-0 bg-mesh-gradient opacity-20" />
          <div className="relative z-10 max-w-xl">
            <h2 className="text-3xl font-bold text-white mb-4">Want more insights?</h2>
            <p className="text-surface-400 font-medium mb-8">
              Enable your candidate profile to get personalized job recommendations based on your skills and experience.
            </p>
            <Link href="/auth/register?role=candidate" className="inline-flex items-center gap-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg active:scale-95">
              <Zap className="w-5 h-5 fill-white" />
              Complete Your Profile
            </Link>
          </div>
          <div className="relative z-10 mt-12 md:mt-0 opacity-40 md:opacity-100">
             <div className="w-64 h-64 border-[16px] border-brand-500/20 rounded-full flex items-center justify-center p-8">
                <Brain className="w-32 h-32 text-brand-500" />
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
