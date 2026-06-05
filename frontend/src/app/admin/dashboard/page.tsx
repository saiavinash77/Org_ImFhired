'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Server, Users, Activity, HardDrive, Cpu, Terminal, Send, Loader2, Database, User } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import ReactMarkdown from 'react-markdown'

interface SystemStats {
  os: string
  os_release: string
  cpu_usage_percent: number
  cpu_cores: number
  memory_total_gb: number
  memory_used_gb: number
  memory_percent: number
  disk_total_gb: number
  disk_used_gb: number
  disk_percent: number
  timestamp: string
}

interface PlatformMetrics {
  total_users: number
  candidates: number
  recruiters: number
  total_interviews: number
  total_applications: number
  active_jobs: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'System Admin Agent initialized. I have real-time access to database metrics, server CPU, and memory utilization. What would you like to know?'
    }
  ])
  const [input, setInput] = useState('')
  const [isAgentLoading, setIsAgentLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSystemData()
    // Poll every 30 seconds
    const interval = setInterval(fetchSystemData, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isAgentLoading])

  const fetchSystemData = async () => {
    try {
      const token = localStorage.getItem('firedin_token')
      const res = await fetch(`${getApiUrl()}/api/v1/admin/system-health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data.system)
        setMetrics(data.platform)
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isAgentLoading) return
    const newMsg: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, newMsg])
    setInput('')
    setIsAgentLoading(true)

    try {
      const token = localStorage.getItem('firedin_token')
      const res = await fetch(`${getApiUrl()}/api/v1/assistant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: [...messages, newMsg] })
      })

      if (!res.ok) throw new Error('Agent failed to respond')

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "🚨 Connection error. Unable to reach backend systems." }])
    } finally {
      setIsAgentLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight uppercase">Command Center</h1>
        <p className="text-zinc-400 mt-2">Real-time platform metrics and intelligent system management.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="CPU Utilization" 
          value={isLoadingStats ? '-' : `${stats?.cpu_usage_percent}%`} 
          subtitle={isLoadingStats ? '-' : `${stats?.cpu_cores} Cores`} 
          icon={<Cpu className="w-5 h-5 text-blue-400" />} 
          loading={isLoadingStats} 
        />
        <StatCard 
          title="Memory Usage" 
          value={isLoadingStats ? '-' : `${stats?.memory_percent}%`} 
          subtitle={isLoadingStats ? '-' : `${stats?.memory_used_gb} / ${stats?.memory_total_gb} GB`} 
          icon={<Server className="w-5 h-5 text-purple-400" />} 
          loading={isLoadingStats} 
        />
        <StatCard 
          title="Active Users" 
          value={isLoadingStats ? '-' : metrics?.total_users.toString() || '0'} 
          subtitle={isLoadingStats ? '-' : `${metrics?.candidates} Cands | ${metrics?.recruiters} Recs`} 
          icon={<Users className="w-5 h-5 text-green-400" />} 
          loading={isLoadingStats} 
        />
        <StatCard 
          title="Total Interviews" 
          value={isLoadingStats ? '-' : metrics?.total_interviews.toString() || '0'} 
          subtitle={isLoadingStats ? '-' : `${metrics?.active_jobs} Active Jobs`} 
          icon={<Database className="w-5 h-5 text-orange-400" />} 
          loading={isLoadingStats} 
        />
      </div>

      {/* AI Agent Terminal */}
      <div className="bg-zinc-950/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col h-[500px]">
        <div className="bg-zinc-900/50 border-b border-white/10 p-4 flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h2 className="text-white font-bold tracking-wide uppercase text-sm">System Agent Terminal</h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs text-primary font-mono uppercase tracking-widest">Online</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar font-mono text-sm">
          {messages.map((msg, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx} 
              className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded bg-zinc-900 border ${msg.role === 'user' ? 'border-zinc-700' : 'border-primary/50'} flex items-center justify-center flex-shrink-0`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : <Terminal className="w-4 h-4 text-primary" />}
              </div>
              <div className={`p-4 rounded-lg ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-200' : 'bg-primary/5 border border-primary/20 text-zinc-300'}`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </motion.div>
          ))}
          {isAgentLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-8 h-8 rounded bg-zinc-900 border border-primary/50 flex items-center justify-center flex-shrink-0">
                <Terminal className="w-4 h-4 text-primary" />
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-primary font-mono uppercase tracking-widest text-xs">Analyzing telemetry...</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-white/10">
          <div className="relative flex items-center">
            <span className="absolute left-4 text-primary font-mono">{'>'}</span>
            <input 
              disabled={isAgentLoading}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Query system agent..."
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-10 pr-12 py-3 text-white font-mono text-sm focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
            />
            <button 
              disabled={isAgentLoading || !input.trim()}
              onClick={handleSend}
              className="absolute right-2 p-2 text-zinc-400 hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-zinc-400"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, loading }: { title: string, value: string, subtitle: string, icon: React.ReactNode, loading: boolean }) {
  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-md hover:bg-zinc-900 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase">{title}</h3>
        <div className="p-2 bg-black/50 rounded-lg border border-white/5">
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-white/10 rounded w-1/2"></div>
          <div className="h-4 bg-white/5 rounded w-3/4"></div>
        </div>
      ) : (
        <>
          <div className="text-3xl font-black text-white tracking-tight">{value}</div>
          <div className="text-sm text-zinc-500 font-medium mt-1">{subtitle}</div>
        </>
      )}
    </div>
  )
}
