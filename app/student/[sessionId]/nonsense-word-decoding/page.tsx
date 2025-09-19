"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

const NONSENSE_WORDS = [
  { id: 1, word: "baf", phonetic: "/bæf/", difficulty: "easy" },
  { id: 2, word: "tep", phonetic: "/tɛp/", difficulty: "easy" },
  { id: 3, word: "drim", phonetic: "/drɪm/", difficulty: "easy" },
  { id: 4, word: "flob", phonetic: "/flɒb/", difficulty: "medium" },
  { id: 5, word: "sprin", phonetic: "/sprɪn/", difficulty: "medium" },
  { id: 6, word: "thwack", phonetic: "/θwæk/", difficulty: "medium" },
  { id: 7, word: "blength", phonetic: "/blɛŋθ/", difficulty: "hard" },
  { id: 8, word: "scrump", phonetic: "/skrʌmp/", difficulty: "hard" },
  { id: 9, word: "flisp", phonetic: "/flɪsp/", difficulty: "hard" },
  { id: 10, word: "throng", phonetic: "/θrɒŋ/", difficulty: "hard" }
]

export default function StudentNonsenseWordDecodingTest() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: any}>({})
  const [testState, setTestState] = useState("active") // active, waiting, completed
  const [currentAnswer, setCurrentAnswer] = useState("")

  useEffect(() => {
    // Get student info
    if (typeof window !== 'undefined') {
      const studentData = localStorage.getItem(`student_${sessionId}`)
      if (studentData) {
        setStudentInfo(JSON.parse(studentData))
      }
    }
  }, [sessionId])

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
  }, [testState, sessionId])

  const handleAnswerChange = (value: string) => {
    setCurrentAnswer(value)
  }

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers }
    newAnswers[currentQuestion] = {
      answer: answer.trim(),
      correctWord: NONSENSE_WORDS[currentQuestion].word,
      isComplete: answer.trim().length > 0
    }

    setAnswers(newAnswers)

    // Update test state for examiner
    if (typeof window !== 'undefined') {
      const currentTestState = {
        currentQuestion,
        answers: newAnswers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'nonsense-word-decoding'
      }
      localStorage.setItem(`nonsenseWordDecodingTestState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  const handleNext = useCallback(() => {
    if (currentAnswer.trim()) {
      handleAnswer(currentAnswer)
    }

    if (currentQuestion < NONSENSE_WORDS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setCurrentAnswer("")
    }
  }, [currentQuestion, currentAnswer])

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      // Load previous answer if exists
      const prevAnswer = answers[currentQuestion - 1]?.answer || ""
      setCurrentAnswer(prevAnswer)
    }
  }

  const handleFinishTest = () => {
    // Save final answer if there is one
    if (currentAnswer.trim()) {
      handleAnswer(currentAnswer)
    }

    // Calculate results
    const testResults = NONSENSE_WORDS.map((word, index) => {
      const answer = answers[index] || { answer: "", correctWord: word.word }
      const isCorrect = answer.answer.toLowerCase() === word.word.toLowerCase()

      return {
        questionId: word.id,
        word: word.word,
        studentAnswer: answer.answer,
        isCorrect,
        timestamp: new Date().toISOString()
      }
    })

    if (typeof window !== 'undefined') {
      localStorage.setItem(`nonsenseWordDecodingTest_${sessionId}`, JSON.stringify(testResults))

      // Mark as waiting for examiner to start next subtest
      const waitingState = {
        testComplete: true,
        currentSubtest: "nonsense_word_decoding_complete",
        studentName: studentInfo?.firstName || 'Student'
      }
      localStorage.setItem(`waitingState_${sessionId}`, JSON.stringify(waitingState))

      // Notify examiner that test is completed
      localStorage.setItem(`test_completed_${sessionId}`, JSON.stringify({
        completed: true,
        subtest: "nonsense-word-decoding",
        timestamp: new Date().toISOString()
      }))
    }

    setTestState("waiting")
  }

  // Add global keydown event listener for Enter key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && testState === "active") {
        event.preventDefault()
        if (currentQuestion === NONSENSE_WORDS.length - 1) {
          // On last question, finish the test
          if (currentAnswer.trim()) {
            handleFinishTest()
          }
        } else {
          // On other questions, go to next
          if (currentAnswer.trim()) {
            handleNext()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [testState, currentQuestion, currentAnswer, handleNext])

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
          <p className="text-gray-600">You completed the nonsense word decoding test.</p>
        </div>
      </div>
    )
  }

  const currentWord = NONSENSE_WORDS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">Nonsense Word Decoding</h1>
              <span className="text-sm text-gray-500">{studentInfo.firstName}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Word {currentQuestion + 1} of {NONSENSE_WORDS.length}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Read the nonsense word out loud
            </h2>

            {/* Word display */}
            <div className="mb-8">
              <div className="bg-white border-4 border-blue-600 rounded-xl p-8 inline-block shadow-lg">
                <div className="text-6xl font-bold text-gray-900 mb-2">
                  {currentWord.word}
                </div>
                <div className="text-sm text-gray-500">
                  (This is a made-up word)
                </div>
              </div>
            </div>

            {/* Instruction for student to read aloud */}
            <div className="mb-8">
              <p className="text-lg text-gray-700 mb-4">
                Please read this word out loud to the examiner.
              </p>
              <p className="text-md text-gray-600">
                Then type what you read in the box below:
              </p>
            </div>

            {/* Input for confirmation */}
            <div className="max-w-md mx-auto">
              <label htmlFor="decoding-input" className="block text-lg font-medium text-gray-700 mb-4">
                Type the word as you read it:
              </label>
              <input
                id="decoding-input"
                type="text"
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Type what you read..."
                className="w-full px-4 py-4 text-xl text-center border-2 border-gray-300 rounded-xl focus:border-blue-900 focus:outline-none"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-3">
                Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Enter</kbd> or click Next to continue
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-sm text-gray-500">
              Word {currentQuestion + 1} of {NONSENSE_WORDS.length}
            </div>

            {currentQuestion === NONSENSE_WORDS.length - 1 ? (
              <button
                onClick={handleFinishTest}
                disabled={!currentAnswer.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finish Test
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!currentAnswer.trim()}
                className="px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
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