'use client'

import InterviewRoom from '../../room/[interviewId]/page'

/**
 * Verification interview room.
 * Backend creates a `verification_interviews` row and returns `room_url` as:
 *   /candidate/verify/{interview_id}
 *
 * The realtime proxy already detects verification sessions by `interview_id`,
 * so we can reuse the standard interviewer room UI.
 */
export default function VerificationRoomPage({ params }: { params: { id: string } }) {
  return <InterviewRoom params={{ interviewId: params.id }} />
}

