'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle, ChevronRight, Zap, Shield, BarChart3, Users, Brain, Star } from 'lucide-react'

const stats = [
  { value: '10×', label: 'Faster Screening' },
  { value: '94%', label: 'Placement Rate' },
  { value: '50K+', label: 'Professionals Verified' },
  { value: '4.9★', label: 'Candidate Satisfaction' },
]

const features = [
  {
    icon: Shield,
    title: 'Verified Badge',
    desc: 'Complete one AI interview. Get a verified badge that travels with every application — so recruiters know you\'re serious before they even open your resume.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Matching',
    desc: 'Your skills and experience are matched against job requirements with semantic AI — not just keyword search. The right jobs find you.',
  },
  {
    icon: Zap,
    title: 'Skip the Queue',
    desc: 'Verified candidates get seen first. No more mass-applying and hearing nothing back. Your profile stands out from day one.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Scorecards',
    desc: 'After every interview, you get a full scorecard — strengths, gaps, and feedback. Know exactly where you stand.',
  },
  {
    icon: Users,
    title: 'Built for Experience',
    desc: 'Not for freshers. Built specifically for professionals with 2+ years who deserve better than starting from scratch on LinkedIn.',
  },
  {
    icon: CheckCircle,
    title: 'One Profile, Many Jobs',
    desc: 'Upload your resume once. Apply to multiple roles with a single click. Your verified profile does the heavy lifting.',
  },
]

