"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

type QuestionType = 'rhyme-recognition' | 'rhyme-production' | 'syllabication' | 'sound-id' | 'blending' | 'segmenting'

interface Question {
  id: number
  type: QuestionType
  audioPath: string
}

// 12 questions total: 2 of each type
const QUESTIONS: Question[] = [
  // Rhyme Recognition (2 questions)
  { id: 1, type: 'rhyme-recognition', audioPath: '/audio/phonological-awareness/rhyme-recognition-1.wav' },
  { id: 2, type: 'rhyme-recognition', audioPath: '/audio/phonological-awareness/rhyme-recognition-2.wav' },
  // Rhyme Production (2 questions)
  { id: 3, type: 'rhyme-production', audioPath: '/audio/phonological-awareness/rhyme-production-1.wav' },
  { id: 4, type: 'rhyme-production', audioPath: '/audio/phonological-awareness/rhyme-production-2.wav' },
  // Syllabication (2 questions)
  { id: 5, type: 'syllabication', audioPath: '/audio/phonological-awareness/syllabication-1.wav' },
  { id: 6, type: 'syllabication', audioPath: '/audio/phonological-awareness/syllabication-2.wav' },
  // Sound ID (2 questions)
  { id: 7, type: 'sound-id', audioPath: '/audio/phonological-awareness/sound-id-1.wav' },
  { id: 8, type: 'sound-id', audioPath: '/audio/phonological-awareness/sound-id-2.wav' },
  // Blending (2 questions)
  { id: 9, type: 'blending', audioPath: '/audio/phonological-awareness/blending-1.wav' },
  { id: 10, type: 'blending', audioPath: '/audio/phonological-awareness/blending-2.wav' },
  // Segmenting (2 questions)
  { id: 11, type: 'segmenting', audioPath: '/audio/phonological-awareness/segmenting-1.wav' },
  { id: 12, type: 'segmenting', audioPath: '/audio/phonological-awareness/segmenting-2.wav' },
]

