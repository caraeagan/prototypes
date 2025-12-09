"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

// Sample test content - audio passage with multiple choice questions
const TEST_CONTENT = {
  passage: {
    id: 1,
    title: "The Community Mural",
    audioPath: "/audio/listening-comprehension/Listening Comp_demo passage.wav",
    // Fallback text for development when audio isn't available
    text: `Leila stood before the old warehouse wall, her hands coated in paint. For weeks, she had been planning this moment. The wall stretched before her like a vast, pale canvas, waiting to be transformed.

The neighborhood had changed so much over the years. Buildings that once housed families now stood empty. But Leila saw potential in this forgotten corner of the city. She imagined the wall as an immense blank ledger, ready to record the stories of everyone who had lived here.

Her first brushstroke was bold—a sweep of deep blue that would become the night sky. She worked for hours, adding stars that represented each family who had contributed to the community. By sunset, other neighbors had gathered to watch. Some offered to help. An elderly man named Mr. Chen pointed out where his family's restaurant used to stand, and Leila painted a small lantern in that spot.

The mural grew over the following weeks. It became a collaborative effort, with children adding handprints and elders sharing memories that Leila wove into the design. What started as one woman's vision became the neighborhood's shared story, painted in vibrant colors for all to see.`
  },
  questions: [
    {
      id: 1,
      audioPath: "/audio/listening-comprehension/Listening Comp_demo question_1.wav",
      question: "Where did Mila put her cup at first?",
      options: [
        { id: "A", text: "On the floor", audioPath: "/audio/listening-comprehension/Demo Question 1_answer_A.wav" },
        { id: "B", text: "On the table", audioPath: "/audio/listening-comprehension/Demo Question 1_answer_B.wav" },
        { id: "C", text: "By the window", audioPath: "/audio/listening-comprehension/Demo Question 1_answer_C.wav" }
      ],
      correctAnswer: "B"
    },
    {
      id: 2,
      audioPath: "/audio/listening-comprehension/Listening Comp_demo question_2.wav",
      question: "What did Mila do after filling the cup?",
      options: [
        { id: "A", text: "Carried it to the couch", audioPath: "/audio/listening-comprehension/Demo Question 2_answer_A.wav" },
        { id: "B", text: "Put it in the fridge", audioPath: "/audio/listening-comprehension/Demo Question 2_answer_B.wav" },
        { id: "C", text: "Gave it to someone", audioPath: "/audio/listening-comprehension/Demo Question 2_answer_C.wav" }
      ],
      correctAnswer: "B"
    }
  ]
}

type Phase = 'passage' | 'questions' | 'completed'

