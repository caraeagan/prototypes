"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Shape {
  type: 'circle' | 'square' | 'triangle' | 'star' | 'striped-shape' | 'figure8' | 'infinity' | 'bird' | 'starburst'
  color: string
}

// Sample questions - progressively difficult with discrimination challenges
const QUESTIONS = [
  {
    id: 1,
    pattern: [
      { type: 'circle' as const, color: '#10b981' },  // green circle
      { type: 'circle' as const, color: '#ef4444' }   // red circle
    ],
    options: [
      { type: 'circle' as const, color: '#10b981' },  // green circle (correct)
      { type: 'circle' as const, color: '#ef4444' },  // red circle (correct)
      { type: 'circle' as const, color: '#3b82f6' },  // blue circle (distractor)
      { type: 'circle' as const, color: '#f59e0b' }   // orange circle (distractor)
    ]
  },
  {
    id: 2,
    pattern: [
      { type: 'circle' as const, color: '#ef4444' }, // red circle
      { type: 'square' as const, color: '#3b82f6' }  // blue square
    ],
    options: [
      { type: 'circle' as const, color: '#ef4444' },  // red circle (correct)
      { type: 'square' as const, color: '#3b82f6' },  // blue square (correct)
      { type: 'circle' as const, color: '#f97316' },  // orange circle (distractor - similar to red)
      { type: 'square' as const, color: '#06b6d4' },  // cyan square (distractor - similar to blue)
      { type: 'circle' as const, color: '#10b981' },  // green circle (distractor)
      { type: 'square' as const, color: '#8b5cf6' }   // purple square (distractor)
    ]
  },
  {
    id: 3,
    pattern: [
      { type: 'striped-shape' as const, color: '#000000' },  // striped diagonal shape
      { type: 'figure8' as const, color: '#000000' },        // figure-8 with dots
      { type: 'infinity' as const, color: '#000000' },       // infinity symbol
      { type: 'bird' as const, color: '#808080' },           // gray bird/plane
      { type: 'starburst' as const, color: '#000000' }       // starburst
    ],
    options: [
      { type: 'striped-shape' as const, color: '#000000' },  // striped diagonal (correct)
      { type: 'triangle' as const, color: '#000000' },       // triangle (distractor - similar angular)
      { type: 'figure8' as const, color: '#000000' },        // figure-8 (correct)
      { type: 'circle' as const, color: '#000000' },         // circle (distractor - similar rounded)
      { type: 'infinity' as const, color: '#000000' },       // infinity (correct)
      { type: 'square' as const, color: '#000000' },         // square (distractor)
      { type: 'bird' as const, color: '#808080' },           // bird (correct)
      { type: 'triangle' as const, color: '#808080' },       // gray triangle (distractor - similar)
      { type: 'starburst' as const, color: '#000000' },      // starburst (correct)
      { type: 'star' as const, color: '#000000' }            // star (distractor - similar)
    ]
  }
]