export default function StudentPhonologicalAwareness() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: string}>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [testEnded, setTestEnded] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    // Get student info, or use default anonymous student
    const studentData = localStorage.getItem(`student_${sessionId}`)
    if (studentData) {
      setStudentInfo(JSON.parse(studentData))
    } else {
      setStudentInfo({
        name: 'Student',
        firstName: 'Student',
        lastName: '',
        sessionId
      })
    }
  }, [sessionId])

  // Auto-play audio when question changes (after user clicks start)
  useEffect(() => {
    if (hasStarted && !testEnded && audioRef.current) {
      const question = QUESTIONS[currentQuestion]
      audioRef.current.src = question.audioPath
      audioRef.current.play().catch(() => {
        console.log('Audio file not found:', question.audioPath)
      })
    }
  }, [currentQuestion, hasStarted, testEnded])

  const playAudio = () => {
    if (audioRef.current) {
      const question = QUESTIONS[currentQuestion]
      audioRef.current.src = question.audioPath
      audioRef.current.play().catch(() => {
        console.log('Audio file not found:', question.audioPath)
      })
    }
  }

  const handleStart = () => {
    setHasStarted(true)
  }

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = { ...answers }
    newAnswers[currentQuestion] = answer
    setAnswers(newAnswers)

    // Update test state for examiner
    const currentTestState = {
      currentQuestion,
      answers: newAnswers,
      studentName: studentInfo?.firstName || 'Student',
      testType: 'phonological-awareness'
    }
    localStorage.setItem(`phonologicalAwarenessTestState_${sessionId}`, JSON.stringify(currentTestState))
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      const nextQuestion = currentQuestion + 1
      setCurrentQuestion(nextQuestion)

      // Update test state
      const currentTestState = {
        currentQuestion: nextQuestion,
        answers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'phonological-awareness'
      }
      localStorage.setItem(`phonologicalAwarenessTestState_${sessionId}`, JSON.stringify(currentTestState))
    } else {
      // Last question - end test
      handleFinishTest()
    }
  }

  const handleFinishTest = () => {
    const testResults = QUESTIONS.map((question, index) => ({
      questionId: question.id,
      questionType: question.type,
      answer: answers[index] || null,
      timestamp: new Date().toISOString()
    }))

    localStorage.setItem(`phonological_awareness_test_${sessionId}`, JSON.stringify(testResults))

    // Notify that test is completed
    localStorage.setItem(`test_completed_${sessionId}`, JSON.stringify({
      completed: true,
      subtest: "phonological-awareness",
      timestamp: new Date().toISOString()
    }))

    setTestEnded(true)
  }

  const handleRestartTest = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setIsPlaying(false)
    setTestEnded(false)
    setHasStarted(false)
  }

  const handleAudioPlay = () => {
    setIsPlaying(true)
  }

  const handleAudioPause = () => {
    setIsPlaying(false)
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
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

  // Test Ended Screen
  if (testEnded) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Ended</h2>
          <p className="text-gray-600 mb-6">You have completed the Phonological Awareness test.</p>
          <button
            onClick={handleRestartTest}
            className="px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
          >
            Restart
          </button>
        </div>
      </div>
    )
  }

  // Start Screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <button
            onClick={handleStart}
            className="w-24 h-24 rounded-xl flex items-center justify-center bg-blue-100 hover:bg-blue-200 transition-all mx-auto"
          >
            <svg
              className="w-12 h-12 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[currentQuestion]

  // Render question based on type
  const renderQuestionContent = () => {
    switch (question.type) {
      case 'rhyme-recognition':
        // Two buttons: "Yes, they rhyme" and "No, they don't rhyme"
        return (
          <div className="space-y-6">
            <style jsx>{`
              @keyframes pulse-scale {
                0%, 100% {
                  transform: scale(1);
                  opacity: 1;
                }
                50% {
                  transform: scale(0.8);
                  opacity: 0.7;
                }
              }
              .animate-pulse-scale {
                animation: pulse-scale 1.5s ease-in-out infinite;
              }
            `}</style>
            {/* Audio Icon */}
            <div className="flex justify-center">
              <button
                onClick={playAudio}
                className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                    : 'bg-blue-100 hover:bg-blue-200'
                }`}
              >
                <svg
                  className={`w-10 h-10 ${isPlaying ? 'text-blue-700' : 'text-blue-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </button>
            </div>

            {/* Answer Buttons */}
            <div className="flex justify-center gap-6">
              <button
                onClick={() => handleAnswerSelect('yes')}
                className={`px-8 py-4 rounded-xl text-lg font-medium transition-all ${
                  answers[currentQuestion] === 'yes'
                    ? 'bg-blue-500 text-white border-2 border-blue-500'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yes, they rhyme
              </button>
              <button
                onClick={() => handleAnswerSelect('no')}
                className={`px-8 py-4 rounded-xl text-lg font-medium transition-all ${
                  answers[currentQuestion] === 'no'
                    ? 'bg-blue-500 text-white border-2 border-blue-500'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                No, they don't rhyme
              </button>
            </div>
          </div>
        )

      case 'syllabication':
        // Six buttons numbered 1-6
        return (
          <div className="space-y-6">
            <style jsx>{`
              @keyframes pulse-scale {
                0%, 100% {
                  transform: scale(1);
                  opacity: 1;
                }
                50% {
                  transform: scale(0.8);
                  opacity: 0.7;
                }
              }
              .animate-pulse-scale {
                animation: pulse-scale 1.5s ease-in-out infinite;
              }
            `}</style>
            {/* Audio Icon */}
            <div className="flex justify-center">
              <button
                onClick={playAudio}
                className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                    : 'bg-blue-100 hover:bg-blue-200'
                }`}
              >
                <svg
                  className={`w-10 h-10 ${isPlaying ? 'text-blue-700' : 'text-blue-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </button>
            </div>

            {/* Number Buttons 1-6 */}
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handleAnswerSelect(String(num))}
                  className={`w-16 h-16 rounded-xl text-2xl font-bold transition-all ${
                    answers[currentQuestion] === String(num)
                      ? 'bg-blue-500 text-white border-2 border-blue-500'
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )

      case 'rhyme-production':
      case 'sound-id':
      case 'blending':
      case 'segmenting':
        // Verbal response: Audio icon + Next button
        return (
          <div className="space-y-6">
            <style jsx>{`
              @keyframes pulse-scale {
                0%, 100% {
                  transform: scale(1);
                  opacity: 1;
                }
                50% {
                  transform: scale(0.8);
                  opacity: 0.7;
                }
              }
              .animate-pulse-scale {
                animation: pulse-scale 1.5s ease-in-out infinite;
              }
            `}</style>
            {/* Audio Icon */}
            <div className="flex justify-center">
              <button
                onClick={playAudio}
                className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                    : 'bg-blue-100 hover:bg-blue-200'
                }`}
              >
                <svg
                  className={`w-10 h-10 ${isPlaying ? 'text-blue-700' : 'text-blue-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </button>
            </div>

            {/* Next Button */}
            <div className="flex justify-center">
              <button
                onClick={handleNext}
                className="px-8 py-4 bg-blue-900 text-white rounded-xl text-lg font-medium hover:bg-blue-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Check if current question type needs the navigation footer
  const needsNavigationFooter = question.type === 'rhyme-recognition' || question.type === 'syllabication'

  return (
    <div className="min-h-screen bg-blue-50">
      <audio
        ref={audioRef}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onEnded={handleAudioEnded}
      />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8">
          {renderQuestionContent()}

          {/* Navigation Footer - only for rhyme-recognition and syllabication */}
          {needsNavigationFooter && (
            <div className="flex justify-center items-center pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion]}
                className="px-8 py-3 bg-blue-900 text-white rounded-xl text-lg font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {currentQuestion === QUESTIONS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
