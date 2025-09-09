"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { AuthButton } from "@/components/auth-button"
import Image from "next/image"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

const QUESTIONS = [
  {
    id: 1,
    type: "analogy",
    question: "Look at the picture below. Pick the missing picture.",
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
  }
]

function ExaminerAnalogiesContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session") || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentTestState, setCurrentTestState] = useState<any>(null)
  const [testResults, setTestResults] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)

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
    if (testResults.length === 0) return { correct: 0, total: 0, percentage: 0 }
    
    const correct = testResults.filter(result => result.isCorrect).length
    const total = testResults.length
    const percentage = Math.round((correct / total) * 100)
    
    return { correct, total, percentage }
  }

  const score = calculateScore()
  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Examiner Monitor - Analogies</h1>
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
                <h2 className="text-lg font-semibold">Student Screen - Analogies</h2>
                <div className="text-sm text-gray-500">
                  {studentInfo ? `${studentInfo.firstName} ${studentInfo.lastName}` : 'Student'}
                </div>
              </div>
              
              {/* Mirror of student interface */}
              <div className="bg-white rounded-lg p-6 border-2 border-gray-300">
                <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">
                  {question.question}
                </h3>

                {/* Analogy Display */}
                <div className="space-y-6">
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
                </div>
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
                {currentTestState?.answers?.[currentQuestion]?.answer && (
                  <div className="flex justify-between">
                    <span>Selected:</span>
                    <span className="font-medium">
                      Option {currentTestState.answers[currentQuestion].answer}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Question Analysis */}
            <div className="bg-stone-100 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Question Analysis</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Pattern:</span>
                  <p className="font-medium">Bottle : Baby drinking :: Spoon : ?</p>
                </div>
                <div>
                  <span className="text-gray-500">Correct Answer:</span>
                  <p className="font-medium text-green-600">
                    Option C (Baby eating with spoon)
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