"use client"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"

const QUESTIONS = [
  {
    id: 1,
    type: "color_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { color: "red", shape: "circle", label: "Red circle" },
      { color: "red", shape: "circle", label: "Red circle" },
      { color: "blue", shape: "circle", label: "Blue circle" }
    ],
    options: [
      { id: "1", color: "yellow", shape: "circle", label: "Yellow circle" },
      { id: "2", color: "red", shape: "circle", label: "Red circle" },
      { id: "3", color: "blue", shape: "circle", label: "Blue circle" },
      { id: "4", color: "green", shape: "circle", label: "Green circle" }
    ],
    correctAnswer: "1"
  },
  {
    id: 2,
    type: "square_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { color: "blue", shape: "square", label: "Blue square" },
      { color: "blue", shape: "square", label: "Blue square" },
      { color: "yellow", shape: "square", label: "Yellow square" }
    ],
    options: [
      { id: "1", color: "blue", shape: "square", label: "Blue square" },
      { id: "2", color: "red", shape: "square", label: "Red square" },
      { id: "3", color: "yellow", shape: "square", label: "Yellow square" },
      { id: "4", color: "green", shape: "square", label: "Green square" }
    ],
    correctAnswer: "1"
  },
  {
    id: 3,
    type: "diamond_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { color: "orange", shape: "diamond", label: "Orange diamond" },
      { color: "orange", shape: "diamond", label: "Orange diamond" },
      { color: "orange", shape: "diamond", label: "Orange diamond" }
    ],
    options: [
      { id: "1", color: "orange", shape: "diamond", label: "Orange diamond" },
      { id: "2", color: "blue", shape: "diamond", label: "Blue diamond" },
      { id: "3", color: "green", shape: "diamond", label: "Green diamond" },
      { id: "4", color: "red", shape: "diamond", label: "Red diamond" }
    ],
    correctAnswer: "1"
  },
  {
    id: 4,
    type: "shape_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "circle", label: "Circle" },
      { shape: "circle", label: "Circle" },
      { shape: "circle", label: "Circle" }
    ],
    options: [
      { id: "1", shape: "square", label: "Square" },
      { id: "2", shape: "triangle", label: "Triangle" },
      { id: "3", shape: "star", label: "Star" },
      { id: "4", shape: "circle", label: "Circle" }
    ],
    correctAnswer: "4"
  },
  {
    id: 5,
    type: "shape_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "square", label: "Square" },
      { shape: "square", label: "Square" },
      { shape: "square", label: "Square" }
    ],
    options: [
      { id: "1", shape: "circle", label: "Circle" },
      { id: "2", shape: "triangle", label: "Triangle" },
      { id: "3", shape: "square", label: "Square" },
      { id: "4", shape: "star", label: "Star" }
    ],
    correctAnswer: "3"
  },
  {
    id: 6,
    type: "shape_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "triangle", label: "Triangle" },
      { shape: "triangle", label: "Triangle" },
      { shape: "triangle", label: "Triangle" }
    ],
    options: [
      { id: "1", shape: "triangle", label: "Triangle" },
      { id: "2", shape: "circle", label: "Circle" },
      { id: "3", shape: "square", label: "Square" },
      { id: "4", shape: "star", label: "Star" }
    ],
    correctAnswer: "1"
  },
  {
    id: 7,
    type: "shape_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "star", label: "Star" },
      { shape: "star", label: "Star" },
      { shape: "star", label: "Star" }
    ],
    options: [
      { id: "1", shape: "heart", label: "Heart" },
      { id: "2", shape: "circle", label: "Circle" },
      { id: "3", shape: "star", label: "Star" },
      { id: "4", shape: "square", label: "Square" }
    ],
    correctAnswer: "3"
  },
  {
    id: 8,
    type: "alternating_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "circle", label: "Circle" },
      { shape: "square", label: "Square" },
      { shape: "circle", label: "Circle" }
    ],
    options: [
      { id: "1", shape: "circle", label: "Circle" },
      { id: "2", shape: "square", label: "Square" },
      { id: "3", shape: "triangle", label: "Triangle" },
      { id: "4", shape: "star", label: "Star" }
    ],
    correctAnswer: "2"
  },
  {
    id: 9,
    type: "size_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "circle", size: "big", label: "Big circle" },
      { shape: "circle", size: "small", label: "Small circle" },
      { shape: "circle", size: "big", label: "Big circle" }
    ],
    options: [
      { id: "1", shape: "square", size: "big", label: "Big square" },
      { id: "2", shape: "circle", size: "small", label: "Small circle" },
      { id: "3", shape: "star", size: "small", label: "Small star" },
      { id: "4", shape: "triangle", label: "Triangle" }
    ],
    correctAnswer: "2"
  },
  {
    id: 10,
    type: "alternating_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "triangle", label: "Triangle" },
      { shape: "circle", label: "Circle" },
      { shape: "triangle", label: "Triangle" }
    ],
    options: [
      { id: "1", shape: "circle", label: "Circle" },
      { id: "2", shape: "square", label: "Square" },
      { id: "3", shape: "star", label: "Star" },
      { id: "4", shape: "heart", label: "Heart" }
    ],
    correctAnswer: "1"
  },
  {
    id: 11,
    type: "size_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "square", size: "big", label: "Big square" },
      { shape: "square", size: "small", label: "Small square" },
      { shape: "square", size: "big", label: "Big square" }
    ],
    options: [
      { id: "1", shape: "circle", size: "small", label: "Small circle" },
      { id: "2", shape: "square", size: "small", label: "Small square" },
      { id: "3", shape: "triangle", label: "Triangle" },
      { id: "4", shape: "heart", label: "Heart" }
    ],
    correctAnswer: "2"
  },
  {
    id: 12,
    type: "alternating_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "star", label: "Star" },
      { shape: "heart", label: "Heart" },
      { shape: "star", label: "Star" }
    ],
    options: [
      { id: "1", shape: "circle", label: "Circle" },
      { id: "2", shape: "square", label: "Square" },
      { id: "3", shape: "star", label: "Star" },
      { id: "4", shape: "heart", label: "Heart" }
    ],
    correctAnswer: "4"
  },
  {
    id: 13,
    type: "size_alternating_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "triangle", size: "big", label: "Big triangle" },
      { shape: "triangle", size: "small", label: "Small triangle" },
      { shape: "triangle", size: "big", label: "Big triangle" }
    ],
    options: [
      { id: "1", shape: "circle", label: "Circle" },
      { id: "2", shape: "triangle", size: "big", label: "Big triangle" },
      { id: "3", shape: "square", label: "Square" },
      { id: "4", shape: "triangle", size: "small", label: "Small triangle" }
    ],
    correctAnswer: "4"
  },
  {
    id: 14,
    type: "alternating_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "circle", label: "Circle" },
      { shape: "triangle", label: "Triangle" },
      { shape: "circle", label: "Circle" }
    ],
    options: [
      { id: "1", shape: "heart", label: "Heart" },
      { id: "2", shape: "square", label: "Square" },
      { id: "3", shape: "circle", label: "Circle" },
      { id: "4", shape: "triangle", label: "Triangle" }
    ],
    correctAnswer: "4"
  },
  {
    id: 15,
    type: "complex_sequence",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "circle", label: "Circle" },
      { shape: "square", label: "Square" },
      { shape: "triangle", label: "Triangle" },
      { shape: "circle", label: "Circle" }
    ],
    options: [
      { id: "1", shape: "triangle", label: "Triangle" },
      { id: "2", shape: "circle", label: "Circle" },
      { id: "3", shape: "star", label: "Star" },
      { id: "4", shape: "square", label: "Square" }
    ],
    correctAnswer: "4"
  },
  {
    id: 16,
    type: "counting_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "dot", count: 1, label: "1 dot" },
      { shape: "dot", count: 2, label: "2 dots" },
      { shape: "dot", count: 3, label: "3 dots" }
    ],
    options: [
      { id: "1", shape: "dot", count: 5, label: "5 dots" },
      { id: "2", shape: "dot", count: 6, label: "6 dots" },
      { id: "3", shape: "dot", count: 2, label: "2 dots" },
      { id: "4", shape: "dot", count: 4, label: "4 dots" }
    ],
    correctAnswer: "4"
  },
  {
    id: 17,
    type: "complex_sequence",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "square", label: "Square" },
      { shape: "triangle", label: "Triangle" },
      { shape: "circle", label: "Circle" },
      { shape: "square", label: "Square" }
    ],
    options: [
      { id: "1", shape: "circle", label: "Circle" },
      { id: "2", shape: "star", label: "Star" },
      { id: "3", shape: "square", label: "Square" },
      { id: "4", shape: "triangle", label: "Triangle" }
    ],
    correctAnswer: "4"
  },
  {
    id: 18,
    type: "size_progression",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "circle", size: "big", label: "Big circle" },
      { shape: "circle", size: "medium", label: "Medium circle" },
      { shape: "circle", size: "small", label: "Small circle" }
    ],
    options: [
      { id: "1", shape: "circle", size: "tiny", label: "Tiny circle" },
      { id: "2", shape: "square", label: "Square" },
      { id: "3", shape: "triangle", label: "Triangle" },
      { id: "4", shape: "square", size: "big", label: "Big square" }
    ],
    correctAnswer: "1"
  },
  {
    id: 19,
    type: "complex_sequence",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "triangle", label: "Triangle" },
      { shape: "star", label: "Star" },
      { shape: "heart", label: "Heart" },
      { shape: "triangle", label: "Triangle" }
    ],
    options: [
      { id: "1", shape: "heart", label: "Heart" },
      { id: "2", shape: "circle", label: "Circle" },
      { id: "3", shape: "square", label: "Square" },
      { id: "4", shape: "star", label: "Star" }
    ],
    correctAnswer: "4"
  },
  {
    id: 20,
    type: "counting_pattern",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "star", count: 1, label: "1 star" },
      { shape: "star", count: 2, label: "2 stars" },
      { shape: "star", count: 3, label: "3 stars" }
    ],
    options: [
      { id: "1", shape: "star", count: 4, label: "4 stars" },
      { id: "2", shape: "star", count: 5, label: "5 stars" },
      { id: "3", shape: "star", count: 2, label: "2 stars" },
      { id: "4", shape: "star", count: 1, label: "1 star" }
    ],
    correctAnswer: "1"
  },
  {
    id: 21,
    type: "size_progression",
    question: "What comes next in the pattern?",
    sequence: [
      { shape: "square", size: "small", label: "Small square" },
      { shape: "square", size: "medium", label: "Medium square" },
      { shape: "square", size: "big", label: "Big square" }
    ],
    options: [
      { id: "1", shape: "circle", size: "tiny", label: "Tiny circle" },
      { id: "2", shape: "triangle", label: "Triangle" },
      { id: "3", shape: "square", size: "bigger", label: "Bigger square" },
      { id: "4", shape: "star", label: "Star" }
    ],
    correctAnswer: "3"
  }
]

function ExaminerPatternReasoningContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session") || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentTestState, setCurrentTestState] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)

  // Render shape based on type, color, and size (examiner view)
  const renderShape = (item: any) => {
    const colorMap: {[key: string]: {fill: string, stroke: string}} = {
      'red': { fill: '#DC2626', stroke: '#B91C1C' },
      'blue': { fill: '#2563EB', stroke: '#1D4ED8' },
      'yellow': { fill: '#EAB308', stroke: '#CA8A04' },
      'green': { fill: '#16A34A', stroke: '#15803D' },
      'orange': { fill: '#EA580C', stroke: '#C2410C' },
      'purple': { fill: '#9333EA', stroke: '#7C3AED' }
    }

    const colors = colorMap[item.color] || { fill: '#6B7280', stroke: '#4B5563' }
    const size = item.size === 'big' ? 35 : 
                 item.size === 'small' ? 25 : 
                 item.size === 'medium' ? 30 :
                 item.size === 'tiny' ? 20 :
                 item.size === 'bigger' ? 40 : 30
    const viewBox = 50
    const center = viewBox / 2

    const commonStyle = {
      width: '60px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }

    switch (item.shape) {
      case 'circle':
        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <circle 
                cx={center} 
                cy={center} 
                r={size / 2}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )

      case 'square':
        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <rect 
                x={center - size / 2} 
                y={center - size / 2} 
                width={size} 
                height={size}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
                rx="2"
              />
            </svg>
          </div>
        )

      case 'triangle':
        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <polygon 
                points={`${center},${center - size / 2} ${center + size / 2},${center + size / 2} ${center - size / 2},${center + size / 2}`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )

      case 'diamond':
        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <polygon 
                points={`${center},${center - size / 2} ${center + size / 2},${center} ${center},${center + size / 2} ${center - size / 2},${center}`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )

      case 'star':
        const starCount = item.count || 1
        const starSize = size / 2
        const innerRadius = starSize * 0.4
        const starSpacing = 14
        const starTotalWidth = (starCount - 1) * starSpacing
        const starStartX = center - starTotalWidth / 2

        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {Array.from({ length: starCount }, (_, i) => {
                let starPoints = ''
                const starCenterX = starStartX + i * starSpacing
                for (let j = 0; j < 10; j++) {
                  const angle = (j * Math.PI) / 5
                  const radius = j % 2 === 0 ? starSize : innerRadius
                  const x = starCenterX + Math.cos(angle - Math.PI / 2) * radius
                  const y = center + Math.sin(angle - Math.PI / 2) * radius
                  starPoints += `${x},${y} `
                }
                return (
                  <polygon 
                    key={i}
                    points={starPoints}
                    fill={colors.fill} 
                    stroke={colors.stroke} 
                    strokeWidth="2"
                  />
                )
              })}
            </svg>
          </div>
        )

      case 'heart':
        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <path 
                d={`M${center},${center + size * 0.3} C${center - size * 0.5},${center - size * 0.1} ${center - size * 0.5},${center - size * 0.5} ${center},${center - size * 0.2} C${center + size * 0.5},${center - size * 0.5} ${center + size * 0.5},${center - size * 0.1} ${center},${center + size * 0.3}Z`}
                fill={colors.fill} 
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )

      case 'dot':
        const dotCount = item.count || 1
        const dotSize = 6
        const dotSpacing = 8
        const dotTotalWidth = (dotCount - 1) * dotSpacing
        const dotStartX = center - dotTotalWidth / 2

        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              {Array.from({ length: dotCount }, (_, i) => (
                <circle 
                  key={i}
                  cx={dotStartX + i * dotSpacing} 
                  cy={center} 
                  r={dotSize / 2}
                  fill={colors.fill}
                  stroke={colors.stroke} 
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>
        )

      default:
        return (
          <div style={commonStyle}>
            <svg width="50" height="50" viewBox={`0 0 ${viewBox} ${viewBox}`}>
              <circle 
                cx={center} 
                cy={center} 
                r={size / 2}
                fill={colors.fill}
                stroke={colors.stroke} 
                strokeWidth="2"
              />
            </svg>
          </div>
        )
    }
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                Dashboard
              </button>
              <div className="text-sm text-gray-600">Pattern Reasoning</div>
            </div>
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
                ) : question ? (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                      {question.question}
                    </h3>

                    {/* Pattern Display */}
                    <div className="space-y-6">
                      <div className="text-center">
                        {/* Show the pattern sequence */}
                        <div className="flex justify-center items-center mb-6 gap-6">
                          {question.sequence.map((step: any, index) => (
                            <div key={index} className="flex flex-col items-center">
                              <div className="w-16 h-16 border-2 border-gray-300 rounded-xl flex items-center justify-center bg-white shadow-sm mb-2">
                                {renderShape(step)}
                              </div>
                              <p className="text-sm font-bold text-gray-900">{index + 1}</p>
                            </div>
                          ))}
                          
                          {/* Fourth position */}
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 border-2 border-dashed border-blue-900 rounded-xl flex items-center justify-center bg-blue-50 shadow-sm mb-2">
                              {currentTestState?.answers?.[currentQuestion]?.answer ? (
                                renderShape(
                                  question.options.find((opt: any) => opt.id === currentTestState.answers[currentQuestion].answer) || {}
                                )
                              ) : (
                                <span className="text-xl text-blue-900 font-bold">?</span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-gray-900">4</p>
                          </div>
                        </div>
                        
                        {/* Light grey divider line */}
                        <div className="border-t border-gray-300 mx-8 mb-6"></div>
                        
                        {/* Show answer options */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto">
                          {question.options.map((option: any) => (
                            <div key={option.id} className="flex flex-col items-center">
                              <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center mb-2 ${
                                currentTestState?.answers?.[currentQuestion]?.answer === option.id
                                  ? "border-blue-900 bg-blue-100"
                                  : "border-gray-300 bg-white"
                              }`}>
                                {renderShape(option)}
                              </div>
                              <p className="text-sm font-bold text-gray-900">{option.id}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading question...</p>
                  </div>
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
            {!currentTestState?.isWaiting && question && (
              <div className="bg-stone-100 rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">Question Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Pattern:</span>
                    <p className="font-medium">
                      {question.type === "diamond_pattern"
                        ? "Diamond repetition pattern"
                        : question.type === "shape_pattern"
                        ? "Shape repetition pattern"
                        : question.type === "alternating_pattern"
                        ? "Alternating shape pattern"
                        : question.type === "size_pattern"
                        ? "Size alternating pattern"
                        : question.type === "size_alternating_pattern"
                        ? "Size alternating pattern"
                        : "Shape pattern"
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Sequence:</span>
                    <p className="font-medium">
                      {question.sequence.map((step: any, index: number) => 
                        step.label || `${step.shape}${step.size ? ` (${step.size})` : ''}${step.color ? ` ${step.color}` : ''}`
                      ).join(" → ")} → ?
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Correct Answer:</span>
                    <p className="font-medium text-green-600">
                      Option {question.correctAnswer} (
                      {question.options.find((opt: any) => opt.id === question.correctAnswer)?.label || "Correct option"}
                      )
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