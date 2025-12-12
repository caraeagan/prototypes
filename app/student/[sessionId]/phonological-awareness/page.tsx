"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { CheckCircle, XCircle } from "@phosphor-icons/react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

type QuestionType = 'rhyme-recognition' | 'rhyme-production' | 'syllabication' | 'sound-id' | 'blending' | 'segmenting'

interface Question {
  id: number
  type: QuestionType
  audioPaths: string[]  // Array to support sequential audio playback
  videoPaths?: string[]  // Optional array for video clips (used in blending)
}

// 12 questions total: 2 of each type
const QUESTIONS: Question[] = [
  // Rhyme Recognition (2 questions)
  { id: 1, type: 'rhyme-recognition', audioPaths: ['/audio/phonological-awareness/Rhyming_1.wav'] },
  { id: 2, type: 'rhyme-recognition', audioPaths: ['/audio/phonological-awareness/Rhyming_2.wav'] },
  // Rhyme Production (2 questions) - plays two audio files in sequence
  { id: 3, type: 'rhyme-production', audioPaths: [
    '/audio/phonological-awareness/Rhyme Production_1.1.wav',
    '/audio/phonological-awareness/Rhyme Production_1.2.wav'
  ]},
  { id: 4, type: 'rhyme-production', audioPaths: [
    '/audio/phonological-awareness/Rhyme Production_2.1.wav',
    '/audio/phonological-awareness/Rhyme Production_2.2.wav'
  ]},
  // Syllabication (2 questions)
  { id: 5, type: 'syllabication', audioPaths: ['/audio/phonological-awareness/Syllabication_1.wav'] },
  { id: 6, type: 'syllabication', audioPaths: ['/audio/phonological-awareness/Syllabication_2.wav'] },
  // Sound ID (2 questions) - plays two audio files in sequence with Venn diagram layout
  { id: 7, type: 'sound-id', audioPaths: [
    '/audio/phonological-awareness/Sound ID_1.1.wav',
    '/audio/phonological-awareness/Sound ID_1.2.wav'
  ]},
  { id: 8, type: 'sound-id', audioPaths: [
    '/audio/phonological-awareness/Sound ID_2.1.wav',
    '/audio/phonological-awareness/Sound ID_2.2.wav'
  ]},
  // Blending (2 questions) - plays sequence of video clips with paired audio
  { id: 9, type: 'blending', audioPaths: [
    '/audio/phonological-awareness/Blending_1.mp3',
    '/audio/phonological-awareness/Blending_1.1.mp3',
    '/audio/phonological-awareness/Blending_1.2.mp3'
  ], videoPaths: [
    '/video/phonological-awareness/Phoneme_s.mov',
    '/video/phonological-awareness/Phoneme_a.mov',
    '/video/phonological-awareness/Phoneme_t.mov'
  ]},
  { id: 10, type: 'blending', audioPaths: [
    '/audio/phonological-awareness/Blending_2.mp3',
    '/audio/phonological-awareness/Blending_2.1.mp3',
    '/audio/phonological-awareness/Blending_2.2.mp3'
  ], videoPaths: [
    '/video/phonological-awareness/placeholder_1.mov',
    '/video/phonological-awareness/placeholder_2.mov',
    '/video/phonological-awareness/placeholder_3.mov'
  ]},
  // Segmenting (2 questions)
  { id: 11, type: 'segmenting', audioPaths: ['/audio/phonological-awareness/Segmenting_1.wav'] },
  { id: 12, type: 'segmenting', audioPaths: ['/audio/phonological-awareness/Segmenting_2.wav'] },
]

