"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

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

export default function StudentPatternReasoning() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: any}>({})
  const [testState, setTestState] = useState("active")
  const [animationStep, setAnimationStep] = useState(0)
  const [showAnimation, setShowAnimation] = useState(true)
  const [showOptions, setShowOptions] = useState(false)

  const replayAnimation = () => {
    setAnimationStep(0)
    setShowAnimation(true)
    setShowOptions(false)
  }

  useEffect(() => {
    // Get student info - only on client side
    if (typeof window !== 'undefined') {
      const studentData = localStorage.getItem(`student_${sessionId}`)
      if (studentData) {
        setStudentInfo(JSON.parse(studentData))
      }
    }
  }, [sessionId])

  // Handle animation sequence
  useEffect(() => {
    if (showAnimation && testState === "active") {
      const question = QUESTIONS[currentQuestion]
      const sequence = question.sequence
      
      if (animationStep < sequence.length) {
        const timer = setTimeout(() => {
          setAnimationStep(animationStep + 1)
        }, 2000) // 2 seconds between each rotation
        
        return () => clearTimeout(timer)
      } else {
        // Animation complete, show options
        const timer = setTimeout(() => {
          setShowAnimation(false)
          setShowOptions(true)
        }, 1500) // Brief pause before showing options
        
        return () => clearTimeout(timer)
      }
    }
  }, [animationStep, showAnimation, currentQuestion, testState])

  // Poll for examiner commands when in waiting state
  useEffect(() => {
    if (testState === "waiting" && typeof window !== 'undefined') {
      const pollForNextSubtest = () => {
        try {
          const examinerCommand = localStorage.getItem(`examinerCommand_${sessionId}`)
          if (examinerCommand) {
            const command = JSON.parse(examinerCommand)
            if (command.action === "complete_test") {
              localStorage.removeItem(`examinerCommand_${sessionId}`)
              setTestState("completed")
            }
          }
        } catch (error) {
          console.error("Error polling for examiner commands:", error)
        }
      }

      pollForNextSubtest()
      const interval = setInterval(pollForNextSubtest, 1000)
      return () => clearInterval(interval)
    }
  }, [testState, sessionId, router])

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers }
    newAnswers[currentQuestion] = {
      answer: answer,
      isComplete: true
    }
    
    setAnswers(newAnswers)
    
    // Update test state for examiner
    if (typeof window !== 'undefined') {
      const currentTestState = {
        currentQuestion,
        answers: newAnswers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'pattern-reasoning'
      }
      localStorage.setItem(`patternReasoningTestState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      // Reset animation for next question
      setAnimationStep(0)
      setShowAnimation(true)
      setShowOptions(false)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      // Reset animation for previous question
      setAnimationStep(0)
      setShowAnimation(true)
      setShowOptions(false)
    }
  }

  const handleFinishTest = () => {
    const testResults = QUESTIONS.map((question, index) => {
      const answer = answers[index]
      const isCorrect = answer?.answer === question.correctAnswer
      
      return {
        questionId: question.id,
        answer,
        isCorrect,
        timestamp: new Date().toISOString()
      }
    })
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pattern_reasoning_test_${sessionId}`, JSON.stringify(testResults))
      
      // Mark as waiting for examiner
      const waitingState = {
        testComplete: true,
        currentSubtest: "pattern_reasoning_complete",
        studentName: studentInfo?.firstName || 'Student'
      }
      localStorage.setItem(`waitingState_${sessionId}`, JSON.stringify(waitingState))
    }
    
    setTestState("waiting")
  }

  // Render triangle with rotation
  const renderTriangle = (rotation: number, size: "large" | "small" = "large", animate: boolean = true) => {
    const triangleSize = size === "large" ? 120 : 60
    
    return (
      <div 
        className={animate ? "transition-transform duration-1000 ease-in-out" : ""}
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
            points={`${triangleSize/2},10 ${triangleSize-10},${triangleSize-10} 10,${triangleSize-10}`}
            fill="#3B82F6" 
            stroke="#1E40AF" 
            strokeWidth="2"
          />
        </svg>
      </div>
    )
  }

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

  if (testState === "waiting") {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Wait</h2>
          <p className="text-gray-600">The next activity will begin soon.</p>
        </div>
      </div>
    )
  }

  if (testState === "completed") {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Great Job!</h2>
          <p className="text-gray-600">You completed the pattern reasoning test.</p>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">Pattern Reasoning</h1>
              <span className="text-sm text-gray-500">Welcome {studentInfo.firstName}</span>
            </div>
            <div className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {question.question}
          </h2>

          {/* Triangle Animation */}
          {question.type === "triangle_rotation" && (
            <div className="space-y-8">
              
              {showAnimation ? (
                <div className="text-center">
                  <p className="text-lg text-gray-700 mb-6">Watch the triangle rotate:</p>
                  
                  {/* Single rotating triangle in center */}
                  <div className="flex justify-center items-center mb-8">
                    <div className="flex items-center justify-center" style={{width: '160px', height: '160px'}}>
                      {renderTriangle(
                        animationStep > 0 ? question.sequence[Math.min(animationStep - 1, question.sequence.length - 1)].rotation : 0,
                        "large",
                        animationStep > 0 // Only animate during actual sequence, not on initial load
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600">
                    {animationStep === 0 ? "Get ready to watch..." : 
                     animationStep <= question.sequence.length ? `${animationStep}` :
                     "What comes next?"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Show triangle in final position with question mark */}
                  <div className="text-center mb-8">
                    <p className="text-lg text-gray-700 mb-6">What comes next?</p>
                    
                    {/* Main triangle in center - shows final rotation position */}
                    <div className="flex justify-center items-center mb-8">
                      <div className="flex items-center justify-center" style={{width: '160px', height: '160px'}}>
                        {answers[currentQuestion]?.answer ? (
                          renderTriangle(
                            question.options.find(opt => opt.id === answers[currentQuestion].answer)?.rotation || 0
                          )
                        ) : (
                          renderTriangle(180) // Show triangle in final position (pointing down)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replay button */}
                  <div className="text-center mb-6">
                    <button
                      onClick={replayAnimation}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Replay</span>
                    </button>
                  </div>

                  {/* Answer options below */}
                  {showOptions && (
                    <div>
                      <p className="text-center text-gray-700 mb-6">Choose the next rotation:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-xl mx-auto">
                        {question.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleAnswer(option.id)}
                            className={`p-6 rounded-xl border-2 transition-all ${
                              answers[currentQuestion]?.answer === option.id
                                ? "border-blue-900 bg-blue-100"
                                : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                            }`}
                          >
                            <div className="text-center">
                              <div className="flex justify-center mb-3">
                                {renderTriangle(option.rotation, "small")}
                              </div>
                              <p className="text-lg font-bold text-gray-900">{option.id}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {QUESTIONS.length}
            </div>

            {currentQuestion === QUESTIONS.length - 1 ? (
              <button
                onClick={handleFinishTest}
                disabled={!answers[currentQuestion]?.isComplete}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finish Test
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion]?.isComplete}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}