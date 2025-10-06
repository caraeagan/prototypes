"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

function ExaminerFigureReproductionContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session") || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentTestState, setCurrentTestState] = useState<any>(null)
  const startPage = 1
  const endPage = 5

  useEffect(() => {
    // Get student info
    const sessionStudentInfo = localStorage.getItem(`session_${sessionId}_studentInfo`)
    if (sessionStudentInfo) {
      setStudentInfo(JSON.parse(sessionStudentInfo))
    }

    // Poll for test state updates
    const pollTestState = () => {
      const testState = localStorage.getItem(`figureReproductionTestState_${sessionId}`)

      if (testState) {
        const state = JSON.parse(testState)
        setCurrentTestState(state)
      }
    }

    pollTestState()
    const interval = setInterval(pollTestState, 500)

    return () => clearInterval(interval)
  }, [sessionId])

  const handleStartTest = () => {
    // Initialize test state
    const testState = {
      testStarted: true,
      startPage,
      endPage,
      studentName: studentInfo?.firstName || 'Student',
      testType: 'figure-reproduction',
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(`figureReproductionTestState_${sessionId}`, JSON.stringify(testState))
    setCurrentTestState(testState)
  }

  const handleCompleteTest = () => {
    // Mark test as completed
    const testState = {
      ...currentTestState,
      testCompleted: true,
      completedTimestamp: new Date().toISOString()
    }
    localStorage.setItem(`figureReproductionTestState_${sessionId}`, JSON.stringify(testState))

    // Notify that test is completed
    localStorage.setItem(`test_completed_${sessionId}`, JSON.stringify({
      completed: true,
      subtest: "figure-reproduction",
      timestamp: new Date().toISOString()
    }))

    setCurrentTestState(testState)
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Marker Method</h1>
            <div className="text-lg font-semibold text-gray-700">Figure Reproduction</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
        <div>
          {/* Student Screen Mirror */}
          <div>
            <div className="bg-stone-100 rounded-lg shadow p-3">
              {/* Student View */}
              <div className="bg-white rounded-lg p-4 border-2 border-blue-500 relative mb-4">
                <div className="absolute -top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                  📱 STUDENT VIEW
                </div>

                <div className="text-center py-6">
                  {currentTestState?.testCompleted ? (
                    <div className="space-y-3">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Great Job!</h2>
                      <p className="text-sm text-gray-600">You completed the figure reproduction test.</p>
                    </div>
                  ) : currentTestState?.testStarted ? (
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold text-gray-900">Open your writing booklet</h2>
                      <div className="text-6xl">📖</div>
                      <div className="bg-stone-100 rounded-lg p-3 border-2 border-blue-300 inline-block">
                        <p className="text-lg text-gray-700 font-semibold">
                          Turn to pages {currentTestState.startPage} - {currentTestState.endPage}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold text-gray-900">Open your writing booklet to page 1</h2>
                      <div className="text-6xl">📖</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Examiner Instructions */}
              <div className="bg-blue-50 rounded-lg p-6 space-y-6">
                <div className="text-sm font-medium text-blue-900 mb-3">EXAMINER INSTRUCTIONS</div>

                {/* Note at the top */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 font-medium">
                        Student will be working in their writing booklet. Instruct student to open up their booklet.
                      </p>
                    </div>
                  </div>
                </div>

                {!currentTestState?.testStarted ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-6 border border-blue-200">
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4 text-3xl font-bold text-gray-900">
                          <span>Page {startPage}</span>
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          <span>Page {endPage}</span>
                        </div>
                        <p className="text-sm text-gray-600">Student will complete pages {startPage} through {endPage}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleStartTest}
                      className="w-full px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-semibold"
                    >
                      Start Test
                    </button>
                  </div>
                ) : !currentTestState?.testCompleted ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-6 border border-blue-200">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Student should open to:</span>
                          <span className="text-2xl font-bold text-blue-900">
                            Pages {currentTestState.startPage} - {currentTestState.endPage}
                          </span>
                        </div>

                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm text-gray-600 italic">
                            The student will complete the figure reproduction tasks in their booklet.
                            When they have finished all pages, click "Complete Test" below.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCompleteTest}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    >
                      Complete Test
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-6 border border-green-200">
                    <div className="text-center space-y-2">
                      <div className="text-green-600 font-semibold">✓ Test Completed</div>
                      <p className="text-sm text-gray-600">
                        Student completed pages {currentTestState.startPage} - {currentTestState.endPage}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ExaminerFigureReproductionTest() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExaminerFigureReproductionContent />
    </Suspense>
  )
}
