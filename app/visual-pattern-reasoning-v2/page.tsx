"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function VisualPatternReasoningV2Entry() {
  const router = useRouter()

  useEffect(() => {
    // Generate a simple session ID
    const sessionId = `vpr-${Date.now()}`

    // Redirect to the test
    router.push(`/student/${sessionId}/visual-pattern-reasoning-v2`)
  }, [router])

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center space-x-3">
          <svg className="w-6 h-6 animate-spin text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-700">Loading Visual Pattern Reasoning V2...</p>
        </div>
      </div>
    </div>
  )
}
