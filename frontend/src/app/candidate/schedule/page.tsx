'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle, Loader2, ArrowLeft, MapPin } from 'lucide-react'
import { scheduleApi } from '@/services/api'
import toast from 'react-hot-toast'

function ScheduleContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appId = searchParams.get('app_id') || ''

  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookedTime, setBookedTime] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [interviewLink, setInterviewLink] = useState('')

  useEffect(() => {
    if (!appId) return
    const fetchSlots = async () => {
      try {
        const res = await scheduleApi.getSlots(appId)
        setSlots(res)
      } catch (err: any) {
        toast.error(err.message || 'Failed to load slots')
      } finally {
        setLoading(false)
      }
    }
    fetchSlots()
  }, [appId])

  const handleBook = async () => {
    if (!selectedSlot) return
    setBooking(true)
    try {
      const res = await scheduleApi.bookSlot(appId, selectedSlot)
      setInterviewLink(res.unique_link)

      // Format the booked time for display
      const slot = slots.find(s => s.slot_id === selectedSlot)
      if (slot) {
        const dt = new Date(slot.start_time)
        setBookedTime(dt.toLocaleString('en-IN', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit',
        }))
      }
      setBooked(true)
      toast.success('Interview scheduled!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to book slot')
    } finally {
      setBooking(false)
    }
  }

  // Group slots by date
  const grouped: Record<string, any[]> = {}
  slots.forEach(s => {
    const dt = new Date(s.start_time)
    const dateKey = dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(s)
  })

  if (booked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2" style={{ letterSpacing: '-0.02em' }}>
            Interview Scheduled!
          </h1>
          <p className="text-gray-500 mb-2">Your interview has been confirmed for:</p>
          <p className="text-blue-600 font-bold text-lg mb-6">{bookedTime}</p>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 text-left">
            <p className="text-sm text-blue-900 font-bold mb-4 text-center">
              Your FiredIn AI Interview room is ready!
            </p>
            <div className="flex justify-center w-full">
              <Link href={interviewLink}
                className="w-full text-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all">
                Join Interview Room
              </Link>
            </div>
            <p className="text-[11px] text-blue-700 mt-4 text-center font-medium">
              * Note: Since you are testing locally, the email was blocked by Resend. Bookmark or click the link above directly!
            </p>
          </div>
          <Link href="/candidate/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-[9px]">IF</span>
          </div>
          <span className="font-black text-gray-900">FiredIn</span>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
            Schedule Your Interview
          </h1>
          <p className="text-gray-500 text-sm">
            Pick a time that works for you. The recruiter will confirm and send you the meeting details.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-600">No slots available right now</p>
            <p className="text-sm text-gray-400 mt-1">Please check back later or contact the recruiter.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              {Object.entries(grouped).map(([date, daySlots]) => (
                <div key={date}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{date}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {daySlots.map(slot => {
                      const dt = new Date(slot.start_time)
                      const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      const isSelected = selectedSlot === slot.slot_id
                      return (
                        <button
                          key={slot.slot_id}
                          onClick={() => slot.available && setSelectedSlot(slot.slot_id)}
                          disabled={!slot.available}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            !slot.available
                              ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                              : isSelected
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                              {time}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">45 min</div>
                          {isSelected && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600">
                              <CheckCircle className="w-3 h-3" /> Selected
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleBook}
              disabled={!selectedSlot || booking}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm transition-colors"
            >
              {booking ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
              ) : (
                <>Confirm Interview Slot</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    }>
      <ScheduleContent />
    </Suspense>
  )
}
