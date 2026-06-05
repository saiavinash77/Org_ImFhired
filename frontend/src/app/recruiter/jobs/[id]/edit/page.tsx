'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, X, Loader2, Briefcase } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import toast from 'react-hot-toast'

const departments = ['Engineering', 'Product', 'Design', 'Data/AI', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']
const jobTypes = ['full_time', 'part_time', 'contract', 'internship']

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [form, setForm] = useState({
    title: '',
    department: 'Engineering',
    location: '',
    job_type: 'full_time',
    salary_min: '',
    salary_max: '',
    experience_min: '',
    experience_max: '',
    description: '',
  })

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const API_URL = getApiUrl()
        const response = await fetch(`${API_URL}/api/v1/jobs/${id}`)
        if (!response.ok) throw new Error('Job not found')
        const data = await response.json()
        
        setForm({
          title: data.title || '',
          department: data.department || 'Engineering',
          location: data.location || '',
          job_type: data.job_type || 'full_time',
          salary_min: data.salary_min ? String(data.salary_min) : '',
          salary_max: data.salary_max ? String(data.salary_max) : '',
          experience_min: data.experience_min ? String(data.experience_min) : '',
          experience_max: data.experience_max ? String(data.experience_max) : '',
          description: data.description || '',
        })
        setSkills(data.requirements || [])
      } catch (err: any) {
        toast.error(err.message)
        router.push('/recruiter/jobs')
      } finally {
        setLoading(false)
      }
    }
    fetchJob()
  }, [id, router])

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.location) {
      return toast.error('Please fill all required fields.')
    }
    
    const token = localStorage.getItem('firedin_token')
    if (!token) return toast.error('Auth required')

    setSubmitting(true)
    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/v1/jobs/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          requirements: skills,
          department: form.department,
          location: form.location,
          job_type: form.job_type,
          salary_min: parseInt(form.salary_min) || 0,
          salary_max: parseInt(form.salary_max) || 0,
          experience_min: parseInt(form.experience_min) || 0,
          experience_max: parseInt(form.experience_max) || 0,
        }),
      })

      if (!response.ok) throw new Error('Failed to update job')

      toast.success('Job updated successfully!')
      router.push('/recruiter/jobs')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-surface-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /> Loading...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <Link href="/recruiter/jobs" className="flex items-center gap-2 text-sm font-semibold text-surface-700 hover:text-surface-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-surface-900">Edit Job: {form.title}</h1>
        <p className="text-surface-700 font-medium mt-1">Update the details for this position.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
          <h2 className="font-bold text-surface-900 font-display mb-5">Basic Information</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-surface-800 mb-2">Job Title *</label>
              <input
                value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="e.g. Senior React Developer"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-2">Department</label>
              <select
                value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all cursor-pointer"
              >
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-2">Job Type</label>
              <select
                value={form.job_type} onChange={e => setForm({...form, job_type: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all cursor-pointer"
              >
                {jobTypes.map(t => <option key={t} value={t}>{t.replace('_', '-')}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-surface-800 mb-2">Location *</label>
              <input
                value={form.location} onChange={e => setForm({...form, location: e.target.value})}
                placeholder="e.g. Bangalore / Remote"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
              />
            </div>
          </div>
        </div>

        {/* Compensation & Experience */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
          <h2 className="font-bold text-surface-900 font-display mb-5">Compensation & Experience</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-2">Min Salary (₹ LPA)</label>
              <input
                type="number" value={form.salary_min} onChange={e => setForm({...form, salary_min: e.target.value})}
                placeholder="e.g. 20"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-2">Max Salary (₹ LPA)</label>
              <input
                type="number" value={form.salary_max} onChange={e => setForm({...form, salary_max: e.target.value})}
                placeholder="e.g. 35"
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-2">Min Experience (years)</label>
              <input
                type="number" value={form.experience_min} onChange={e => setForm({...form, experience_min: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-2">Max Experience (years)</label>
              <input
                type="number" value={form.experience_max} onChange={e => setForm({...form, experience_max: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
          <h2 className="font-bold text-surface-900 font-display mb-5">Job Description *</h2>
          <textarea
            value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            placeholder="Describe the role, responsibilities, and ideal candidate profile..."
            rows={10}
            className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
          <h2 className="font-bold text-surface-900 font-display mb-2">Required Skills</h2>
          <p className="text-sm text-surface-700 font-medium mb-4">Edit the required skills for this role.</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map(skill => (
              <span key={skill} className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 border border-brand-200 text-sm font-semibold px-3 py-1.5 rounded-xl">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)}>
                  <X className="w-3.5 h-3.5 hover:text-red-500 transition-colors" />
                </button>
              </span>
            ))}
          </div>
          
          <div className="flex gap-2">
            <input
              value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
              placeholder="Add a skill (press Enter)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
            <button type="button" onClick={addSkill}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-sm rounded-xl border border-brand-200 transition-colors">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/recruiter/jobs"
            className="flex-1 text-center py-3.5 rounded-xl border border-surface-200 text-surface-800 hover:bg-surface-50 font-bold text-sm transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg shadow-brand-200">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
