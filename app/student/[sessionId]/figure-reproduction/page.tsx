"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

export default function StudentFigureReproductionTest() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [testState, setTestState] = useState<any>(null)

  useEffect(() => {
    // Get student info
    const studentData = localStorage.getItem(`student_${sessionId}`)
    if (studentData) {
      setStudentInfo(JSON.parse(studentData))
    }

    // Poll for test state updates from examiner
    const pollTestState = () => {
      const state = localStorage.getItem(`figureReproductionTestState_${sessionId}`)
      if (state) {
        setTestState(JSON.parse(state))
      }
    }

    pollTestState()
    const interval = setInterval(pollTestState, 500)

    return () => clearInterval(interval)
  }, [sessionId])

  if (!studentInfo) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-stone-100 rounded-xl shadow-lg p-12 max-w-2xl w-full">
        {testState?.testCompleted ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Great Job!</h2>
            <p className="text-xl text-gray-600">You completed the figure reproduction test.</p>
          </div>
        ) : testState?.testStarted ? (
          <div className="text-center space-y-6">
            <h2 className="text-4xl font-bold text-gray-900">Open your writing booklet</h2>
            <div className="text-9xl">📖</div>
            <div className="bg-white rounded-lg p-6 border-2 border-blue-300">
              <p className="text-2xl text-gray-700 font-semibold">
                Turn to pages {testState.startPage} - {testState.endPage}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <h2 className="text-4xl font-bold text-gray-900">Open your writing booklet to page 1</h2>
            <div className="text-9xl">📖</div>
          </div>
        )}
      </div>
    </div>
  )
}