const howItWorks = [
  { step: '01', title: 'Create Your Profile', desc: 'Sign up, fill in your experience, skills, and preferences. Takes under 5 minutes.' },
  { step: '02', title: 'Get Verified', desc: 'Complete a short AI interview based on your resume. Pass once, get verified forever.' },
  { step: '03', title: 'Apply with Confidence', desc: 'Your verified badge travels with every application. Recruiters see you\'re pre-vetted.' },
  { step: '04', title: 'Get Hired', desc: 'Recruiters invite you directly. No more mass-applying into the void.' },
]

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── NAVBAR ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white border-b border-gray-100 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">IF</span>
            </div>
            <span className="text-xl font-black text-black tracking-tight">ImFhired</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-black transition-colors">How it works</a>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#for-recruiters" className="hover:text-black transition-colors">For Recruiters</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-semibold text-gray-700 hover:text-black transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/auth/register?role=candidate"
              className="text-sm font-bold text-white px-5 py-2.5 rounded-xl bg-black hover:bg-gray-800 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Azure blue glow top center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(37,99,235,0.07)' }} />

        <div className="relative w-full max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-10 px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
            <div className="w-5 h-5 bg-black rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[8px]">IF</span>
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">The next door for laid off talent and job-switchers</span>
          </div>

          {/* Main headline */}
          <h1 className="font-black text-black leading-none mb-4" style={{
            fontSize: 'clamp(2rem, 5.5vw, 4.5rem)',
            letterSpacing: '-0.04em',
            lineHeight: '0.95',
          }}>
            IF YOU'RE{' '}
            <span className="relative inline-block">
              <span className="relative z-10" style={{ color: '#dc2626' }}>FIRED</span>
              {/* Red glow */}
              <span className="absolute inset-0 blur-2xl opacity-40 rounded-full" style={{ background: '#dc2626', transform: 'scale(1.3)' }} />
              {/* Strikethrough */}
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="block w-full h-1.5 bg-black rounded-full" style={{ transform: 'rotate(-8deg)' }} />
              </span>
            </span>
            ,<br />
            GET READY TO BE<br />
            <span className="relative inline-block">
              HIRED.
              {/* Green underline */}
              <span className="absolute -bottom-2 left-0 right-0 h-2 rounded-full" style={{ background: '#16a34a' }} />
            </span>
          </h1>

          <p className="text-lg text-gray-500 font-medium mt-10 mb-4 max-w-xl mx-auto leading-relaxed">
            Stop mass-applying like a fresher. Get verified once, stand out everywhere.
            Built for experienced professionals who deserve better.
          </p>
          <p className="font-black text-black uppercase tracking-widest mb-10" style={{
            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
            letterSpacing: '0.12em',
          }}>
            The next door for laid off talent and job-switchers
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link href="/auth/register?role=candidate"
              className="flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 active:scale-95"
              style={{ background: '#2563eb', boxShadow: '0 8px 24px rgba(37,99,235,0.3)' }}>
              I'm Looking for Work
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/register?role=recruiter"
              className="flex items-center gap-2 text-blue-700 font-bold px-8 py-4 rounded-2xl text-base border-2 border-blue-200 hover:bg-blue-50 transition-all">
              I'm Hiring
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex -space-x-2">
              {['SK', 'PR', 'AM', 'VK', 'RN'].map((i, idx) => (
                <div key={idx} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: `hsl(${idx * 60 + 200}, 50%, 45%)` }}>{i}</div>
              ))}
            </div>
            <span><strong className="text-black">2,000+</strong> professionals verified this month</span>
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-16 border-y border-blue-50" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.04) 0%, rgba(147,197,253,0.06) 100%)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-black text-blue-700 mb-1">{s.value}</div>
                <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE PROBLEM ─── */}
      <section className="py-24 bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-black text-white mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
            You have 5 years of experience.<br />
            Why are you applying like a fresher?
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed mb-12">
            LinkedIn and Indeed treat everyone the same — your resume is just another PDF in a pile of thousands.
            There's no way to say "I've already been vetted. I'm not a risk." Until now.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { label: 'Before ImFhired', items: ['Mass-applying to 100+ jobs', 'No response for weeks', 'Treated like a fresher', 'No way to stand out'] },
              { label: 'The Gap', items: ['No trust signal', 'No differentiation', 'No verification layer', 'Just a PDF in a pile'] },
              { label: 'With ImFhired', items: ['Verified badge on profile', 'Recruiters come to you', 'Pre-vetted = less risk', 'Apply once, seen everywhere'] },
            ].map((col, i) => (
              <div key={col.label} className={`p-6 rounded-2xl border ${
                i === 2
                  ? 'border-blue-400/30 text-white'
                  : 'border-white/10'
              }`} style={i === 2 ? {
                background: 'linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(59,130,246,0.15) 100%)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 0 32px rgba(37,99,235,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              } : {}}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${i === 2 ? 'text-blue-300' : 'text-gray-500'}`}>{col.label}</div>
                <ul className="space-y-2">
                  {col.items.map(item => (
                    <li key={item} className={`text-sm flex items-start gap-2 ${i === 2 ? 'text-white' : 'text-gray-500'}`}>
                      <span className="mt-1 flex-shrink-0">{i === 2 ? '✓' : '✗'}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 block">The Process</span>
            <h2 className="font-black text-black" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Simple. Fast. Effective.
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((step, i) => (
              <div key={step.step} className="relative">
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%-8px)] w-full h-px border-t-2 border-dashed border-gray-200 z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 text-white rounded-2xl flex items-center justify-center font-black text-sm mb-4" style={{
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                  }}>
                    {step.step}
                  </div>
                  <h3 className="font-bold text-black mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 block">What You Get</span>
            <h2 className="font-black text-black" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Everything you need to get hired faster
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="bg-white p-6 rounded-2xl border border-blue-50 hover:border-blue-200 hover:shadow-md transition-all" style={{ boxShadow: '0 1px 4px rgba(37,99,235,0.06)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(59,130,246,0.08))',
                  border: '1px solid rgba(37,99,235,0.15)',
                }}>
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-bold text-black mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR RECRUITERS ─── */}
      <section id="for-recruiters" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 block">For Recruiters</span>
              <h2 className="font-black text-black mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
                Only see candidates who are already verified
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                Every candidate on ImFhired has passed an AI interview. You're not sifting through unvetted resumes —
                you're choosing from a pool of pre-qualified professionals.
              </p>
              <ul className="space-y-3 mb-8">
                {['AI-scored candidates ranked by fit', 'Full interview scorecards on every profile', 'Invite who you want — no auto-spam', 'Send offers in one click'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?role=recruiter"
                className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-colors" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
                Start Hiring <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: '3×', label: 'Faster time-to-hire' },
                { num: '0', label: 'Unvetted resumes' },
                { num: '94%', label: 'Interview show rate' },
                { num: '8+', label: 'Evaluation dimensions' },
              ].map(v => (
                <div key={v.label} className="rounded-2xl p-5 text-center border border-blue-100" style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(147,197,253,0.08) 100%)',
                }}>
                  <div className="text-3xl font-black text-blue-700 mb-1">{v.num}</div>
                  <div className="text-xs text-gray-500 font-semibold">{v.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-black text-black" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
              Real people. Real results.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Priya S.', role: 'Senior Engineer, laid off after 6 years', text: 'I was applying to 50 jobs a week and hearing nothing. ImFhired got me 3 interviews in my first week after getting verified.', rating: 5 },
              { name: 'Rahul M.', role: 'Product Manager, wanted to switch', text: 'The verified badge is a game changer. Recruiters actually reach out now instead of me chasing them.', rating: 5 },
              { name: 'Anjali K.', role: 'Data Scientist, 4 years experience', text: 'Finally a platform that treats experienced professionals differently. The AI interview was fair and the feedback was actually useful.', rating: 5 },
            ].map(t => (
              <div key={t.name} className="bg-white p-6 rounded-2xl border border-gray-100">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-black text-black" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="border-t border-gray-100 pt-4">
                  <div className="font-bold text-black text-sm">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-black text-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-black text-white mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.04em', lineHeight: '1' }}>
            Stop applying.<br />Start getting hired.
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join 2,000+ experienced professionals who stopped mass-applying and started standing out.
          </p>
          <Link href="/auth/register?role=candidate"
            className="inline-flex items-center gap-2 text-black font-bold px-10 py-5 rounded-2xl bg-white hover:bg-gray-100 transition-all text-lg hover:scale-105 active:scale-95">
            Get Verified for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-gray-600 text-sm mt-4">No credit card. No spam. Just results.</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black font-black text-[9px]">IF</span>
            </div>
            <span className="text-white font-black">ImFhired</span>
          </div>
          <p className="text-gray-600 text-sm">The Next Door for Experienced Talent</p>
          <div className="flex gap-6 text-sm text-gray-600">
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/register?role=candidate" className="hover:text-white transition-colors">Get Started</Link>
            <Link href="/auth/register?role=recruiter" className="hover:text-white transition-colors">For Recruiters</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
