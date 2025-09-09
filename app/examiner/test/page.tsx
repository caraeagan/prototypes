"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { AuthButton } from "@/components/auth-button"

const QUESTIONS = [
  {
    id: 1,
    type: "finger_count",
    question: "Without counting, how many fingers do you see on this hand?",
    correctAnswer: 2 // 2 fingers shown
  },
  {
    id: 2,
    type: "comparison", 
    question: "Which is taller, a kangaroo or a giraffe?",
    objectA: {
      name: "Kangaroo",
      emoji: "🦘",
      size: "medium"
    },
    objectB: {
      name: "Giraffe",
      emoji: "🦒", 
      size: "tall"
    },
    correctAnswer: "B" // Giraffe is taller
  },
  {
    id: 3,
    type: "circles_yesno",
    question: "Are all these circles the same size?",
    correctAnswer: "no", // Correct answer is "no"
    differentCirclePosition: 15 // Circle at position 15 is slightly larger (for display only)
  },
  {
    id: 4,
    type: "circles_select",
    question: "Which circle is a different size?",
    correctAnswer: 15, // Circle at position 15 (0-indexed) is slightly larger
    differentCirclePosition: 15
  },
  {
    id: 5,
    type: "area_estimation",
    question: "Each figure below is made up of a shape inside of a square. Which figure do you think shows the square and a figure that are about the same area?",
    figures: [
      { id: 1, description: "Circle in square", shape: "circle" },
      { id: 2, description: "Plus shape in square", shape: "plus" },
      { id: 3, description: "Triangle in square", shape: "triangle" },
      { id: 4, description: "Diamond in square", shape: "diamond" },
      { id: 5, description: "Hexagon in square", shape: "hexagon" },
      { id: 6, description: "Cross in square", shape: "cross" }
    ],
    correctAnswer: 4 // Diamond has approximately the same area as the square
  },
  {
    id: 6,
    type: "weight_comparison",
    question: "Which weighs more, a feather or a rock?",
    objectA: {
      name: "Feather",
      emoji: "🪶",
      size: "light"
    },
    objectB: {
      name: "Rock",
      emoji: "🪨", 
      size: "heavy"
    },
    correctAnswer: "B" // Rock weighs more
  },
  {
    id: 7,
    type: "dots_yesno",
    question: "Are all these dots the same size?",
    correctAnswer: "no", // Correct answer is "no" - dots are different sizes
    smallestDotPosition: 8 // Dot at position 8 is the smallest
  },
  {
    id: 8,
    type: "dots_select_smallest",
    question: "Which dot is the smallest?",
    correctAnswer: 8, // Dot at position 8 is the smallest
    smallestDotPosition: 8,
    showOnlyIf: { previousQuestionId: 7, previousAnswer: "no" } // Only show if previous question was answered "no"
  },
  {
    id: 9,
    type: "liquid_capacity",
    question: "Which of these do you think holds the most water or liquid?",
    containers: [
      { id: 1, description: "Red bucket", name: "Bucket", emoji: "🪣" },
      { id: 2, description: "Water bottle", name: "Water Bottle", emoji: "🍼" },
      { id: 3, description: "Cement mixer truck", name: "Cement Truck", emoji: "🚛" },
      { id: 4, description: "Soda can", name: "Soda Can", emoji: "🥤" },
      { id: 5, description: "Glass pitcher", name: "Pitcher", emoji: "🫖" },
      { id: 6, description: "Water cooler jug", name: "Water Jug", emoji: "🏺" },
      { id: 7, description: "Coffee cup", name: "Coffee Cup", emoji: "☕" },
      { id: 8, description: "Glass jar", name: "Glass Jar", emoji: "🫙" }
    ],
    correctAnswer: 3 // Cement mixer truck holds the most liquid
  },
  {
    id: 10,
    type: "messy_room_comparison",
    question: "Here are two pictures of messy bedrooms. It's now time to clean them up. If both kids clean their room at the same rate, which one will take longer to clear their room up?",
    roomA: {
      name: "Room A",
      description: "First messy bedroom",
      image: "/images/messy-room-1.jpg", // Will need to save the first image here
      messiness: "moderate"
    },
    roomB: {
      name: "Room B", 
      description: "Second messy bedroom",
      image: "/images/messy-room-2.jpg", // Will need to save the second image here
      messiness: "high"
    },
    correctAnswer: "B" // Assuming room B is messier and will take longer to clean
  },
  {
    id: 11,
    type: "finger_comparison",
    question: "Which hand had more fingers up?",
    leftHand: {
      name: "Left Hand",
      fingers: 3,
      image: "/images/hand-3-fingers.png"
    },
    rightHand: {
      name: "Right Hand", 
      fingers: 5,
      image: "/images/hand-5-fingers.png"
    },
    correctAnswer: "right", // Right hand has more fingers (5 vs 3)
    displayTime: 5000 // Show hands for 5 seconds before they disappear
  },
  {
    id: 12,
    type: "audio_estimation",
    question: "Do you think there are more than 50 people cheering or less than 50 people cheering?",
    instruction: "Listen to this",
    audioFile: "/audio/crowd-cheering.mp3", // Audio file to be added
    correctAnswer: "more", // Assuming the crowd sounds like more than 50 people
    estimationThreshold: 50
  },
  {
    id: 13,
    type: "audio_duration_comparison",
    question: "Which sound was longer?",
    instruction: "Listen to both sounds, then choose which one was longer",
    audioA: {
      name: "Sound A",
      file: "/audio/sound-a.mp3",
      duration: 2000 // 2 seconds
    },
    audioB: {
      name: "Sound B", 
      file: "/audio/sound-b.mp3",
      duration: 4000 // 4 seconds
    },
    correctAnswer: "B" // Sound B is longer
  }
]

function ExaminerTestContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session") || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentTestState, setCurrentTestState] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)

  // Create circle grid component for examiner view
  const renderCircleGridMirror = (question: any, studentAnswers: any, isSelectableQuestion = false) => {
    const circles = []
    
    // Same random positions as student interface but scaled for examiner view
    const positions = [
      { top: '10%', left: '15%' }, { top: '8%', left: '45%' }, { top: '12%', left: '75%' },
      { top: '18%', left: '30%' }, { top: '22%', left: '60%' }, { top: '25%', left: '85%' },
      { top: '28%', left: '10%' }, { top: '32%', left: '40%' }, { top: '35%', left: '70%' },
      { top: '40%', left: '25%' }, { top: '38%', left: '55%' }, { top: '42%', left: '80%' },
      { top: '48%', left: '18%' }, { top: '52%', left: '48%' }, { top: '50%', left: '75%' },
      { top: '58%', left: '35%' }, { top: '62%', left: '65%' }, { top: '60%', left: '90%' },
      { top: '68%', left: '20%' }, { top: '72%', left: '50%' }, { top: '70%', left: '80%' },
      { top: '78%', left: '10%' }, { top: '82%', left: '40%' }, { top: '85%', left: '65%' }
    ]
    
    for (let i = 0; i < 24; i++) {
      const isLarger = i === question.differentCirclePosition
      const isSelected = isSelectableQuestion && studentAnswers?.answer === i
      const position = positions[i]
      
      circles.push(
        <div
          key={i}
          className={`absolute rounded-full transition-all ${
            isSelected 
              ? "bg-blue-900 border-2 border-blue-900" 
              : "bg-green-300 border-2 border-green-300"
          }`}
          style={{
            width: isLarger ? "32px" : "26px",
            height: isLarger ? "32px" : "26px",
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -50%)'
          }}
        />
      )
    }
    
    return (
      <div className="relative w-full h-64 max-w-lg mx-auto">
        {circles}
      </div>
    )
  }

  // Render geometric figures for area estimation (examiner view)
  const renderFigureMirror = (figureData: any, isSelected = false) => {
    const { id, shape } = figureData
    const size = 60 // Smaller SVG size for examiner view
    
    const svgClass = `transition-all ${isSelected ? 'stroke-blue-900' : 'stroke-gray-800'}`
    
    const figures = {
      circle: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="1"/>
          <circle cx={size/2} cy={size/2} r={(size-6)/2} fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      ),
      plus: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="1"/>
          <rect x="3" y="3" width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="1"/>
          <rect x={size-size/3+1} y="3" width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="1"/>
          <rect x="3" y={size-size/3+1} width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="1"/>
          <rect x={size-size/3+1} y={size-size/3+1} width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      ),
      triangle: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="1"/>
          <polygon points={`${size/2},3 ${size-3},${size-3} 3,${size-3}`} fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      ),
      diamond: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="1"/>
          <polygon points={`${size/2},3 ${size-3},${size/2} ${size/2},${size-3} 3,${size/2}`} fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      ),
      hexagon: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="1"/>
          <polygon points={`${size/2-15},8 ${size/2+15},8 ${size/2+22},${size/2} ${size/2+15},${size-8} ${size/2-15},${size-8} ${size/2-22},${size/2}`} fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      ),
      cross: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="1"/>
          <polygon points={`${size/2-12},6 ${size/2+12},6 ${size/2+12},${size/2-12} ${size-4},${size/2-12} ${size-4},${size/2+12} ${size/2+12},${size/2+12} ${size/2+12},${size-4} ${size/2-12},${size-4} ${size/2-12},${size/2+12} 4,${size/2+12} 4,${size/2-12} ${size/2-12},${size/2-12}`} fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      )
    }
    
    return (figures as any)[shape] || <div>Shape not found</div>
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
          const testState = localStorage.getItem(`testState_${sessionId}`)
          const results = localStorage.getItem(`test_${sessionId}`)
          const waitingState = localStorage.getItem(`waitingState_${sessionId}`)
          
          if (testState) {
            const state = JSON.parse(testState)
            setCurrentTestState(state)
            setCurrentQuestion(state.currentQuestion || 0)
          }
          
          if (results) {
            setTestResults(JSON.parse(results))
          }

          // Check if student is waiting for next subtest
          if (waitingState) {
            const waiting = JSON.parse(waitingState)
            setCurrentTestState((prev: any) => ({
              ...prev,
              isWaiting: waiting.testComplete,
              waitingForSubtest: "analogies"
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

  const startAnalogiesSubtest = () => {
    if (typeof window !== 'undefined') {
      // Send command to student to start analogies subtest
      const command = {
        action: "start_analogies",
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(`examinerCommand_${sessionId}`, JSON.stringify(command))
      
      // Clear waiting state
      localStorage.removeItem(`waitingState_${sessionId}`)
      
      // Navigate examiner to analogies monitoring page
      window.location.assign(`/examiner/analogies?session=${sessionId}`)
    }
  }

  const startPatternReasoningSubtest = () => {
    if (typeof window !== 'undefined') {
      // Send command to student to start pattern reasoning subtest
      const command = {
        action: "start_pattern_reasoning",
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(`examinerCommand_${sessionId}`, JSON.stringify(command))
      
      // Clear waiting state
      localStorage.removeItem(`waitingState_${sessionId}`)
      
      // Navigate examiner to pattern reasoning monitoring page
      window.location.assign(`/examiner/pattern-reasoning?session=${sessionId}`)
    }
  }

  const score = calculateScore()
  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Examiner Monitor - Value Estimation</h1>
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

                    {/* Finger Count Question */}
                    {question.type === "finger_count" && (
                      <div className="space-y-6">
                        {/* Hand display */}
                        <div className="text-center">
                          <div className="text-6xl mb-4">✌️</div>
                          <p className="text-xs text-gray-500 mb-6">Look carefully at this hand</p>
                        </div>
                        
                        {/* Student's input display */}
                        <div className="flex justify-center">
                          <div className="text-center">
                            <div className="w-16 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-white">
                              <span className="text-2xl font-bold text-gray-900">
                                {currentTestState?.answers?.[currentQuestion]?.answer || "?"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Student's answer</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Comparison Question */}
                    {(question.type === "comparison" || question.type === "weight_comparison") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Option A */}
                        <div className={`p-6 rounded-lg border-2 ${
                          currentTestState?.answers?.[currentQuestion]?.answer === "A" 
                            ? "border-blue-900 bg-blue-100" 
                            : "border-gray-300"
                        }`}>
                          <div className="text-center">
                            <div className="text-6xl mb-3">{question.objectA?.emoji}</div>
                            <p className="text-base font-medium text-gray-900">{question.objectA?.name}</p>
                          </div>
                        </div>

                        {/* Option B */}
                        <div className={`p-6 rounded-lg border-2 ${
                          currentTestState?.answers?.[currentQuestion]?.answer === "B" 
                            ? "border-blue-900 bg-blue-100" 
                            : "border-gray-300"
                        }`}>
                          <div className="text-center">
                            <div className="text-6xl mb-3">{question.objectB?.emoji}</div>
                            <p className="text-base font-medium text-gray-900">{question.objectB?.name}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Messy Room Comparison */}
                    {question.type === "messy_room_comparison" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Room A */}
                        <div className={`p-4 rounded-lg border-2 ${
                          currentTestState?.answers?.[currentQuestion]?.answer === "A" 
                            ? "border-blue-900 bg-blue-100" 
                            : "border-gray-300"
                        }`}>
                          <div className="text-center">
                            <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                              {question.roomA?.image ? (
                                <img 
                                  src={question.roomA.image} 
                                  alt={question.roomA.description}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-4xl">🏠</div>
                              )}
                            </div>
                            <p className="text-base font-medium text-gray-900">{question.roomA?.name}</p>
                          </div>
                        </div>

                        {/* Room B */}
                        <div className={`p-4 rounded-lg border-2 ${
                          currentTestState?.answers?.[currentQuestion]?.answer === "B" 
                            ? "border-blue-900 bg-blue-100" 
                            : "border-gray-300"
                        }`}>
                          <div className="text-center">
                            <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                              {question.roomB?.image ? (
                                <img 
                                  src={question.roomB.image} 
                                  alt={question.roomB.description}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-4xl">🏠</div>
                              )}
                            </div>
                            <p className="text-base font-medium text-gray-900">{question.roomB?.name}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Circles Yes/No Question */}
                    {question.type === "circles_yesno" && (
                      <div className="space-y-6">
                        {renderCircleGridMirror(question, currentTestState?.answers?.[currentQuestion], false)}
                        
                        <div className="flex justify-center space-x-4">
                          <div className={`px-6 py-3 rounded-lg border-2 ${
                            currentTestState?.answers?.[currentQuestion]?.answer === "yes" 
                              ? "border-blue-900 bg-blue-100" 
                              : "border-gray-300"
                          }`}>
                            <span className="text-base font-medium text-gray-900">Yes</span>
                          </div>
                          <div className={`px-6 py-3 rounded-lg border-2 ${
                            currentTestState?.answers?.[currentQuestion]?.answer === "no" 
                              ? "border-blue-900 bg-blue-100" 
                              : "border-gray-300"
                          }`}>
                            <span className="text-base font-medium text-gray-900">No</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Circle Selection Question */}
                    {question.type === "circles_select" && (
                      <div className="space-y-4">
                        <div className="text-center text-gray-600 text-sm">
                          Click on the circle that is different
                        </div>
                        {renderCircleGridMirror(question, currentTestState?.answers?.[currentQuestion], true)}
                      </div>
                    )}

                    {/* Area Estimation Question */}
                    {question.type === "area_estimation" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {question.figures?.map((figure) => (
                            <div
                              key={figure.id}
                              className={`p-2 rounded-lg border-2 ${
                                currentTestState?.answers?.[currentQuestion]?.answer === figure.id
                                  ? "border-blue-900 bg-blue-100"
                                  : "border-gray-300"
                              }`}
                            >
                              <div className="text-center">
                                <div className="mb-1">
                                  {renderFigureMirror(figure, currentTestState?.answers?.[currentQuestion]?.answer === figure.id)}
                                </div>
                                <p className="text-xs font-medium text-gray-900">{figure.id}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Liquid Capacity Question */}
                    {question.type === "liquid_capacity" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {question.containers?.map((container) => (
                            <div
                              key={container.id}
                              className={`p-3 rounded-lg border-2 ${
                                currentTestState?.answers?.[currentQuestion]?.answer === container.id
                                  ? "border-blue-900 bg-blue-100"
                                  : "border-gray-300"
                              }`}
                            >
                              <div className="text-center">
                                <div className="text-2xl mb-2">{container.emoji}</div>
                                <p className="text-xs font-medium text-gray-900">{container.name}</p>
                              </div>
                            </div>
                          ))}
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
                    <div className="text-center p-4 bg-yellow-100 rounded-lg">
                      <p className="font-medium text-yellow-800">Student is waiting</p>
                      <p className="text-yellow-700 text-sm">Value estimation complete</p>
                    </div>
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Next Subtest: Analogies</h4>
                      <button
                        onClick={startAnalogiesSubtest}
                        className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        Start Analogies Subtest
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
                        {currentTestState?.answers?.[currentQuestion]?.isComplete ? "Answered" : "Thinking..."}
                      </span>
                    </div>
                    
                    {/* Show different status based on question type */}
                    {(question.type === "comparison" || question.type === "weight_comparison") && currentTestState?.answers?.[currentQuestion]?.answer && (
                      <div className="flex justify-between">
                        <span>Selected:</span>
                        <span className="font-medium">
                          {currentTestState.answers[currentQuestion].answer === "A" ? question.objectA?.name : question.objectB?.name}
                        </span>
                      </div>
                    )}

                    {question.type === "messy_room_comparison" && currentTestState?.answers?.[currentQuestion]?.answer && (
                      <div className="flex justify-between">
                        <span>Selected:</span>
                        <span className="font-medium">
                          {currentTestState.answers[currentQuestion].answer === "A" ? question.roomA?.name : question.roomB?.name}
                        </span>
                      </div>
                    )}
                    
                    {question.type === "circles_yesno" && currentTestState?.answers?.[currentQuestion]?.answer && (
                      <div className="flex justify-between">
                        <span>Same Size:</span>
                        <span className="font-medium capitalize">
                          {currentTestState.answers[currentQuestion].answer}
                        </span>
                      </div>
                    )}

                    {question.type === "circles_select" && currentTestState?.answers?.[currentQuestion]?.answer !== null && currentTestState?.answers?.[currentQuestion]?.answer !== undefined && (
                      <div className="flex justify-between">
                        <span>Circle Selected:</span>
                        <span className="font-medium">#{currentTestState.answers[currentQuestion].answer + 1}</span>
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
                    <span className="text-gray-500">Question:</span>
                    <p className="font-medium">{question.question}</p>
                  </div>
                  
                  {question.type === "finger_count" && (
                    <>
                      <div>
                        <span className="text-gray-500">Correct Answer:</span>
                        <p className="font-medium text-green-600">
                          {question.correctAnswer} fingers
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
                    </>
                  )}

                  {(question.type === "comparison" || question.type === "weight_comparison") && (
                    <>
                      <div>
                        <span className="text-gray-500">Correct Answer:</span>
                        <p className="font-medium text-green-600">
                          {question.correctAnswer === "A" ? question.objectA?.name : question.objectB?.name}
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
                    </>
                  )}

                  {question.type === "messy_room_comparison" && (
                    <>
                      <div>
                        <span className="text-gray-500">Correct Answer:</span>
                        <p className="font-medium text-green-600">
                          {question.correctAnswer === "A" ? question.roomA?.name : question.roomB?.name} (messier room takes longer to clean)
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
                    </>
                  )}

                  {question.type === "circles_yesno" && (
                    <>
                      <div>
                        <span className="text-gray-500">Correct Answer:</span>
                        <p className="font-medium text-green-600">
                          {question.correctAnswer} (circles are NOT all the same size)
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
                    </>
                  )}

                  {question.type === "circles_select" && (
                    <>
                      <div>
                        <span className="text-gray-500">Correct Answer:</span>
                        <p className="font-medium text-green-600">
                          Circle #{Number(question.correctAnswer) + 1} (the larger circle)
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
                    </>
                  )}

                  {question.type === "area_estimation" && (
                    <>
                      <div>
                        <span className="text-gray-500">Correct Answer:</span>
                        <p className="font-medium text-green-600">
                          Figure #{question.correctAnswer} (Diamond - same area as square)
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
                    </>
                  )}

                  {question.type === "liquid_capacity" && (
                    <>
                      <div>
                        <span className="text-gray-500">Correct Answer:</span>
                        <p className="font-medium text-green-600">
                          {question.containers?.find(c => c.id === question.correctAnswer)?.name} (holds the most liquid)
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
                    </>
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

export default function ExaminerTest() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExaminerTestContent />
    </Suspense>
  )
}