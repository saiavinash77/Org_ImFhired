'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, User, Loader2 } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function AIAssistantWidget({ isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Hello! I am your ImFhired Recruitment Assistant. I can help you manage your talent pipeline effectively:

1. **Candidate Screening**: Get instant summaries of recent interview transcripts and AI scores.
2. **Talent Matching**: Ask me to identify top candidates for any of your active job postings.
3. **Interview Insights**: Dig deeper into technical scores or behavioral flags from recent assessments.
4. **Market Context**: Discuss salary trends and role requirements for your open positions.

What can I help you with today?` 
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  if (!isOpen) return null

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const newMsg: Message = { role: 'user', content: input.trim() }
    const updatedMessages = [...messages, newMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('imfhired_token')
      const API_URL = getApiUrl()
      const res = await fetch(`${API_URL}/api/v1/assistant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: updatedMessages })
      })

      if (!res.ok) {
        throw new Error('Failed to get answer')
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[90] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 w-full max-w-sm h-full bg-white z-[100] shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-4 bg-gradient-to-r from-brand-50 to-accent-50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 border-2 border-brand-200 rounded-full overflow-hidden shadow-sm">
                <Image src="/avatars/ai-core.png" alt="AI" width={36} height={36} className="object-cover" />
            </div>
            <span className="font-bold text-surface-900 leading-none">ImFhired Assistant</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-surface-500 hover:text-surface-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border ${msg.role === 'user' ? 'border-indigo-200 shadow-sm' : 'border-brand-200 shadow-brand-100/50 shadow-md ring-2 ring-brand-100'}`}>
                {msg.role === 'user' ? 
                    <Image src="/avatars/recruiter-avatar.png" alt="You" width={32} height={32} className="object-cover" /> : 
                    <Image src="/avatars/ai-core.png" alt="AI" width={32} height={32} className="object-cover" />
                }
              </div>
              <div className={`p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none shadow-md' : 'bg-white border rounded-tl-none text-surface-800 shadow-sm'}`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-slate chat-markdown">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border border-brand-200 shadow-md ring-2 ring-brand-100">
                <Image src="/avatars/ai-core.png" alt="AI" width={32} height={32} className="object-cover" />
              </div>
              <div className="p-4 rounded-2xl bg-white border rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                <span className="text-sm text-surface-500 font-medium">Analyzing data...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="relative flex items-center">
            <input 
              disabled={isLoading}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about candidates..."
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-surface-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all disabled:opacity-50"
            />
            <button 
              disabled={isLoading || !input.trim()}
              onClick={handleSend}
              className="absolute right-2 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:bg-surface-300 disabled:text-surface-500"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
