"use client"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { AuthButton } from "@/components/auth-button"

const QUESTIONS = [
  {
    id: 1,
    type: "triangle_rotation",
    question: "Watch the triangle rotate. What comes next?",
    sequence: [
      { rotation: 0, label: "Up" },      // Triangle pointing up
      { rotation: 90, label: "Right" },  // Triangle pointing right
      { rotation: 180, label: "Down" }   // Triangle pointing down
    ],
    options: [
      { id: "A", rotation: 270, label: "Left" },   // Triangle pointing left - CORRECT
      { id: "B", rotation: 45, label: "Diagonal" }, // Triangle at 45 degrees
      { id: "C", rotation: 0, label: "Up" }        // Triangle pointing up (restart)
    ],
    correctAnswer: "A" // Triangle pointing left (270 degrees) continues the pattern
  }
]

function ExaminerPatternReasoningContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session") || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentTestState, setCurrentTestState] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)

  // Render triangle with rotation (examiner view)
  const renderTriangleMirror = (rotation: number, size: "large" | "small" = "small") => {
    const triangleSize = size === "large" ? 80 : 40
    
    return (
      <div 
        className="transition-transform duration-1000 ease-in-out"
        style={{ 
          transform: `rotate(${rotation}deg)`,
          width: `${triangleSize}px`,
          height: `${triangleSize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg width={triangleSize} height={triangleSize} viewBox={`0 0 ${triangleSize} ${triangleSize}`}>
          <polygon 
            points={`${triangleSize/2},6 ${triangleSize-6},${triangleSize-6} 6,${triangleSize-6}`}
            fill="#3B82F6" 
            stroke="#1E40AF" 
            strokeWidth="1"
          />
        </svg>
      </div>
    )
  }

  useEffect(() => {
    // Get student info - only on client side
    if (typeof window !== 'undefined') {
      const sessionStudentInfo = localStorage.getItem(`session_${sessionId}_studentInfo`)
      if (sessionStudentInfo) {
        setStudentInfo(JSON.parse(sessionStudentInfo))
      }
    }

    // Poll for test state updates
    const pollTestState = () => {
      if (typeof window !== 'undefined') {
        try {
          const testState = localStorage.getItem(`patternReasoningTestState_${sessionId}`)
          const results = localStorage.getItem(`pattern_reasoning_test_${sessionId}`)
          const waitingState = localStorage.getItem(`waitingState_${sessionId}`)
          
          if (testState) {
            const state = JSON.parse(testState)
            setCurrentTestState(state)
            setCurrentQuestion(state.currentQuestion || 0)
          }
          
          if (results) {
            setTestResults(JSON.parse(results))
          }

          // Check if student is waiting
          if (waitingState) {
            const waiting = JSON.parse(waitingState)
            setCurrentTestState((prev: any) => ({
              ...prev,
              isWaiting: waiting.testComplete,
              waitingForSubtest: "complete"
            }))
          }
        } catch (error) {
          console.error("Error polling test state:", error)
        }
      }
    }

    pollTestState()
    const interval = setInterval(pollTestState, 500)

    return () => clearInterval(interval)
  }, [sessionId])

  const calculateScore = () => {
    if (testResults.length === 0) return { correct: 0, total: 0, percentage: 0 }
    
    const correct = testResults.filter(result => result.isCorrect).length
    const total = testResults.length
    const percentage = Math.round((correct / total) * 100)
    
    return { correct, total, percentage }
  }

  const completeAssessment = () => {
    if (typeof window !== 'undefined') {
      // Send command to student to complete the assessment
      const command = {
        action: "complete_test",
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(`examinerCommand_${sessionId}`, JSON.stringify(command))
      
      // Clear waiting state
      localStorage.removeItem(`waitingState_${sessionId}`)
    }
  }

  const score = calculateScore()
  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Examiner Monitor - Pattern Reasoning</h1>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Student Screen Mirror */}
          <div className="lg:col-span-2">
            <div className="bg-stone-100 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Student Screen</h2>
                <div className="text-sm text-gray-500">
                  {studentInfo ? `${studentInfo.firstName} ${studentInfo.lastName}` : 'Student'}
                </div>
              </div>
              
              {/* Mirror of student interface */}
              <div className="bg-white rounded-lg p-6 border-2 border-gray-300">
                {currentTestState?.isWaiting ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Please Wait</h3>
                    <p className="text-gray-600">The next activity will begin soon.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                      {question.question}
                    </h3>

                    {/* Triangle Pattern Display */}
                    {question.type === "triangle_rotation" && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="flex justify-center items-center space-x-4 mb-6">
                            {question.sequence.map((step, index) => (
                              <div key={index} className="text-center">
                                {renderTriangleMirror(step.rotation)}
                                <p className="text-xs text-gray-600 mt-1">{index + 1}</p>
                              </div>
                            ))}
                            <div className="text-center">
                              <div className="flex items-center justify-center" style={{width: '40px', height: '40px'}}>
                                <span className="text-2xl text-gray-400">?</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">?</p>
                            </div>
                          </div>
                          
                          {/* Show selected answer if any */}
                          {currentTestState?.answers?.[currentQuestion]?.answer && (
                            <div className="mt-4">
                              <p className="text-sm text-gray-600 mb-2">Student selected:</p>
                              <div className="flex justify-center">
                                {renderTriangleMirror(
                                  question.options.find(opt => opt.id === currentTestState.answers[currentQuestion].answer)?.rotation || 0
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Scoring Panel */}
          <div className="space-y-6">
            
            {/* Student Info */}
            {studentInfo && (
              <div className="bg-stone-100 rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Student Information</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-500">Name:</span> {studentInfo.firstName} {studentInfo.lastName}</p>
                  <p><span className="text-gray-500">Grade:</span> {studentInfo.grade}</p>
                  <p><span className="text-gray-500">Age:</span> {studentInfo.age}</p>
                </div>
              </div>
            )}

            {/* Current Score */}
            <div className="bg-stone-100 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Current Score</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900 mb-1">
                  {score.percentage}%
                </div>
                <div className="text-sm text-gray-500">
                  {score.correct} of {score.total} correct
                </div>
              </div>
            </div>

            {/* Real-time Status */}
            <div className="bg-stone-100 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Status</h3>
              <div className="space-y-2 text-sm">
                {currentTestState?.isWaiting ? (
                  <>
                    <div className="text-center p-4 bg-green-100 rounded-lg">
                      <p className="font-medium text-green-800">Pattern reasoning complete</p>
                      <p className="text-green-700 text-sm">Assessment finished</p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={completeAssessment}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Complete Assessment
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Question:</span>
                      <span>{currentQuestion + 1} of {QUESTIONS.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Student Status:</span>
                      <span className={currentTestState?.answers?.[currentQuestion]?.isComplete ? "text-green-600" : "text-yellow-600"}>
                        {currentTestState?.answers?.[currentQuestion]?.isComplete ? "Answered" : "Watching..."}
                      </span>
                    </div>
                    
                    {currentTestState?.answers?.[currentQuestion]?.answer && (
                      <div className="flex justify-between">
                        <span>Selected:</span>
                        <span className="font-medium">
                          Option {currentTestState.answers[currentQuestion].answer}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Question Details */}
            {!currentTestState?.isWaiting && (
              <div className="bg-stone-100 rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Question Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Pattern:</span>
                    <p className="font-medium">Triangle rotates 90° clockwise each step</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Sequence:</span>
                    <p className="font-medium">Up → Right → Down → ?</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Correct Answer:</span>
                    <p className="font-medium text-green-600">
                      Option {question.correctAnswer} (Left - 270°)
                    </p>
                  </div>
                  {currentTestState?.answers?.[currentQuestion]?.isComplete && (
                    <div>
                      <span className="text-gray-500">Result:</span>
                      <p className={`font-medium ${
                        currentTestState.answers[currentQuestion].answer === question.correctAnswer 
                          ? "text-green-600" 
                          : "text-red-600"
                      }`}>
                        {currentTestState.answers[currentQuestion].answer === question.correctAnswer ? "Correct ✓" : "Incorrect ✗"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ExaminerPatternReasoning() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExaminerPatternReasoningContent />
    </Suspense>
  )
}