'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mic, MicOff, Video, VideoOff, Volume2, VolumeX,
  PhoneOff, Loader2, Shield, AlertCircle, Brain
} from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import { useProctoring } from '@/hooks/useProctoring'
import { useTabGuard } from '@/hooks/useTabGuard'

type Phase = 'intro' | 'technical' | 'behavioral' | 'salary' | 'completed'

const PHASE_LABELS: Record<Phase, string> = {
  intro: 'Introduction',
  technical: 'Technical',
  behavioral: 'Behavioural',
  salary: 'Salary',
  completed: 'Completed',
}

const PHASE_COLORS: Record<Phase, string> = {
  intro: '#6366f1',
  technical: '#a855f7',
  behavioral: '#f59e0b',
  salary: '#22c55e',
  completed: '#64748b',
}

interface Turn {
  speaker: 'ai' | 'candidate'
  text: string
  round?: string
}

export default function InterviewRoom({ params }: { params: { interviewId: string } }) {
  const router = useRouter()
  const interviewId = params.interviewId

  const [phase, setPhase] = useState<Phase>('intro')
  const [transcript, setTranscript] = useState<Turn[]>([])
  const [micOn, setMicOn] = useState(false)
  const [camOn, setCamOn] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState('Click "Start Interview" to begin')
  const [isEnding, setIsEnding] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [transcriptTab, setTranscriptTab] = useState<'transcript' | 'insights'>('transcript')

  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const transcriptRef = useRef<HTMLDivElement>(null)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speakerOnRef = useRef(true)
  const micOnRef = useRef(false)
  const token = typeof window !== 'undefined' ? localStorage.getItem('firedin_token') : ''
  const API = getApiUrl()

  const proctorStatus = useProctoring(videoRef, hasStarted && camOn && cameraReady)
  const tabStatus = useTabGuard(hasStarted)

  // ── Camera — Only request when user starts interview ────────────────────────
  useEffect(() => {
    if (!hasStarted) return

    if (camOn && !cameraReady) {
      navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      })
        .then(stream => {
          cameraStreamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(err => console.error('[Camera] Play error:', err))
              setCameraReady(true)
            }
          }
        })
        .catch(err => {
          console.error('[Camera] Error:', err)
          setCamOn(false)
          setStatus('Camera access denied. Continuing without video.')
        })
    } else if (!camOn) {
      cameraStreamRef.current?.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCameraReady(false)
    }

    return () => {
      if (!camOn) {
        cameraStreamRef.current?.getTracks().forEach(t => t.stop())
        cameraStreamRef.current = null
      }
    }
  }, [hasStarted, camOn, cameraReady])

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasStarted) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [hasStarted])

  // ── Auto-scroll transcript ────────────────────────────────────────────────
  useEffect(() => {
    if (transcriptRef.current)
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [transcript])

  // ── Keep refs in sync ────────────────────────────────────────────────────────
  useEffect(() => { speakerOnRef.current = speakerOn }, [speakerOn])
  useEffect(() => { micOnRef.current = micOn }, [micOn])

  // ── Speak text via browser TTS ────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!speakerOnRef.current) {
      setAiSpeaking(false)
      return
    }
    
    try {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'en-US'
      utt.rate = 0.9
      utt.pitch = 1.0
      utt.volume = 1.0

      // Pick a good voice if available
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha'))
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0]
      
      if (preferred) utt.voice = preferred

      utt.onstart = () => setAiSpeaking(true)
      utt.onend = () => setAiSpeaking(false)
      utt.onerror = (e) => {
        console.error('[TTS] Error:', e)
        setAiSpeaking(false)
      }
      speechRef.current = utt
      window.speechSynthesis.speak(utt)
    } catch (err) {
      console.error('[TTS] Exception:', err)
      setAiSpeaking(false)
    }
  }, [])

  // ── Start interview ───────────────────────────────────────────────────────
  const startInterview = async () => {
    setStatus('Requesting camera & microphone...')
    
    // Request camera first
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      })
      cameraStreamRef.current = camStream
      if (videoRef.current) {
        videoRef.current.srcObject = camStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => console.error('[Camera] Play error:', err))
          setCameraReady(true)
        }
      }
      setCamOn(true)
    } catch (err) {
      console.error('[Camera] Error:', err)
      setStatus('Camera access denied. Continuing without video.')
    }

    // Request microphone
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStream.getTracks().forEach(t => t.stop())
      setMicOn(true)
    } catch (err) {
      console.error('[Mic] Error:', err)
      setStatus('Microphone access denied. Please enable it.')
      return
    }

    setStatus('Starting interview...')
    try {
      const res = await fetch(`${API}/api/v1/interview/start/${interviewId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to start')

      setHasStarted(true)
      setPhase('intro')
      const opening = data.opening_message
      setTranscript([{ speaker: 'ai', text: opening, round: 'intro' }])
      setStatus('Listening...')
      
      // Small delay to ensure audio context is ready
      setTimeout(() => speak(opening), 500)
    } catch (err: any) {
      setStatus(`Error: ${err.message}`)
      setCamOn(false)
      setMicOn(false)
      console.error('[Start Interview] Error:', err)
    }
  }

  // ── Record audio (push-to-talk) ───────────────────────────────────────────
  const startRecording = async () => {
    if (isProcessing || aiSpeaking || !micOn) return
    
    window.speechSynthesis.cancel()
    setAiSpeaking(false)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      })
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4'
      
      const recorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        if (blob.size > 500) {
          await processAudio(blob)
        } else {
          setStatus('Audio too short. Please try again.')
          setIsProcessing(false)
        }
      }

      recorder.onerror = (e) => {
        console.error('[Recorder] Error:', e)
        stream.getTracks().forEach(t => t.stop())
        setStatus('Recording error. Please try again.')
        setIsRecording(false)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setStatus('Recording... Release to send')
    } catch (err) {
      console.error('[Mic] Error:', err)
      setStatus('Microphone access denied')
      setMicOn(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStatus('Processing...')
    }
  }

  // ── Process audio: Whisper STT → LLaMA response ───────────────────────────
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setStatus('Transcribing...')

    try {
      // Step 1: Whisper STT
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('interview_id', interviewId)

      const sttRes = await fetch(`${API}/api/v1/interview/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const sttData = await sttRes.json()
      const candidateText = sttData.text?.trim()

      if (!candidateText) {
        setStatus('Could not hear you. Please try again.')
        setIsProcessing(false)
        return
      }

      // Add candidate turn to UI
      setTranscript(prev => [...prev, { speaker: 'candidate', text: candidateText }])
      setStatus('AI is thinking...')

      // Step 2: LLaMA response
      await sendTextToAI(candidateText)
    } catch (err: any) {
      console.error('[Process] Error:', err)
      setStatus('Error processing. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Send text to AI (used by both voice and text input) ───────────────────
  const sendTextToAI = async (text: string) => {
    try {
      const res = await fetch(`${API}/api/v1/interview/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interview_id: interviewId,
          candidate_text: text,
          is_text_input: false,
        }),
      })
      const data = await res.json()

      if (data.phase) setPhase(data.phase as Phase)

      const aiText = data.text
      setTranscript(prev => [...prev, { speaker: 'ai', text: aiText }])
      setStatus('Listening...')
      speak(aiText)

      if (data.should_end) {
        setTimeout(() => endInterview('completed'), 4000)
      }
    } catch (err) {
      console.error('[AI] Error:', err)
      setStatus('Error getting AI response.')
    }
  }

  // ── Handle text input ─────────────────────────────────────────────────────
  const handleSendText = async () => {
    if (!inputText.trim() || isProcessing) return
    const text = inputText.trim()
    setInputText('')
    setTranscript(prev => [...prev, { speaker: 'candidate', text }])
    setIsProcessing(true)
    setStatus('AI is thinking...')
    await sendTextToAI(text)
    setIsProcessing(false)
  }

  // ── End interview ─────────────────────────────────────────────────────────
  const endInterview = async (reason = 'early_exit') => {
    setIsEnding(true)
    window.speechSynthesis.cancel()
    try {
      const res = await fetch(`${API}/api/v1/interview/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interview_id: interviewId, termination_reason: reason }),
      })
      if (!res.ok) {
        console.error('[End Interview] Error:', await res.text())
      }
    } catch (e) {
      console.error('[End Interview] Exception:', e)
    }
    
    // Wait a bit for backend to process, then redirect
    setTimeout(() => {
      router.push(`/candidate/scorecard/${interviewId}`)
    }, 1000)
  }

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // ── Pre-start overlay ─────────────────────────────────────────────────────
  if (!hasStarted) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-950 text-white p-6">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-blue-600/50 animate-pulse">
          <Brain className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-black mb-3 tracking-tight">Ready for your Interview?</h1>
        <p className="text-gray-300 text-center max-w-md mb-8 leading-relaxed text-lg">
          Find a quiet place with good lighting. We'll use your camera and microphone to conduct the interview.
        </p>
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 max-w-md text-left mb-8">
          <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300/90 leading-relaxed">
            <strong className="text-amber-300">AI Shield Active</strong> — This session monitors face presence and tab switching. Leaving this tab will be flagged.
          </p>
        </div>
        <button onClick={startInterview}
          className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-12 py-4 rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95 text-lg">
          Start Interview
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-950 text-white overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Tab switch warning */}
      {(tabStatus.severity === 'warning' || tabStatus.severity === 'critical') && (
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3 text-white text-sm font-bold ${
          tabStatus.severity === 'critical' ? 'bg-red-600' : 'bg-amber-500'
        }`}>
          <AlertCircle className="w-4 h-4" />
          Tab switch detected — {tabStatus.severity === 'critical' ? 'Final warning!' : 'Stay on this page.'}
        </div>
      )}

      {/* Header */}
      <header className="h-14 flex items-center px-6 gap-4 border-b border-white/5 bg-gray-900/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-[9px]">IF</span>
          </div>
          <span className="font-black text-sm">FiredIn</span>
          <span className="text-gray-500 text-xs ml-1">Interviewer</span>
        </div>

        {/* Phase tabs */}
        <div className="flex-1 flex items-center justify-center gap-2">
          {(['intro', 'technical', 'behavioral', 'salary'] as Phase[]).map(p => (
            <div key={p} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              phase === p
                ? 'text-white'
                : 'text-gray-600'
            }`} style={phase === p ? { background: PHASE_COLORS[p] + '30', color: PHASE_COLORS[p] } : {}}>
              {PHASE_LABELS[p]}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-green-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </div>
          <span className="text-sm font-mono text-gray-400">{fmt(elapsed)}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex gap-0 overflow-hidden">

        {/* Left — AI avatar */}
        <div className="w-72 shrink-0 flex flex-col items-center justify-center border-r border-white/5 bg-gray-900/40 p-6">
          <div className="relative mb-6">
            {aiSpeaking && (
              <>
                <div className="absolute -inset-6 rounded-full animate-pulse opacity-30 bg-gradient-to-r from-blue-500 to-purple-500" style={{ animationDuration: '1.2s' }} />
                <div className="absolute -inset-10 rounded-full animate-pulse opacity-15 bg-blue-500" style={{ animationDuration: '1.8s', animationDelay: '0.2s' }} />
              </>
            )}
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              aiSpeaking 
                ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl shadow-blue-600/60 scale-110' 
                : 'bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg'
            }`}>
              <Brain className={`w-16 h-16 transition-all ${aiSpeaking ? 'text-white scale-125' : 'text-gray-600'}`} />
            </div>
          </div>
          <div className="text-base font-bold text-white mb-2">FiredIn AI</div>
          <div className="text-sm text-gray-400 text-center">
            {aiSpeaking ? '🔊 Speaking...' : isProcessing ? '⏳ Thinking...' : '👂 Listening'}
          </div>

          {/* Animated voice bars when speaking */}
          {aiSpeaking && (
            <div className="flex items-end gap-1.5 mt-6 h-10">
              {[2, 4, 6, 8, 7, 5, 3, 6, 4, 5].map((h, i) => (
                <div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-blue-400 to-purple-400"
                  style={{
                    height: `${h * 4}px`,
                    animation: 'voiceBar 0.6s ease-in-out infinite alternate',
                    animationDelay: `${i * 0.06}s`,
                  }} />
              ))}
            </div>
          )}
        </div>

        {/* Center — Camera */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 relative">
          <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden border border-white/10">
            {camOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-3">
                <VideoOff className="w-12 h-12 text-gray-700" />
                <span className="text-xs text-gray-600 font-bold uppercase tracking-widest">Camera Off</span>
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
              <Mic className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-white font-bold">Your video</span>
            </div>
            {proctorStatus.facesDetected !== undefined && (
              <div className="absolute bottom-3 left-3 text-[10px] text-white/50 bg-black/40 px-2 py-1 rounded-lg">
                Proctoring: {proctorStatus.facesDetected} face{proctorStatus.facesDetected !== 1 ? 's' : ''} detected
              </div>
            )}
          </div>
        </div>

        {/* Right — Transcript & Insights Tabs */}
        <div className="w-72 shrink-0 flex flex-col border-l border-white/5 bg-gray-900/40">
          {/* Tab buttons */}
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setTranscriptTab('transcript')}
              className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                transcriptTab === 'transcript'
                  ? 'text-white border-blue-500'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}>
              Transcript
            </button>
            <button
              onClick={() => setTranscriptTab('insights')}
              className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                transcriptTab === 'insights'
                  ? 'text-white border-blue-500'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}>
              Insights
            </button>
          </div>

          {/* Transcript Tab */}
          {transcriptTab === 'transcript' && (
            <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcript.map((t, i) => (
                <div key={i} className={`flex ${t.speaker === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    t.speaker === 'candidate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-200'
                  }`}>
                    {t.text}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 px-3 py-2 rounded-xl flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    <span className="text-xs text-gray-400">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Insights Tab */}
          {transcriptTab === 'insights' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current Phase</div>
                  <div className="text-sm font-bold text-white capitalize">{phase}</div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Exchanges</div>
                  <div className="text-sm font-bold text-white">{transcript.length} turns</div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duration</div>
                  <div className="text-sm font-bold text-white">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">AI Status</div>
                  <div className="text-sm font-bold">
                    {aiSpeaking ? (
                      <span className="text-green-400">🔊 Speaking</span>
                    ) : isProcessing ? (
                      <span className="text-yellow-400">⏳ Processing</span>
                    ) : (
                      <span className="text-blue-400">👂 Listening</span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Proctoring</div>
                  <div className="text-sm font-bold">
                    {proctorStatus.facesDetected !== undefined ? (
                      <span className={proctorStatus.isWarning ? 'text-red-400' : 'text-green-400'}>
                        {proctorStatus.facesDetected} face{proctorStatus.facesDetected !== 1 ? 's' : ''} detected
                      </span>
                    ) : (
                      <span className="text-gray-400">Initializing...</span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Microphone</div>
                  <div className="text-sm font-bold">
                    {micOn ? (
                      <span className="text-green-400">✓ Enabled</span>
                    ) : (
                      <span className="text-red-400">✗ Disabled</span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-3 border border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Camera</div>
                  <div className="text-sm font-bold">
                    {camOn ? (
                      <span className="text-green-400">✓ Enabled</span>
                    ) : (
                      <span className="text-red-400">✗ Disabled</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="h-28 shrink-0 flex flex-col items-center justify-center gap-4 border-t border-white/5 bg-gray-900/80 px-6">
        {/* Control buttons */}
        <div className="flex items-center gap-3">
          {/* Mic toggle */}
          <button onClick={() => setMicOn(!micOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              micOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-red-500/20 text-red-400'
            }`}
            title={micOn ? 'Microphone on' : 'Microphone off'}>
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Push to talk */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing || aiSpeaking || !micOn}
            className={`px-8 h-12 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
              isRecording
                ? 'bg-red-500 text-white scale-105 shadow-lg shadow-red-500/40'
                : isProcessing || aiSpeaking
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}>
            {isRecording ? (
              <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Recording...</>
            ) : isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><Mic className="w-4 h-4" /> Hold to Speak</>
            )}
          </button>

          {/* Camera toggle */}
          <button onClick={() => setCamOn(!camOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              camOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-red-500/20 text-red-400'
            }`}
            title={camOn ? 'Camera on' : 'Camera off'}>
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Speaker toggle */}
          <button onClick={() => setSpeakerOn(!speakerOn)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              speakerOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-red-500/20 text-red-400'
            }`}
            title={speakerOn ? 'Speaker on' : 'Speaker off'}>
            {speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* End session */}
          <button onClick={() => endInterview('early_exit')} disabled={isEnding}
            className="flex items-center gap-2 px-5 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-all disabled:opacity-50">
            {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
            End Session
          </button>
        </div>

        {/* Text input */}
        <div className="flex items-center gap-2 w-full max-w-lg">
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendText()}
            placeholder="Or type your response..."
            disabled={isProcessing || aiSpeaking}
            className="flex-1 px-4 py-2 rounded-xl bg-gray-800 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
          />
          <button onClick={handleSendText} disabled={!inputText.trim() || isProcessing || aiSpeaking}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold transition-colors">
            Send
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.2); opacity: 0.6; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