export default function StudentPhonologicalAwareness() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: string}>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [testEnded, setTestEnded] = useState(false)
  const [audioSequenceComplete, setAudioSequenceComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(-1)  // -1 means no video playing
  const [isAutoPlaySequence, setIsAutoPlaySequence] = useState(false)  // Track if we're in auto-play mode

  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null])

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

  // Auto-play audio/video when question changes (after user clicks start)
  useEffect(() => {
    if (hasStarted && !testEnded && audioRef.current) {
      const question = QUESTIONS[currentQuestion]
      setCurrentAudioIndex(0)
      setAudioSequenceComplete(false)
      setCurrentVideoIndex(-1)

      // For blending questions, play video and audio together
      if (question.type === 'blending' && question.videoPaths) {
        setIsAutoPlaySequence(true)  // Enable auto-play sequence
        setCurrentVideoIndex(0)
        const video = videoRefs.current[0]
        if (video) {
          video.currentTime = 0
          video.play().catch(() => {
            console.log('Video file not found:', question.videoPaths?.[0])
          })
        }
      }

      audioRef.current.src = question.audioPaths[0]
      audioRef.current.play().catch(() => {
        console.log('Audio file not found:', question.audioPaths[0])
      })
    }
  }, [currentQuestion, hasStarted, testEnded])

  const playAudio = () => {
    if (audioRef.current) {
      const question = QUESTIONS[currentQuestion]
      setCurrentAudioIndex(0)
      audioRef.current.src = question.audioPaths[0]
      audioRef.current.play().catch(() => {
        console.log('Audio file not found:', question.audioPaths[0])
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
    const question = QUESTIONS[currentQuestion]
    const nextIndex = currentAudioIndex + 1

    // For blending, video ending controls the sequence (not audio)
    if (question.type === 'blending') {
      // Don't do anything here - let handleVideoEnded control the sequence
      return
    }

    // For rhyme-production and sound-id, auto-play the next audio in sequence
    if ((question.type === 'rhyme-production' || question.type === 'sound-id') && nextIndex < question.audioPaths.length && audioRef.current) {
      // Add 1 second delay for rhyme-production and sound-id between audio files
      const delay = 1000
      setTimeout(() => {
        if (audioRef.current) {
          setCurrentAudioIndex(nextIndex)
          audioRef.current.src = question.audioPaths[nextIndex]
          audioRef.current.play().catch(() => {
            console.log('Audio file not found:', question.audioPaths[nextIndex])
          })
        }
      }, delay)
    } else {
      // Audio finished playing
      setIsPlaying(false)
      setCurrentVideoIndex(-1)
      // Mark sequence complete for rhyme-production and sound-id to highlight question mark tile (after 1 second delay)
      if (question.type === 'rhyme-production' || question.type === 'sound-id') {
        setTimeout(() => {
          setAudioSequenceComplete(true)
        }, 1000)
      }
    }
  }

  const handleVideoEnded = (videoIndex: number) => {
    const question = QUESTIONS[currentQuestion]
    const nextIndex = videoIndex + 1

    // Only auto-play the next video if we're in auto-play sequence mode
    if (isAutoPlaySequence && question.type === 'blending' && question.videoPaths && nextIndex < question.videoPaths.length) {
      setCurrentAudioIndex(nextIndex)
      setCurrentVideoIndex(nextIndex)

      const video = videoRefs.current[nextIndex]
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {
          console.log('Video file not found:', question.videoPaths?.[nextIndex])
        })
      }

      if (audioRef.current) {
        audioRef.current.src = question.audioPaths[nextIndex]
        audioRef.current.play().catch(() => {
          console.log('Audio file not found:', question.audioPaths[nextIndex])
        })
      }
    } else {
      // Video finished playing (either single replay or end of sequence)
      setIsPlaying(false)
      setCurrentVideoIndex(-1)
      setIsAutoPlaySequence(false)
    }
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
                className={`px-8 py-4 rounded-xl text-lg font-medium transition-all flex items-center gap-2 ${
                  answers[currentQuestion] === 'yes'
                    ? 'bg-blue-500 text-white border-2 border-blue-500'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CheckCircle size={24} weight="fill" />
                Yes, they rhyme
              </button>
              <button
                onClick={() => handleAnswerSelect('no')}
                className={`px-8 py-4 rounded-xl text-lg font-medium transition-all flex items-center gap-2 ${
                  answers[currentQuestion] === 'no'
                    ? 'bg-blue-500 text-white border-2 border-blue-500'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <XCircle size={24} weight="fill" />
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
        // Two audio tiles + question mark tile for verbal response
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
              .animate-pulse-twice {
                animation: pulse-scale 0.5s ease-in-out 2;
              }
            `}</style>
            {/* Three tiles in a row: Audio 1, Audio 2, Question Mark */}
            <div className="flex justify-center gap-4">
              {/* First Audio Tile */}
              <button
                onClick={() => {
                  if (audioRef.current) {
                    setCurrentAudioIndex(0)
                    audioRef.current.src = question.audioPaths[0]
                    audioRef.current.play().catch(() => {
                      console.log('Audio file not found:', question.audioPaths[0])
                    })
                  }
                }}
                className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all ${
                  isPlaying && currentAudioIndex === 0
                    ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                    : 'bg-blue-100 hover:bg-blue-200'
                }`}
              >
                <svg
                  className={`w-10 h-10 ${isPlaying && currentAudioIndex === 0 ? 'text-blue-700' : 'text-blue-500'}`}
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

              {/* Second Audio Tile */}
              <button
                onClick={() => {
                  if (audioRef.current) {
                    setCurrentAudioIndex(1)
                    audioRef.current.src = question.audioPaths[1]
                    audioRef.current.play().catch(() => {
                      console.log('Audio file not found:', question.audioPaths[1])
                    })
                  }
                }}
                className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all ${
                  isPlaying && currentAudioIndex === 1
                    ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                    : 'bg-blue-100 hover:bg-blue-200'
                }`}
              >
                <svg
                  className={`w-10 h-10 ${isPlaying && currentAudioIndex === 1 ? 'text-blue-700' : 'text-blue-500'}`}
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

              {/* Question Mark Tile */}
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center transition-all bg-gray-100 ${
                audioSequenceComplete
                  ? 'border-2 border-[#339AF0] animate-pulse-twice'
                  : 'border-2 border-gray-300'
              }`}>
                <svg
                  className={`w-10 h-10 ${audioSequenceComplete ? 'text-[#339AF0]' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
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

      case 'sound-id':
        // Venn diagram with two audio tiles and question tile in intersection
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
              .animate-pulse-twice {
                animation: pulse-scale 0.5s ease-in-out 2;
              }
            `}</style>
            {/* Venn Diagram */}
            <div className="flex justify-center">
              <div className="relative w-[400px] h-[250px]">
                {/* Left Circle */}
                <div className="absolute left-0 top-0 w-[250px] h-[250px] rounded-full border-2 border-blue-200 bg-blue-50/50"></div>
                {/* Right Circle */}
                <div className="absolute right-0 top-0 w-[250px] h-[250px] rounded-full border-2 border-blue-200 bg-blue-50/50"></div>

                {/* Left Audio Tile */}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      setCurrentAudioIndex(0)
                      setAudioSequenceComplete(false)
                      audioRef.current.src = question.audioPaths[0]
                      audioRef.current.play().catch(() => {
                        console.log('Audio file not found:', question.audioPaths[0])
                      })
                    }
                  }}
                  className={`absolute left-[45px] top-1/2 -translate-y-1/2 w-16 h-16 rounded-lg flex items-center justify-center transition-all ${
                    isPlaying && currentAudioIndex === 0
                      ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                      : 'bg-blue-100 hover:bg-blue-200'
                  }`}
                >
                  <svg
                    className={`w-8 h-8 ${isPlaying && currentAudioIndex === 0 ? 'text-blue-700' : 'text-blue-500'}`}
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

                {/* Right Audio Tile */}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      setCurrentAudioIndex(1)
                      setAudioSequenceComplete(false)
                      audioRef.current.src = question.audioPaths[1]
                      audioRef.current.play().catch(() => {
                        console.log('Audio file not found:', question.audioPaths[1])
                      })
                    }
                  }}
                  className={`absolute right-[45px] top-1/2 -translate-y-1/2 w-16 h-16 rounded-lg flex items-center justify-center transition-all ${
                    isPlaying && currentAudioIndex === 1
                      ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                      : 'bg-blue-100 hover:bg-blue-200'
                  }`}
                >
                  <svg
                    className={`w-8 h-8 ${isPlaying && currentAudioIndex === 1 ? 'text-blue-700' : 'text-blue-500'}`}
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

                {/* Question Mark Tile in Center (Intersection) */}
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-lg flex items-center justify-center transition-all bg-gray-100 ${
                  audioSequenceComplete
                    ? 'border-2 border-[#339AF0] animate-pulse-twice'
                    : 'border-2 border-gray-300'
                }`}>
                  <svg
                    className={`w-8 h-8 ${audioSequenceComplete ? 'text-[#339AF0]' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
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

      case 'blending':
        // Video tiles in a row with paired audio
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
            {/* Video Tiles Row */}
            <div className="flex justify-center gap-4">
              {question.videoPaths?.map((videoPath, index) => (
                <div
                  key={index}
                  className={`relative w-64 h-64 rounded-xl overflow-hidden transition-all cursor-pointer ${
                    currentVideoIndex === index
                      ? 'ring-4 ring-blue-500 shadow-lg'
                      : 'ring-2 ring-gray-200'
                  }`}
                  onClick={() => {
                    // Play this specific video and its paired audio (manual replay, not auto-sequence)
                    setIsAutoPlaySequence(false)
                    setCurrentVideoIndex(index)
                    setCurrentAudioIndex(index)
                    const video = videoRefs.current[index]
                    if (video) {
                      video.currentTime = 0
                      video.play().catch(() => {
                        console.log('Video file not found:', videoPath)
                      })
                    }
                    if (audioRef.current) {
                      audioRef.current.src = question.audioPaths[index]
                      audioRef.current.play().catch(() => {
                        console.log('Audio file not found:', question.audioPaths[index])
                      })
                    }
                  }}
                >
                  <video
                    ref={(el) => { videoRefs.current[index] = el }}
                    src={videoPath}
                    className="w-full h-full object-cover pointer-events-none"
                    onEnded={() => handleVideoEnded(index)}
                    muted
                    playsInline
                  />
                  {/* Play overlay when not playing */}
                  {currentVideoIndex !== index && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-gray-700 ml-0.5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
