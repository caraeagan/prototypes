"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
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

export default function StudentAnalogiesTest() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: any}>({})
  const [testState, setTestState] = useState("active")

  useEffect(() => {
    // Get student info
    const studentData = localStorage.getItem(`student_${sessionId}`)
    if (studentData) {
      setStudentInfo(JSON.parse(studentData))
    }
  }, [sessionId])

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers }
    newAnswers[currentQuestion] = {
      answer: answer,
      isComplete: true
    }
    
    setAnswers(newAnswers)
    
    // Update test state for examiner
    const currentTestState = {
      currentQuestion,
      answers: newAnswers,
      studentName: studentInfo?.firstName || 'Student',
      testType: 'analogies'
    }
    localStorage.setItem(`analogiesTestState_${sessionId}`, JSON.stringify(currentTestState))
  }

  const clearAnswer = () => {
    const newAnswers = { ...answers }
    delete newAnswers[currentQuestion]
    setAnswers(newAnswers)
    
    // Update test state for examiner
    const currentTestState = {
      currentQuestion,
      answers: newAnswers,
      studentName: studentInfo?.firstName || 'Student',
      testType: 'analogies'
    }
    localStorage.setItem(`analogiesTestState_${sessionId}`, JSON.stringify(currentTestState))
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
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
    
    localStorage.setItem(`analogies_test_${sessionId}`, JSON.stringify(testResults))
    setTestState("completed")
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
          <p className="text-gray-600">You completed the analogies test.</p>
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
              <h1 className="text-xl font-bold text-gray-900">Analogies Test</h1>
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

          {/* Analogy Display */}
          <div className="space-y-8">
            {/* Top row: A relates to B */}
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="w-32 h-32 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center">
                  <Image
                    src={question.analogy.imageA}
                    alt="Image A"
                    width={100}
                    height={100}
                    className="rounded"
                  />
                </div>
              </div>
              
              <div className="text-4xl text-gray-400">:</div>
              
              <div className="text-center">
                <div className="w-32 h-32 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center">
                  <Image
                    src={question.analogy.imageB}
                    alt="Image B"
                    width={100}
                    height={100}
                    className="rounded"
                  />
                </div>
              </div>
            </div>

            {/* Bottom row: C relates to ? */}
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="w-32 h-32 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center">
                  <Image
                    src={question.analogy.imageC}
                    alt="Image C"
                    width={100}
                    height={100}
                    className="rounded"
                  />
                </div>
              </div>
              
              <div className="text-4xl text-gray-400">:</div>
              
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center relative">
                  {answers[currentQuestion]?.answer ? (
                    <>
                      <Image
                        src={question.options.find(opt => opt.id === answers[currentQuestion].answer)?.image || ""}
                        alt="Selected answer"
                        width={100}
                        height={100}
                        className="rounded"
                      />
                      <button
                        onClick={clearAnswer}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 flex items-center justify-center text-sm font-bold"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <span className="text-6xl text-gray-400">?</span>
                  )}
                </div>
              </div>
            </div>

            {/* Answer options */}
            <div className="border-t pt-8 mt-8">
              <p className="text-center text-gray-600 mb-6">Choose the image that completes the pattern:</p>
              <div className="flex justify-center space-x-6">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className={`w-24 h-24 bg-white rounded-lg border-2 transition-all flex items-center justify-center ${
                      answers[currentQuestion]?.answer === option.id
                        ? "border-blue-900 bg-blue-100"
                        : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                    }`}
                  >
                    <Image
                      src={option.image}
                      alt={`Option ${option.id}`}
                      width={80}
                      height={80}
                      className="rounded"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

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