'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getApiUrl } from '@/lib/api'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

const typeIcon: Record<string, string> = {
  new_application:     '📋',
  assessment_ready:    '📊',
  interview_scheduled: '📅',
  offer_sent:          '🎉',
  verification_complete: '✅',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('hireai_token') : null
  const API = getApiUrl()

  const fetchUnread = async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/api/v1/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setUnread(data.count || 0)
      }
    } catch {}
  }

  const fetchNotifications = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/notifications/?limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnread(data.filter((n: Notification) => !n.is_read).length)
      }
    } catch {}
    setLoading(false)
  }

  const markAllRead = async () => {
    if (!token) return
    await fetch(`${API}/api/v1/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  const markRead = async (id: string) => {
    if (!token) return
    await fetch(`${API}/api/v1/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [token])

  // Fetch full list when opened
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Bell className="w-4 h-4 text-surface-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.98)',
            border: '1px solid rgba(226,232,240,0.8)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
            <span className="text-sm font-black text-surface-900">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-surface-200 mx-auto mb-2" />
                <p className="text-sm text-surface-400 font-medium">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-surface-50 transition-colors cursor-pointer ${
                    !n.is_read ? 'bg-brand-50/50 hover:bg-brand-50' : 'hover:bg-surface-50'
                  }`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">{typeIcon[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-bold leading-tight ${!n.is_read ? 'text-surface-900' : 'text-surface-600'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-surface-400">{timeAgo(n.created_at)}</span>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => { markRead(n.id); setOpen(false) }}
                          className="flex items-center gap-0.5 text-[10px] font-bold text-brand-600 hover:text-brand-700"
                        >
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
