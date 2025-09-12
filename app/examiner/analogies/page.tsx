"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import Image from "next/image"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

const QUESTIONS = [
  {
    id: 1,
    type: "visual_analogy",
    question: "",
    analogy: {
      imageA: "/images/bottle.png", // Bottle
      imageB: "/images/baby-drinking.png", // Baby drinking
      imageC: "/images/spoon.png", // Spoon
    },
    options: [
      { id: "A", image: "/images/bowl.png" }, // Bowl
      { id: "B", image: "/images/fork.png" }, // Fork
      { id: "C", image: "/images/baby-eating.png" }  // Baby eating with spoon
    ],
    correctAnswer: "C" // Baby eating with spoon
  },
  {
    id: 2,
    type: "verbal_analogy",
    question: "",
    analogy: {
      wordA: "thermometer",
      wordB: "temperature", 
      wordC: "compass"
    },
    correctAnswer: "direction", // Expected answer: compass measures direction, like thermometer measures temperature
    instructions: "The examiner will type what you say."
  }
]

function ExaminerAnalogiesContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session") || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentTestState, setCurrentTestState] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [verbalScores, setVerbalScores] = useState<{[key: number]: {score: string, response: string}}>({})
  const [customResponses, setCustomResponses] = useState<{[key: number]: string}>({})

  useEffect(() => {
    // Get student info
    const sessionStudentInfo = localStorage.getItem(`session_${sessionId}_studentInfo`)
    if (sessionStudentInfo) {
      setStudentInfo(JSON.parse(sessionStudentInfo))
    }

    // Poll for test state updates
    const pollTestState = () => {
      const testState = localStorage.getItem(`analogiesTestState_${sessionId}`)
      const results = localStorage.getItem(`analogies_test_${sessionId}`)
      
      if (testState) {
        const state = JSON.parse(testState)
        setCurrentTestState(state)
        setCurrentQuestion(state.currentQuestion || 0)
      }
      
      if (results) {
        setTestResults(JSON.parse(results))
      }
    }

    pollTestState()
    const interval = setInterval(pollTestState, 500)

    return () => clearInterval(interval)
  }, [sessionId])

  const calculateScore = () => {
    if (testResults.length === 0) {
      // Calculate in-progress scores from current session
      let totalPoints = 0
      let maxPossiblePoints = 0
      
      QUESTIONS.forEach((q, index) => {
        maxPossiblePoints += 2 // Each question worth 2 points max
        
        if (q.type === "visual_analogy" && currentTestState?.answers?.[index]) {
          // Visual analogy scoring
          if (currentTestState.answers[index].answer === q.correctAnswer) {
            totalPoints += 2
          }
        } else if (q.type === "verbal_analogy" && verbalScores[index]?.score) {
          // Verbal analogy scoring
          const score = verbalScores[index].score
          if (score === 'correct-direction' || score === 'correct-navigation' || score === 'custom-correct') {
            totalPoints += 2
          } else if (score === 'partial-nav' || score === 'custom-partial') {
            totalPoints += 1
          }
          // wrong-pointing, wrong-map, custom-wrong = 0 points
        }
      })
      
      const percentage = maxPossiblePoints > 0 ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0
      return { correct: totalPoints, total: maxPossiblePoints, percentage }
    }
    
    const correct = testResults.filter(result => result.isCorrect).length
    const total = testResults.length
    const percentage = Math.round((correct / total) * 100)
    
    return { correct, total, percentage }
  }


  const score = calculateScore()
  const question = QUESTIONS[currentQuestion]

  // Navigation functions to control student side
  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      const nextQuestion = currentQuestion + 1
      setCurrentQuestion(nextQuestion)
      
      // Update test state for student
      const currentTestState = {
        currentQuestion: nextQuestion,
        answers: {},
        studentName: studentInfo?.firstName || 'Student',
        testType: 'analogies'
      }
      localStorage.setItem(`analogiesTestState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prevQuestion = currentQuestion - 1
      setCurrentQuestion(prevQuestion)
      
      // Update test state for student
      const currentTestState = {
        currentQuestion: prevQuestion,
        answers: {},
        studentName: studentInfo?.firstName || 'Student',
        testType: 'analogies'
      }
      localStorage.setItem(`analogiesTestState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Marker Method</h1>
            <div className="text-lg font-semibold text-gray-700">Analogies</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
        <div>
          
          {/* Student Screen Mirror */}
          <div>
            <div className="bg-stone-100 rounded-lg shadow p-3">
              {/* Student View - Only Analogy Content */}
              <div className="bg-white rounded-lg p-3 border-2 border-blue-500 relative mb-4">
                <div className="absolute -top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                  📱 STUDENT VIEW
                </div>
                {/* Analogy Display */}
                <div className="space-y-3">
                  {question.type === "visual_analogy" ? (
                    // Visual analogy display
                    <>
                      {/* Top row: A relates to B */}
                      <div className="flex items-center justify-center space-x-6">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center">
                            <Image
                              src={question.analogy.imageA}
                              alt="Image A"
                              width={60}
                              height={60}
                              className="rounded"
                            />
                          </div>
                        </div>
                        
                        <div className="text-2xl text-gray-400">:</div>
                        
                        <div className="text-center">
                          <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center">
                            <Image
                              src={question.analogy.imageB}
                              alt="Image B"
                              width={60}
                              height={60}
                              className="rounded"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: C relates to ? */}
                      <div className="flex items-center justify-center space-x-6">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-white rounded-lg border border-gray-300 flex items-center justify-center">
                            <Image
                              src={question.analogy.imageC}
                              alt="Image C"
                              width={60}
                              height={60}
                              className="rounded"
                            />
                          </div>
                        </div>
                        
                        <div className="text-2xl text-gray-400">:</div>
                        
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center relative">
                            {currentTestState?.answers?.[currentQuestion]?.answer ? (
                              <>
                                <Image
                                  src={question.options.find(opt => opt.id === currentTestState.answers[currentQuestion].answer)?.image || ""}
                                  alt="Selected answer"
                                  width={60}
                                  height={60}
                                  className="rounded"
                                />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                                  ×
                                </div>
                              </>
                            ) : (
                              <span className="text-3xl text-gray-400">?</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Answer options mirror */}
                      <div className="border-t pt-6 mt-6">
                        <div className="flex justify-center space-x-4">
                          {question.options.map((option) => (
                            <div
                              key={option.id}
                              className={`w-16 h-16 bg-white rounded-lg border-2 flex items-center justify-center ${
                                currentTestState?.answers?.[currentQuestion]?.answer === option.id
                                  ? "border-blue-900 bg-blue-100"
                                  : "border-gray-300"
                              }`}
                            >
                              <Image
                                src={option.image}
                                alt={`Option ${option.id}`}
                                width={50}
                                height={50}
                                className="rounded"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Verbal analogy display - matches student interface
                    <>
                      <div className="space-y-3">
                        {/* Top row */}
                        <div className="flex items-center justify-center">
                          <div className="w-40 text-center">
                            <div className="bg-white rounded-lg border border-gray-300 shadow px-3 py-4">
                              <span className="text-lg font-semibold text-gray-900">{question.analogy.wordA}</span>
                            </div>
                          </div>
                          
                          <div className="w-8 text-center">
                            <div className="text-3xl text-gray-400 font-bold">:</div>
                          </div>
                          
                          <div className="w-40 text-center">
                            <div className="bg-white rounded-lg border border-gray-300 shadow px-3 py-4">
                              <span className="text-lg font-semibold text-gray-900">{question.analogy.wordB}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-center justify-center">
                          <div className="w-40 text-center">
                            <div className="bg-white rounded-lg border border-gray-300 shadow px-3 py-4">
                              <span className="text-lg font-semibold text-gray-900">{question.analogy.wordC}</span>
                            </div>
                          </div>
                          
                          <div className="w-8 text-center">
                            <div className="text-3xl text-gray-400 font-bold">:</div>
                          </div>
                          
                          <div className="w-40 text-center">
                            <div className="bg-white rounded-lg border border-gray-300 shadow px-3 py-4">
                              {currentTestState?.answers?.[currentQuestion]?.answer === "verbal_response_given" ? (
                                <span className="text-lg font-semibold text-green-600">✓</span>
                              ) : (
                                <span className="text-2xl text-gray-400">?</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Examiner Scoring Interface - Separate from Student View */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-900 mb-3">EXAMINER SCORING</div>
                {question.type === "verbal_analogy" && (
                  <>
                    {/* Tiered Scoring Options */}
                    <div className="space-y-4">
                            
                            {/* TIER 1: CORRECT (Green) */}
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-green-800 bg-green-100 px-2 py-1 rounded">✓ CORRECT RESPONSES</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <button
                                  onClick={() => {
                                    setVerbalScores(prev => ({
                                      ...prev,
                                      [currentQuestion]: {
                                        ...prev[currentQuestion],
                                        score: 'correct-direction'
                                      }
                                    }))
                                  }}
                                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                                    verbalScores[currentQuestion]?.score === 'correct-direction'
                                      ? 'border-green-600 bg-green-200'
                                      : 'border-green-300 bg-green-50 hover:bg-green-100'
                                  }`}
                                >
                                  <div className="font-semibold text-green-800">"Direction"</div>
                                </button>

                                <button
                                  onClick={() => {
                                    setVerbalScores(prev => ({
                                      ...prev,
                                      [currentQuestion]: {
                                        ...prev[currentQuestion],
                                        score: 'correct-navigation'
                                      }
                                    }))
                                  }}
                                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                                    verbalScores[currentQuestion]?.score === 'correct-navigation'
                                      ? 'border-green-600 bg-green-200'
                                      : 'border-green-300 bg-green-50 hover:bg-green-100'
                                  }`}
                                >
                                  <div className="font-semibold text-green-800">"Navigation"</div>
                                </button>
                              </div>
                            </div>

                            {/* TIER 2: NEEDS PROMPTING (Yellow) */}
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-yellow-800 bg-yellow-100 px-2 py-1 rounded">⚠ NEEDS PROMPTING</h5>
                              <div>
                                <button
                                  onClick={() => {
                                    setVerbalScores(prev => ({
                                      ...prev,
                                      [currentQuestion]: {
                                        ...prev[currentQuestion],
                                        score: 'partial-nav'
                                      }
                                    }))
                                  }}
                                  className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                                    verbalScores[currentQuestion]?.score === 'partial-nav'
                                      ? 'border-yellow-600 bg-yellow-200'
                                      : 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
                                  }`}
                                >
                                  <div className="font-semibold text-yellow-800">"Nav"</div>
                                </button>
                              </div>
                            </div>

                            {/* TIER 3: WRONG (Red) */}
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-red-800 bg-red-100 px-2 py-1 rounded">✗ WRONG ANSWERS</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <button
                                  onClick={() => {
                                    setVerbalScores(prev => ({
                                      ...prev,
                                      [currentQuestion]: {
                                        ...prev[currentQuestion],
                                        score: 'wrong-pointing'
                                      }
                                    }))
                                  }}
                                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                                    verbalScores[currentQuestion]?.score === 'wrong-pointing'
                                      ? 'border-red-600 bg-red-200'
                                      : 'border-red-300 bg-red-50 hover:bg-red-100'
                                  }`}
                                >
                                  <div className="font-semibold text-red-800">"Pointing"</div>
                                </button>

                                <button
                                  onClick={() => {
                                    setVerbalScores(prev => ({
                                      ...prev,
                                      [currentQuestion]: {
                                        ...prev[currentQuestion],
                                        score: 'wrong-map'
                                      }
                                    }))
                                  }}
                                  className={`p-3 text-left rounded-lg border-2 transition-all ${
                                    verbalScores[currentQuestion]?.score === 'wrong-map'
                                      ? 'border-red-600 bg-red-200'
                                      : 'border-red-300 bg-red-50 hover:bg-red-100'
                                  }`}
                                >
                                  <div className="font-semibold text-red-800">"Map"</div>
                                </button>
                              </div>
                            </div>

                            {/* TIER 4: OTHER (Gray) */}
                            <div className="space-y-2">
                              <h5 className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">OTHER RESPONSE</h5>
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Type other response and score..."
                                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-gray-500"
                                  value={customResponses[currentQuestion] || ''}
                                  onChange={(e) => {
                                    setCustomResponses(prev => ({
                                      ...prev,
                                      [currentQuestion]: e.target.value
                                    }))
                                  }}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => {
                                      if (customResponses[currentQuestion]?.trim()) {
                                        setVerbalScores(prev => ({
                                          ...prev,
                                          [currentQuestion]: {
                                            response: customResponses[currentQuestion],
                                            score: 'custom-correct'
                                          }
                                        }))
                                      }
                                    }}
                                    disabled={!customResponses[currentQuestion]?.trim()}
                                    className={`p-2 text-center rounded border-2 transition-all ${
                                      verbalScores[currentQuestion]?.score === 'custom-correct'
                                        ? 'border-green-500 bg-green-100 text-green-800'
                                        : 'border-gray-300 bg-white hover:bg-green-50 disabled:opacity-50'
                                    }`}
                                  >
                                    <div className="text-xs font-semibold">Correct</div>
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (customResponses[currentQuestion]?.trim()) {
                                        setVerbalScores(prev => ({
                                          ...prev,
                                          [currentQuestion]: {
                                            response: customResponses[currentQuestion],
                                            score: 'custom-wrong'
                                          }
                                        }))
                                      }
                                    }}
                                    disabled={!customResponses[currentQuestion]?.trim()}
                                    className={`p-2 text-center rounded border-2 transition-all ${
                                      verbalScores[currentQuestion]?.score === 'custom-wrong'
                                        ? 'border-red-500 bg-red-100 text-red-800'
                                        : 'border-gray-300 bg-white hover:bg-red-50 disabled:opacity-50'
                                    }`}
                                  >
                                    <div className="text-xs font-semibold">Wrong</div>
                                  </button>
                                </div>
                              </div>
                            </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Examiner Navigation Controls */}
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">Question</div>
                <div className="text-lg font-semibold">{currentQuestion + 1} of {QUESTIONS.length}</div>
              </div>

              <button
                onClick={handleNext}
                disabled={currentQuestion === QUESTIONS.length - 1}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ExaminerAnalogiesTest() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExaminerAnalogiesContent />
    </Suspense>
  )
}