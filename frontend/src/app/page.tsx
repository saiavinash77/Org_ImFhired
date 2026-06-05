'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle, Zap, Shield, BarChart3, Users, Brain, Star } from 'lucide-react'

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
    <div className="min-h-screen bg-white overflow-x-hidden text-black checkmark-lines-bg">
      <div className="checkmark-lines-content">
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/70 backdrop-blur-xl border-b border-primary-200 shadow-md' : 'bg-transparent'
          }`}>
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1 group cursor-pointer">
              <span className="logo-fired text-2xl font-black tracking-tight">Fired</span>
              <span className="logo-in text-2xl font-black tracking-tight">In</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-surface-600">
              <a href="#how-it-works" className="hover:text-primary-600 transition-colors">How it works</a>
              <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
              <a href="#for-recruiters" className="hover:text-primary-600 transition-colors">For Recruiters</a>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="text-[11px] font-bold uppercase tracking-widest text-surface-600 hover:text-primary-600 transition-colors px-4 py-2">
                Sign In
              </Link>
              <Link href="/auth/register?role=candidate"
                className="text-[11px] font-bold uppercase tracking-widest text-white px-6 py-3.5 rounded-xl bg-primary-500 hover:bg-primary-600 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* ─── HERO ─── */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-white" style={{
          minHeight: '100vh',
          backgroundImage: `
            linear-gradient(rgba(200, 210, 230, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(200, 210, 230, 0.35) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          paddingTop: '7rem',
          paddingBottom: '5rem',
        }}>
          <div className="relative w-full max-w-5xl mx-auto px-6 text-center z-10">

            {/* Badge */}
            <div className="inline-flex items-center gap-3 mb-14 px-5 py-2.5 bg-white/90 border border-gray-200 rounded-full shadow-sm backdrop-blur-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
              }}>
                <span className="text-white font-black text-[9px] tracking-tight">IF</span>
              </div>
              <span className="text-[11px] font-extrabold text-gray-600 uppercase tracking-[0.18em]">THE NEXT DOOR FOR LAID OFF PEOPLE</span>
            </div>

            {/* Main headline */}
            <h1 className="text-aggressive" style={{
              fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
              fontWeight: 900,
              fontStyle: 'normal',
              textTransform: 'uppercase',
              lineHeight: 0.92,
              letterSpacing: '-0.03em',
              fontSize: 'clamp(2.8rem, 7.5vw, 6.5rem)',
              color: '#0a0f1e',
              margin: '0 0 0.5rem 0',
            }}>
              IF YOU'RE{' '}
              <span className="logo-fired" style={{ textDecoration: 'none' }}>
                <span className="relative inline-block">
                  <span style={{
                    position: 'absolute',
                    inset: '-20px -30px',
                    background: 'radial-gradient(ellipse at 55% 50%, rgba(239,68,68,0.45) 0%, rgba(239,68,68,0.12) 55%, transparent 80%)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }} />
                  <span className="relative" style={{ zIndex: 1, textDecoration: 'line-through', textDecorationThickness: '0.15em' }}>FIRED</span>
                </span>
              </span>
              ,
              <br />
              GET READY TO BE
              <br />
              <span className="logo-in" style={{ borderBottom: 'none' }}>HIRED.</span>
            </h1>

            {/* Bold green underline bar — like the image */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.1rem', marginBottom: '3.5rem' }}>
              <div style={{
                width: '14rem',
                height: '5px',
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #16a34a 0%, #22c55e 100%)',
              }} />
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-5 mb-16">
              <Link href="/auth/register?role=candidate"
                className="flex items-center gap-3 text-white font-bold uppercase tracking-widest px-12 py-5 rounded-xl text-[13px] transition-all duration-200 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 20px rgba(37,99,235,0.35)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,99,235,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.35)')}>
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/auth/register?role=recruiter"
                className="flex items-center gap-3 font-bold uppercase tracking-widest px-12 py-5 rounded-xl text-[13px] transition-all duration-200"
                style={{ color: '#1d4ed8', background: '#f1f5f9', border: '1.5px solid #cbd5e1' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e2e8f0'; (e.currentTarget as HTMLElement).style.borderColor = '#94a3b8'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1'; }}>
                I'm Hiring
              </Link>
            </div>

            {/* Layoff Ticker / Breaking News Section */}
            <div className="mt-8 mb-20 overflow-hidden relative">
              <div className="flex items-center gap-4 mb-6 justify-center">
                <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded animate-pulse">Breaking</span>
                <span className="text-sm font-bold text-gray-900 tracking-tight">
                  <span className="text-red-600">71,125+</span> TECH PROFESSIONALS IMPACTED THIS MONTH
                </span>
              </div>

              {/* Scrolling Marquee */}
              <div className="relative flex overflow-x-hidden border-y border-gray-100 py-6 bg-gray-50/50 backdrop-blur-sm">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
                  {[
                    { name: 'ORACLE', count: '30,000' },
                    { name: 'BOEING', count: '17,000' },
                    { name: 'AMAZON', count: '16,000' },
                    { name: 'CISCO', count: '4,000' },
                    { name: 'ATLASSIAN', count: '1,600' },
                    { name: 'WALMART TECH', count: '1,000' },
                    { name: 'LINKEDIN', count: '875' },
                    { name: 'META', count: 'HUNDREDS' },
                    { name: 'INDEED', count: '15% OF STAFF' },
                    { name: 'JUMIA', count: '10%' },
                    { name: 'OLA ELECTRIC', count: '5%' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-gray-400">●</span>
                      <span className="text-xs font-black text-gray-900 tracking-wider">{item.name}</span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{item.count}</span>
                    </div>
                  ))}
                </div>

                {/* Duplicate for seamless loop */}
                <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center gap-12 py-6">
                  {[
                    { name: 'ORACLE', count: '30,000' },
                    { name: 'BOEING', count: '17,000' },
                    { name: 'AMAZON', count: '16,000' },
                    { name: 'CISCO', count: '4,000' },
                    { name: 'ATLASSIAN', count: '1,600' },
                    { name: 'WALMART TECH', count: '1,000' },
                    { name: 'LINKEDIN', count: '875' },
                    { name: 'META', count: 'HUNDREDS' },
                    { name: 'INDEED', count: '15% OF STAFF' },
                    { name: 'JUMIA', count: '10%' },
                    { name: 'OLA ELECTRIC', count: '5%' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 pl-12">
                      <span className="text-[11px] font-black text-gray-400">●</span>
                      <span className="text-xs font-black text-gray-900 tracking-wider">{item.name}</span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-5 text-sm text-gray-500">
              <div className="flex -space-x-2.5">
                {['SK', 'PR', 'AM', 'VK', 'RN'].map((initials, idx) => (
                  <div key={idx}
                    className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: `hsl(${idx * 55 + 210}, 55%, 45%)`, boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>
                    {initials}
                  </div>
                ))}
              </div>
              <span className="font-medium"><strong className="text-gray-900 font-black">2,000+</strong> professionals verified this month</span>
            </div>

          </div>
        </section>

        {/* ─── STATS ─── */}
        <section className="py-16 border-y border-primary-100 bg-gradient-to-r from-primary-50 to-primary-100/50">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-5xl font-black font-display text-primary-600 mb-1 tracking-tighter uppercase">{s.value}</div>
                  <div className="text-[10px] text-surface-600 font-black uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── THE PROBLEM ─── */}
        <section className="py-24 bg-smooth-dark-gradient text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="font-black text-white mb-6 text-aggressive" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
              You have 5 years of experience.<br />
              Why are you applying like a fresher?
            </h2>
            <p className="text-primary-200 text-lg max-w-2xl mx-auto leading-relaxed mb-12">
              LinkedIn and Indeed treat everyone the same — your resume is just another PDF in a pile of thousands.
              There's no way to say "I've already been vetted. I'm not a risk." Until now.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              {[
                { label: 'Before FiredIn', items: ['Mass-applying to 100+ jobs', 'No response for weeks', 'Treated like a fresher', 'No way to stand out'] },
                { label: 'The Gap', items: ['No trust signal', 'No differentiation', 'No verification layer', 'Just a PDF in a pile'] },
                { label: 'With FiredIn', items: ['Verified badge on profile', 'Recruiters come to you', 'Pre-vetted = less risk', 'Apply once, seen everywhere'] },
              ].map((col, i) => (
                <div key={col.label} className={`p-6 rounded-2xl border ${i === 2
                  ? 'border-primary-400/30 text-white'
                  : 'border-white/10'
                  }`} style={i === 2 ? {
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(59,130,246,0.15) 100%)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 32px rgba(37,99,235,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                  } : {}}>
                  <div className={`text-[10px] font-black font-display uppercase tracking-widest mb-4 ${i === 2 ? 'text-primary-300' : 'text-primary-300'}`}>{col.label}</div>
                  <ul className="space-y-2">
                    {col.items.map(item => (
                      <li key={item} className={`text-sm flex items-start gap-2 ${i === 2 ? 'text-white' : 'text-primary-200'}`}>
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
              <span className="text-[10px] font-black font-display uppercase tracking-[0.2em] text-primary-600 mb-4 block">The Process</span>
              <h2 className="font-black text-surface-900" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
                Simple. Fast. Effective.
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {howItWorks.map((step, i) => (
                <div key={step.step} className="relative">
                  {i < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[calc(100%-8px)] w-full h-px border-t-2 border-dashed border-primary-200 z-0" />
                  )}
                  <div className="relative z-10">
                    <div className="w-12 h-12 text-white rounded-xl flex items-center justify-center font-black text-sm mb-4 bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
                      {step.step}
                    </div>
                    <h3 className="font-bold text-surface-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-surface-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="py-24 bg-primary-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-[10px] font-black font-display uppercase tracking-[0.2em] text-primary-600 mb-4 block">What You Get</span>
              <h2 className="font-black text-surface-900" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
                Everything you need to get hired faster
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {features.map(f => (
                <div key={f.title} className="bg-white p-6 rounded-2xl border border-primary-200 hover:border-primary-300 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-primary-100 to-primary-50 border border-primary-200">
                    <f.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-bold text-surface-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-surface-600 leading-relaxed">{f.desc}</p>
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
                <span className="text-[10px] font-black font-display uppercase tracking-[0.2em] text-primary-600 mb-4 block">For Recruiters</span>
                <h2 className="font-black text-surface-900 mb-6" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
                  Only see candidates who are already verified
                </h2>
                <p className="text-surface-600 leading-relaxed mb-8">
                  Every candidate on FiredIn has passed an AI interview. You're not sifting through unvetted resumes —
                  you're choosing from a pool of pre-qualified professionals.
                </p>
                <ul className="space-y-3 mb-8">
                  {['AI-scored candidates ranked by fit', 'Full interview scorecards on every profile', 'Invite who you want — no auto-spam', 'Send offers in one click'].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-surface-700">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-600">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register?role=recruiter"
                  className="inline-flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl transition-all bg-gradient-to-r from-primary-500 to-primary-600 hover:shadow-lg">
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
                  <div key={v.label} className="rounded-2xl p-5 text-center border border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100/50 hover:shadow-md transition-all">
                    <div className="text-4xl font-black font-display text-primary-600 mb-1 tracking-tighter uppercase">{v.num}</div>
                    <div className="text-[10px] text-surface-600 font-black uppercase tracking-widest leading-tight">{v.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-24 bg-primary-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-black text-surface-900" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}>
                Real people. Real results.
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { name: 'Priya S.', role: 'Senior Engineer, laid off after 6 years', text: 'I was applying to 50 jobs a week and hearing nothing. FiredIn got me 3 interviews in my first week after getting verified.', rating: 5 },
                { name: 'Rahul M.', role: 'Product Manager, wanted to switch', text: 'The verified badge is a game changer. Recruiters actually reach out now instead of me chasing them.', rating: 5 },
                { name: 'Anjali K.', role: 'Data Scientist, 4 years experience', text: 'Finally a platform that treats experienced professionals differently. The AI interview was fair and the feedback was actually useful.', rating: 5 },
              ].map(t => (
                <div key={t.name} className="bg-white p-6 rounded-2xl border border-primary-200">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-primary-500 text-primary-500" />)}
                  </div>
                  <p className="text-sm text-surface-600 leading-relaxed mb-6 italic">"{t.text}"</p>
                  <div className="border-t border-primary-100 pt-4">
                    <div className="font-bold text-surface-900 text-sm">{t.name}</div>
                    <div className="text-xs text-surface-500">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-24 bg-smooth-dark-gradient text-white text-center">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="font-black text-white mb-6 text-aggressive animate-aggressive-entrance" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.04em', lineHeight: '1' }}>
              Stop applying.<br />Start getting hired.
            </h2>
            <p className="text-primary-200 text-lg mb-10 max-w-xl mx-auto">
              Join 2,000+ experienced professionals who stopped mass-applying and started standing out.
            </p>
            <Link href="/auth/register?role=candidate"
              className="inline-flex items-center gap-2 text-primary-900 font-bold px-10 py-5 rounded-xl bg-white hover:bg-primary-50 transition-smooth text-lg hover-lift-3d shadow-lg">
              Get Verified for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-primary-300 text-sm mt-4">No credit card. No spam. Just results.</p>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="py-12 bg-smooth-dark-gradient border-t border-primary-800">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                <span className="text-primary-900 font-black text-[9px]">IF</span>
              </div>
              <span className="text-white font-black">FiredIn</span>
            </div>
            <p className="text-primary-300 text-sm">The Next Door for Experienced Talent</p>
            <div className="flex gap-6 text-sm text-primary-300">
              <Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/auth/register?role=candidate" className="hover:text-white transition-colors">Get Started</Link>
              <Link href="/auth/register?role=recruiter" className="hover:text-white transition-colors">For Recruiters</Link>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
