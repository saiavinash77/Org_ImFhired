/**
 * useInterviewSocket — Manages the WebSocket connection for live AI interviews.
 * Handles audio streaming, transcript updates, round transitions, and scoring.
 */
'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { createInterviewWebSocket } from '@/services/api'

export type InterviewRound = 'intro' | 'technical' | 'behavioral' | 'salary'

export interface TranscriptTurn {
  speaker: 'ai' | 'candidate'
  text: string
  timestamp: string
  round: InterviewRound
}

export interface LiveScores {
  technical: number
  communication: number
  confidence: number
}

interface InterviewSocketState {
  connected: boolean
  connecting: boolean
  currentRound: InterviewRound
  transcript: TranscriptTurn[]
  liveScores: LiveScores
  aiSpeaking: boolean
  ended: boolean
  error: string | null
}

export function useInterviewSocket(interviewId: string, token: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval>>()
  const endedRef = useRef(false)

  const [state, setState] = useState<InterviewSocketState>({
    connected: false,
    connecting: false,
    currentRound: 'intro',
    transcript: [],
    liveScores: { technical: 0, communication: 0, confidence: 0 },
    aiSpeaking: false,
    ended: false,
    error: null,
  })

  const send = useCallback((type: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }))
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current) return

    setState(s => ({ ...s, connecting: true, error: null }))

    const ws = createInterviewWebSocket(interviewId, token)
    wsRef.current = ws

    ws.onopen = () => {
      setState(s => ({ ...s, connected: true, connecting: false }))
      // Start heartbeat ping every 30s
      pingRef.current = setInterval(() => send('ping'), 30000)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { type, data } = message

        switch (type) {
          case 'ai_response':
            setState(s => ({
              ...s,
              aiSpeaking: true,
              transcript: [
                ...s.transcript,
                {
                  speaker: 'ai',
                  text: data.text || '',
                  timestamp: new Date().toISOString(),
                  round: s.currentRound,
                },
              ],
            }))
            // Estimate AI speaking time and then stop animation
            setTimeout(() => {
              setState(s => ({ ...s, aiSpeaking: false }))
            }, Math.max(2000, (data.text?.length || 0) * 50)) // rough estimate
            break

          case 'scores_update':
            setState(s => ({
              ...s,
              liveScores: {
                technical: data.technical ?? s.liveScores.technical,
                communication: data.communication ?? s.liveScores.communication,
                confidence: data.confidence ?? s.liveScores.confidence,
              },
            }))
            break

          case 'round_change':
            setState(s => ({ ...s, currentRound: data.round as InterviewRound }))
            break

          case 'interview_ended':
            endedRef.current = true
            setState(s => ({ ...s, ended: true }))
            ws.close()
            break

          case 'error':
            setState(s => ({ ...s, error: data.message }))
            break

          case 'pong':
            // Heartbeat response — connection healthy
            break
        }
      } catch (e) {
        console.error('Failed to parse WS message:', e)
      }
    }

    ws.onerror = () => {
      setState(s => ({ ...s, error: 'Connection error. Please refresh and try again.' }))
    }

    ws.onclose = (event) => {
      wsRef.current = null
      clearInterval(pingRef.current)
      setState(s => ({ ...s, connected: false, connecting: false }))

      // Auto-reconnect unless deliberately closed or ended
      if (!event.wasClean && !endedRef.current) {
        setTimeout(() => connect(), 3000)
      }
    }
  }, [interviewId, token, send])

  /**
   * Send candidate's transcript to the AI.
   */
  const sendTranscript = useCallback((text: string) => {
    setState(s => ({
      ...s,
      transcript: [
        ...s.transcript,
        {
          speaker: 'candidate',
          text,
          timestamp: new Date().toISOString(),
          round: s.currentRound,
        },
      ],
    }))
    send('transcript', { text, speaker: 'candidate' })
  }, [send, state.currentRound])

  /**
   * End the interview session.
   */
  const endInterview = useCallback(() => {
    send('end_interview')
    clearInterval(pingRef.current)
  }, [send])

  // Connect on mount
  useEffect(() => {
    endedRef.current = state.ended
    connect()
    return () => {
      clearInterval(pingRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect, state.ended])

  return {
    ...state,
    sendTranscript,
    endInterview,
  }
}
