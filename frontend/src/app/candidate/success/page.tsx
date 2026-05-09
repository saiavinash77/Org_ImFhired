'use client'

import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Home, Briefcase, BarChart2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function InterviewSuccess() {
  const [scorecardUrl, setScorecardUrl] = useState<string | null>(null)

  useEffect(() => {
    // If the user arrived here via an old redirect, try reading the interview ID stored in sessionStorage
    const id = sessionStorage.getItem('last_interview_id')
    if (id) setScorecardUrl(`/candidate/scorecard/${id}`)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center animate-slide-up-fade">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-8">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Interview Completed!</h1>
        <p className="text-slate-500 leading-relaxed mb-10">
          Thank you for your time. Our AI is now generating your personalised scorecard. It's usually ready within 60 seconds.
        </p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-10 border border-slate-100 flex items-start gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
            <Mail className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Next Steps</div>
            <p className="text-xs text-slate-500 mt-1">
              Your scorecard will appear below once AI analysis is complete. You'll also receive a confirmation email.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {scorecardUrl && (
            <Link
              href={scorecardUrl}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-200"
            >
              <BarChart2 className="w-4 h-4" />
              View My Scorecard
            </Link>
          )}
          <Link
            href="/candidate/jobs"
            className="w-full flex items-center justify-center gap-2 bg-surface-100 hover:bg-surface-200 text-slate-700 font-bold py-4 px-6 rounded-2xl transition-all"
          >
            <Briefcase className="w-4 h-4" />
            Browse More Jobs
          </Link>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-bold py-3 px-6 rounded-2xl transition-all"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <Image src="/imfhired-logo.png" alt="ImFhired" width={32} height={32} className="rounded-lg opacity-40 grayscale" />
        <span className="text-slate-300 font-bold text-sm">Powered by ImFhired</span>
      </div>
    </div>
  )
}