export default function VisualRecognitionMemoryStudent() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [testStarted, setTestStarted] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<'study' | 'recall'>('study')
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedShapes, setSelectedShapes] = useState<(Shape | null)[]>([])
  const [studyTimer, setStudyTimer] = useState(5)

  // Initialize selectedShapes when question changes
  useEffect(() => {
    const question = QUESTIONS[currentQuestion]
    setSelectedShapes(new Array(question.pattern.length).fill(null))
    setCurrentPhase('study')
    setStudyTimer(5)
  }, [currentQuestion])

  useEffect(() => {
    // Get student info from localStorage
    const storedInfo = localStorage.getItem(`session_${sessionId}_studentInfo`)
    if (storedInfo) {
      setStudentInfo(JSON.parse(storedInfo))
    }

    // Register student connection
    localStorage.setItem(`student_${sessionId}`, JSON.stringify({
      connectedAt: new Date().toISOString(),
      currentTest: 'visual-recognition-memory'
    }))
  }, [sessionId])

  // Study phase timer
  useEffect(() => {
    if (testStarted && currentPhase === 'study' && studyTimer > 0) {
      const timer = setTimeout(() => {
        setStudyTimer(studyTimer - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (studyTimer === 0 && currentPhase === 'study') {
      // Move to recall phase after study time ends
      setCurrentPhase('recall')
    }
  }, [testStarted, currentPhase, studyTimer])

  const startTest = () => {
    setTestStarted(true)
    setStudyTimer(5)
  }

  const selectShapeForPosition = (position: number, shape: Shape) => {
    const newSelection = [...selectedShapes]
    newSelection[position] = shape
    setSelectedShapes(newSelection)
  }

  const renderShape = (shape: Shape, size: number = 80) => {
    const baseStyle = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-block'
    }

    switch (shape.type) {
      case 'circle':
        return (
          <div style={{
            ...baseStyle,
            backgroundColor: shape.color,
            borderRadius: '50%'
          }} />
        )
      case 'square':
        return (
          <div style={{
            ...baseStyle,
            backgroundColor: shape.color
          }} />
        )
      case 'triangle':
        return (
          <div style={{
            width: 0,
            height: 0,
            borderLeft: `${size/2}px solid transparent`,
            borderRight: `${size/2}px solid transparent`,
            borderBottom: `${size}px solid ${shape.color}`
          }} />
        )
      case 'star':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path
              fill={shape.color}
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        )
      case 'striped-shape':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <defs>
              <pattern id="stripes" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke={shape.color} strokeWidth="4"/>
              </pattern>
            </defs>
            <path d="M 20 10 L 50 10 L 80 40 L 80 90 L 50 90 L 20 60 Z" fill="url(#stripes)" stroke={shape.color} strokeWidth="2"/>
          </svg>
        )
      case 'figure8':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <path d="M 50 20 Q 30 30 30 45 Q 30 60 50 70 Q 70 60 70 45 Q 70 30 50 20 Z M 50 70 Q 30 80 30 95 Q 30 110 50 120 Q 70 110 70 95 Q 70 80 50 70 Z"
                  fill="none" stroke={shape.color} strokeWidth="6"/>
            <circle cx="48" cy="50" r="3" fill={shape.color}/>
            <circle cx="52" cy="58" r="3" fill={shape.color}/>
          </svg>
        )
      case 'infinity':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <path d="M 20 50 Q 30 30 40 40 Q 50 50 60 40 Q 70 30 80 50 Q 70 70 60 60 Q 50 50 40 60 Q 30 70 20 50 Z"
                  fill={shape.color} stroke={shape.color} strokeWidth="2"/>
          </svg>
        )
      case 'bird':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <defs>
              <linearGradient id="birdGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#888888', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#cccccc', stopOpacity: 1}} />
              </linearGradient>
            </defs>
            <path d="M 30 50 L 50 30 L 70 50 L 65 45 L 70 40 L 75 45 L 70 50 L 50 70 Z"
                  fill="url(#birdGradient)" stroke={shape.color} strokeWidth="2"/>
          </svg>
        )
      case 'starburst':
        return (
          <svg width={size} height={size} viewBox="0 0 100 100">
            <path d="M 50 10 L 55 40 L 85 30 L 60 50 L 90 70 L 55 60 L 50 90 L 45 60 L 10 70 L 40 50 L 15 30 L 45 40 Z"
                  fill={shape.color} stroke={shape.color} strokeWidth="1"/>
          </svg>
        )
    }
  }

  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full mx-auto">
        {!testStarted ? (
          // Welcome Screen
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Visual Recognition Memory
            </h1>
            {studentInfo && (
              <p className="text-lg text-gray-600 mb-6">
                Welcome, {studentInfo.firstName}!
              </p>
            )}
            <div className="text-left max-w-2xl mx-auto mb-8 space-y-4">
              <p className="text-gray-700">
                In this activity, you'll see some shapes in a pattern. Here's what will happen:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>You'll see shapes in boxes for 5 seconds - try to remember them!</li>
                <li>The shapes will disappear</li>
                <li>You'll see numbered empty boxes</li>
                <li>Click on shapes at the bottom to fill in the pattern you remember</li>
              </ol>
            </div>
            <button
              onClick={startTest}
              className="px-8 py-4 bg-blue-900 text-white text-xl rounded-lg font-medium hover:bg-blue-800"
            >
              Start
            </button>
          </div>
        ) : (
          // Test Interface
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Top Section - Gray Background with Numbered Boxes */}
            <div className="bg-gray-200 p-8">
              {/* Instruction Text */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {currentPhase === 'study'
                    ? (question.pattern.length === 1 ? 'Look at this shape' : 'Look at these shapes')
                    : (question.pattern.length === 1 ? 'What shape did you just see?' : 'Make the pattern you just saw')
                  }
                </h2>
              </div>

              <div className="flex justify-center gap-4">
                {currentPhase === 'study' ? (
                  // Study Phase: Show the pattern
                  question.pattern.map((shape, idx) => (
                    <div key={idx} className="w-40 h-40 border-4 border-dashed border-blue-400 rounded-xl flex items-center justify-center bg-white">
                      {renderShape(shape)}
                    </div>
                  ))
                ) : (
                  // Recall Phase: Show empty numbered boxes that can be clicked to clear
                  question.pattern.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        // Clear the shape if it's already filled
                        if (selectedShapes[idx]) {
                          const newSelection = [...selectedShapes]
                          newSelection[idx] = null
                          setSelectedShapes(newSelection)
                        }
                      }}
                      className="w-40 h-40 border-4 border-dashed border-blue-400 rounded-xl flex items-center justify-center bg-white relative group hover:bg-gray-50 transition-colors"
                    >
                      {selectedShapes[idx] ? (
                        <>
                          <div className="relative">
                            {renderShape(selectedShapes[idx]!)}
                          </div>
                          {/* X button in top-right corner */}
                          <div className="absolute top-1 right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </div>
                        </>
                      ) : (
                        <span className="text-4xl font-bold text-blue-900">{idx + 1}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Divider Line */}
            <div className="border-t border-gray-300"></div>

            {/* Bottom Section - White Background with Shape Options */}
            {currentPhase === 'recall' && (
              <div className="bg-white p-8">
                <div className="flex justify-center gap-4 flex-wrap mb-8">
                  {question.options.map((shape, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const firstEmpty = selectedShapes.findIndex(s => s === null)
                        if (firstEmpty !== -1) {
                          selectShapeForPosition(firstEmpty, shape)
                        }
                      }}
                      className="w-40 h-40 border-4 border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 hover:border-blue-400 hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      {renderShape(shape, 80)}
                    </button>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    onClick={() => router.push(`/student/${sessionId}`)}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
                  >
                    Exit Test
                  </button>
                  <button
                    onClick={() => {
                      if (currentQuestion < QUESTIONS.length - 1) {
                        // Move to next question
                        setCurrentQuestion(currentQuestion + 1)
                      } else {
                        // Test complete
                        alert('Test completed! Great job!')
                        router.push(`/student/${sessionId}`)
                      }
                    }}
                    disabled={selectedShapes.some(s => s === null)}
                    className="px-6 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {currentQuestion < QUESTIONS.length - 1 ? 'Next Question' : 'Submit Answer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