export default function StudentListeningComprehension() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [phase, setPhase] = useState<Phase>('passage')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: string}>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [hasListenedToPassage, setHasListenedToPassage] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const isPlayingSequenceRef = useRef(false)
  const phaseRef = useRef(phase)

  // Keep phaseRef in sync with phase
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    // Get student info
    const studentData = localStorage.getItem(`student_${sessionId}`)
    if (studentData) {
      setStudentInfo(JSON.parse(studentData))
    }
  }, [sessionId])

  // Auto-play passage audio when entering passage phase (after user clicks start)
  useEffect(() => {
    if (phase === 'passage' && studentInfo && hasStarted) {
      playPassageAudio()
    }
  }, [phase, studentInfo, hasStarted])

  // Auto-play question audio when entering questions phase or changing questions
  useEffect(() => {
    if (phase === 'questions' && studentInfo) {
      // Reset the playing flag when question changes
      isPlayingSequenceRef.current = false
      setAudioProgress(0)

      const question = TEST_CONTENT.questions[currentQuestion]
      if (!question) return

      const timeoutId = setTimeout(async () => {
        if (!audioRef.current || isPlayingSequenceRef.current) return

        isPlayingSequenceRef.current = true
        setIsPlaying(true)

        // Only play question audio (not answer options)
        const audioFiles = [question.audioPath]

        const totalFiles = audioFiles.length

        try {
          for (let i = 0; i < audioFiles.length; i++) {
            const audioPath = audioFiles[i]

            await new Promise<void>((resolve) => {
              if (!audioRef.current) {
                resolve()
                return
              }

              const audio = audioRef.current

              // Reset audio
              audio.pause()
              audio.onended = null
              audio.ontimeupdate = null
              audio.currentTime = 0

              // Set new source
              audio.src = audioPath
              audio.load()

              // Update progress based on which file we're on
              audio.ontimeupdate = () => {
                if (audio.duration) {
                  const fileProgress = audio.currentTime / audio.duration
                  const overallProgress = ((i + fileProgress) / totalFiles) * 100
                  setAudioProgress(overallProgress)
                }
              }

              let hasEnded = false
              audio.onended = () => {
                if (hasEnded) return
                hasEnded = true
                audio.onended = null
                audio.ontimeupdate = null
                resolve()
              }

              audio.play().catch(() => {
                console.log('Audio file not found:', audioPath)
                resolve()
              })
            })
          }
        } finally {
          isPlayingSequenceRef.current = false
          setIsPlaying(false)
          setAudioProgress(100)
        }
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [phase, studentInfo, currentQuestion])


  const playPassageAudio = () => {
    if (audioRef.current) {
      audioRef.current.src = TEST_CONTENT.passage.audioPath
      audioRef.current.play().catch(() => {
        // If audio fails to play (file not found), simulate for development
        console.log('Audio file not found, simulating playback')
        setIsPlaying(true)
        // Simulate audio progress for development
        let progress = 0
        const interval = setInterval(() => {
          progress += 2
          setAudioProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
            setIsPlaying(false)
            setHasListenedToPassage(true)
          }
        }, 100)
      })
    }
  }

  const playQuestionSequence = async () => {
    const question = TEST_CONTENT.questions[currentQuestion]
    if (!audioRef.current || !question || isPlayingSequenceRef.current) return

    isPlayingSequenceRef.current = true
    setIsPlaying(true)

    const audioFiles = [
      question.audioPath,
      ...question.options.map(opt => opt.audioPath)
    ]

    try {
      for (let i = 0; i < audioFiles.length; i++) {
        const audioPath = audioFiles[i]

        await new Promise<void>((resolve) => {
          if (!audioRef.current) {
            resolve()
            return
          }

          const audio = audioRef.current
          audio.pause()
          audio.onended = null
          audio.currentTime = 0
          audio.src = audioPath
          audio.load()

          let hasEnded = false
          audio.onended = () => {
            if (hasEnded) return
            hasEnded = true
            audio.onended = null
            resolve()
          }

          audio.play().catch(() => {
            console.log('Audio file not found:', audioPath)
            resolve()
          })
        })
      }
    } finally {
      isPlayingSequenceRef.current = false
      setIsPlaying(false)
    }
  }

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
        isPlayingSequenceRef.current = false
      } else {
        if (phase === 'passage') {
          playPassageAudio()
        } else if (phase === 'questions') {
          playQuestionSequence()
        }
      }
    }
  }

  const playAnswerAudio = (audioPath: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selecting the answer when clicking the audio icon
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = audioPath
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleAnswerSelect = (optionId: string) => {
    const newAnswers = { ...answers }
    newAnswers[currentQuestion] = optionId
    setAnswers(newAnswers)

    // Update test state for examiner
    const currentTestState = {
      currentQuestion,
      answers: newAnswers,
      studentName: studentInfo?.firstName || 'Student',
      testType: 'listening-comprehension',
      phase
    }
    localStorage.setItem(`listeningComprehensionTestState_${sessionId}`, JSON.stringify(currentTestState))
  }

  const handleStartQuestions = () => {
    setPhase('questions')
    setAudioProgress(0)
    // Auto-play first question audio
    setTimeout(() => playQuestionAudio(), 500)
  }

  const handleNext = () => {
    if (currentQuestion < TEST_CONTENT.questions.length - 1) {
      const nextQuestion = currentQuestion + 1
      setCurrentQuestion(nextQuestion)
      setAudioProgress(0)

      // Update test state
      const currentTestState = {
        currentQuestion: nextQuestion,
        answers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'listening-comprehension',
        phase
      }
      localStorage.setItem(`listeningComprehensionTestState_${sessionId}`, JSON.stringify(currentTestState))

      // Auto-play next question audio
      setTimeout(() => playQuestionAudio(), 500)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prevQuestion = currentQuestion - 1
      setCurrentQuestion(prevQuestion)
      setAudioProgress(0)

      // Update test state
      const currentTestState = {
        currentQuestion: prevQuestion,
        answers,
        studentName: studentInfo?.firstName || 'Student',
        testType: 'listening-comprehension',
        phase
      }
      localStorage.setItem(`listeningComprehensionTestState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  const handleFinishTest = () => {
    const testResults = TEST_CONTENT.questions.map((question, index) => {
      const answer = answers[index]
      const isCorrect = answer === question.correctAnswer

      return {
        questionId: question.id,
        answer,
        isCorrect,
        timestamp: new Date().toISOString()
      }
    })

    localStorage.setItem(`listening_comprehension_test_${sessionId}`, JSON.stringify(testResults))

    // Notify examiner that test is completed
    localStorage.setItem(`test_completed_${sessionId}`, JSON.stringify({
      completed: true,
      subtest: "listening-comprehension",
      timestamp: new Date().toISOString()
    }))

    setPhase('completed')
  }

  const handleRestartTest = () => {
    setPhase('passage')
    setCurrentQuestion(0)
    setAnswers({})
    setIsPlaying(false)
    setAudioProgress(0)
    setHasListenedToPassage(false)
    setHasStarted(false)
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

  if (phase === 'completed') {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Great Job!</h2>
          <p className="text-gray-600 mb-6">You completed the listening comprehension test.</p>
          <button
            onClick={handleRestartTest}
            className="px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
          >
            Restart Test
          </button>
        </div>
      </div>
    )
  }

  const question = TEST_CONTENT.questions[currentQuestion]

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget
    if (audio.duration) {
      setAudioProgress((audio.currentTime / audio.duration) * 100)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
    setAudioProgress(100)
    if (phaseRef.current === 'passage') {
      setHasListenedToPassage(true)
      setPhase('questions')
      setAudioProgress(0)
    }
  }

  const handleAudioPlay = () => {
    setIsPlaying(true)
  }

  const handleAudioPause = () => {
    setIsPlaying(false)
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onEnded={handleAudioEnded}
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
      />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8">

          {/* Passage Phase - Listen to the audio passage */}
          {phase === 'passage' && (
            <div className="text-center">
              {!hasStarted ? (
                /* Start button - user must click to begin */
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setHasStarted(true)}
                    className="w-24 h-24 rounded-xl flex items-center justify-center bg-blue-100 hover:bg-blue-200 transition-all"
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
              ) : (
                /* Audio Player Visual Indicator */
                <div className="flex flex-col items-center">
                  {/* Speaker Icon - non-clickable, pulses while playing */}
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
                  <div
                    className={`w-24 h-24 rounded-xl flex items-center justify-center transition-all ${
                      isPlaying
                        ? 'bg-blue-200 shadow-lg animate-pulse-scale'
                        : 'bg-blue-100'
                    }`}
                  >
                    <svg
                      className={`w-12 h-12 ${isPlaying ? 'text-blue-700' : 'text-blue-500'}`}
                      fill="currentColor"
                      viewBox="0 0 256 256"
                    >
                      <path d="M216,104a8,8,0,0,1-16,0,72,72,0,0,0-144,0c0,26.7,8.53,34.92,17.57,43.64C82.21,156,92,165.41,92,188a36,36,0,0,0,36,36c10.24,0,18.45-4.16,25.83-13.09a8,8,0,1,1,12.34,10.18C155.81,233.64,143,240,128,240a52.06,52.06,0,0,1-52-52c0-15.79-5.68-21.27-13.54-28.84C52.46,149.5,40,137.5,40,104a88,88,0,0,1,176,0Zm-38.13,57.08A8,8,0,0,0,166.93,164,8,8,0,0,1,152,160c0-9.33,4.82-15.76,10.4-23.2,6.37-8.5,13.6-18.13,13.6-32.8a48,48,0,0,0-96,0,8,8,0,0,0,16,0,32,32,0,0,1,64,0c0,9.33-4.82,15.76-10.4,23.2-6.37,8.5-13.6,18.13-13.6,32.8a24,24,0,0,0,44.78,12A8,8,0,0,0,177.87,161.08Z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questions Phase */}
          {phase === 'questions' && question && (
            <div>
              {/* Audio Indicator for Question */}
              <div className="flex justify-center mb-6">
                <button
                  onClick={toggleAudio}
                  className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-blue-200 shadow-lg'
                      : 'bg-blue-100 hover:bg-blue-200'
                  }`}
                >
                  <svg
                    className={`w-8 h-8 ${isPlaying ? 'text-blue-700' : 'text-blue-500'}`}
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

              {/* Question Text */}
              <h2 className="text-lg font-medium text-gray-900 mb-8 text-center leading-relaxed">
                {question.question}
              </h2>

              {/* Multiple Choice Options */}
              <div className="space-y-4 mb-8">
                {question.options.map((option) => (
                  <div key={option.id} className="flex items-start gap-3">
                    {/* Audio icon button - outside the answer container */}
                    <button
                      onClick={(e) => playAnswerAudio(option.audioPath, e)}
                      className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center flex-shrink-0 transition-colors mt-3"
                    >
                      <svg
                        className="w-4 h-4 text-blue-600"
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
                    {/* Answer choice container */}
                    <button
                      onClick={() => handleAnswerSelect(option.id)}
                      className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${
                        answers[currentQuestion] === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Radio circle */}
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                          answers[currentQuestion] === option.id
                            ? 'border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {answers[currentQuestion] === option.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                        {/* Option text */}
                        <span className="text-gray-700 leading-relaxed">
                          {option.text}
                        </span>
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="text-sm text-gray-500">
                  Question {currentQuestion + 1} of {TEST_CONTENT.questions.length}
                </div>

                {currentQuestion === TEST_CONTENT.questions.length - 1 ? (
                  <button
                    onClick={handleFinishTest}
                    disabled={!answers[currentQuestion]}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Finish Test
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={!answers[currentQuestion]}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
