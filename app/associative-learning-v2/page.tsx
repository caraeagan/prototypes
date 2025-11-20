'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AssociativeLearningV2Entry() {
  const router = useRouter()

  useEffect(() => {
    // Generate a unique session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Redirect to the test with the session ID
    router.push(`/student/${sessionId}/associative-learning-v2`)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Loading Associative Learning V2...</p>
      </div>
    </div>
  )
}
