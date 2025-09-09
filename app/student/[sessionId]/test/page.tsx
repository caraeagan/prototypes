"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

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

export default function StudentTest() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{[key: number]: any}>({}) // Store all answers by question index
  const [testState, setTestState] = useState("active") // active, waiting, completed
  const [showHand, setShowHand] = useState(true)
  const [showHands, setShowHands] = useState(true) // For finger comparison question
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false) // For audio estimation question
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [hasPlayedAudioA, setHasPlayedAudioA] = useState(false) // For audio duration comparison
  const [hasPlayedAudioB, setHasPlayedAudioB] = useState(false)
  const [isPlayingAudioA, setIsPlayingAudioA] = useState(false)
  const [isPlayingAudioB, setIsPlayingAudioB] = useState(false)

  useEffect(() => {
    // Get student info - only on client side
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
            if (command.action === "start_analogies") {
              // Clear the command and navigate to analogies
              localStorage.removeItem(`examinerCommand_${sessionId}`)
              router.push(`/student/${sessionId}/analogies`)
            } else if (command.action === "start_pattern_reasoning") {
              // Clear the command and navigate to pattern reasoning
              localStorage.removeItem(`examinerCommand_${sessionId}`)
              router.push(`/student/${sessionId}/pattern-reasoning`)
            } else if (command.action === "complete_test") {
              // If examiner decides to end the session
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
  }, [testState, sessionId, router])

  // Handle visual/audio elements for different question types
  useEffect(() => {
    const question = QUESTIONS[currentQuestion]
    if (question.type === "finger_count") {
      setShowHand(true)
      const timer = setTimeout(() => {
        setShowHand(false)
      }, 1000) // Hand disappears after 1 second

      return () => clearTimeout(timer)
    } else if (question.type === "finger_comparison") {
      setShowHands(true)
      const timer = setTimeout(() => {
        setShowHands(false)
      }, question.displayTime || 5000) // Hands disappear after 5 seconds

      return () => clearTimeout(timer)
    } else if (question.type === "audio_estimation") {
      // Reset audio state when entering audio question
      setHasPlayedAudio(false)
      setIsPlayingAudio(false)
    } else if (question.type === "audio_duration_comparison") {
      // Reset audio comparison states
      setHasPlayedAudioA(false)
      setHasPlayedAudioB(false)
      setIsPlayingAudioA(false)
      setIsPlayingAudioB(false)
    }
  }, [currentQuestion])

  const playAudio = () => {
    const question = QUESTIONS[currentQuestion]
    if (typeof window !== 'undefined') {
      setIsPlayingAudio(true)
      
      if (question.audioFile) {
        // Try to play actual audio file
        const audio = new Audio(question.audioFile)
        
        audio.onended = () => {
          setIsPlayingAudio(false)
          setHasPlayedAudio(true)
        }
        
        audio.onerror = () => {
          // If audio file doesn't exist, simulate playback
          console.log("Audio file not found, simulating playback")
          setTimeout(() => {
            setIsPlayingAudio(false)
            setHasPlayedAudio(true)
          }, 3000) // Simulate 3 seconds of audio
        }
        
        audio.play().catch(error => {
          // If audio play fails, simulate playback
          console.log("Audio play failed, simulating playback")
          setTimeout(() => {
            setIsPlayingAudio(false)
            setHasPlayedAudio(true)
          }, 3000) // Simulate 3 seconds of audio
        })
      } else {
        // No audio file specified, simulate playback
        setTimeout(() => {
          setIsPlayingAudio(false)
          setHasPlayedAudio(true)
        }, 3000) // Simulate 3 seconds of audio
      }
    }
  }

  const playAudioA = () => {
    const question = QUESTIONS[currentQuestion]
    if (typeof window !== 'undefined') {
      setIsPlayingAudioA(true)
      
      // Simulate audio A playback (shorter duration)
      setTimeout(() => {
        setIsPlayingAudioA(false)
        setHasPlayedAudioA(true)
      }, question.audioA?.duration || 2000) // Default 2 seconds
    }
  }

  const playAudioB = () => {
    const question = QUESTIONS[currentQuestion]
    if (typeof window !== 'undefined') {
      setIsPlayingAudioB(true)
      
      // Simulate audio B playback (longer duration)
      setTimeout(() => {
        setIsPlayingAudioB(false)
        setHasPlayedAudioB(true)
      }, question.audioB?.duration || 4000) // Default 4 seconds
    }
  }

  const handleAnswer = (answer: string | number) => {
    const newAnswers = { ...answers }
    
    // Simple answer storage - each question gets one answer
    newAnswers[currentQuestion] = {
      answer: answer,
      isComplete: answer !== null && answer !== undefined && answer !== ""
    }
    
    setAnswers(newAnswers)
    
    // Update test state for examiner
    if (typeof window !== 'undefined') {
      const currentTestState = {
        currentQuestion,
        answers: newAnswers,
        studentName: studentInfo?.firstName || 'Student'
      }
      localStorage.setItem(`testState_${sessionId}`, JSON.stringify(currentTestState))
    }
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      let nextQuestionIndex = currentQuestion + 1
      
      // Check if next question has conditional display logic
      while (nextQuestionIndex < QUESTIONS.length) {
        const nextQuestion = QUESTIONS[nextQuestionIndex]
        
        // Check if this question should be shown based on previous answers
        if (nextQuestion.showOnlyIf) {
          const prevQuestionIndex = QUESTIONS.findIndex(q => q.id === nextQuestion.showOnlyIf.previousQuestionId)
          const prevAnswer = answers[prevQuestionIndex]?.answer
          
          if (prevAnswer !== nextQuestion.showOnlyIf.previousAnswer) {
            // Skip this question
            nextQuestionIndex++
            continue
          }
        }
        
        break // Found the next question to show
      }
      
      if (nextQuestionIndex < QUESTIONS.length) {
        setCurrentQuestion(nextQuestionIndex)
      }
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleFinishTest = () => {
    // Calculate final scores and store results
    const testResults = QUESTIONS.map((question, index) => {
      const answer = answers[index]
      let isCorrect = false
      
      if (question.type === "finger_count") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "comparison" || question.type === "weight_comparison" || question.type === "messy_room_comparison") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "circles_yesno" || question.type === "dots_yesno") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "circles_select" || question.type === "dots_select_smallest") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "area_estimation") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "liquid_capacity") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "finger_comparison") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "audio_estimation") {
        isCorrect = answer?.answer === question.correctAnswer
      } else if (question.type === "audio_duration_comparison") {
        isCorrect = answer?.answer === question.correctAnswer
      }
      
      return {
        questionId: question.id,
        answer,
        isCorrect,
        timestamp: new Date().toISOString()
      }
    })
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`test_${sessionId}`, JSON.stringify(testResults))
      
      // Mark as waiting for examiner to start next subtest
      const waitingState = {
        testComplete: true,
        currentSubtest: "value_estimation_complete",
        studentName: studentInfo?.firstName || 'Student'
      }
      localStorage.setItem(`waitingState_${sessionId}`, JSON.stringify(waitingState))
    }
    
    setTestState("waiting")
  }

  // Create circle grid component
  const renderCircleGrid = (isSelectableQuestion = false) => {
    const circles = []
    const question = QUESTIONS[currentQuestion]
    
    // Random positions for 24 circles scattered across the area
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
      const isSelected = isSelectableQuestion && answers[currentQuestion]?.answer === i
      const position = positions[i]
      
      if (isSelectableQuestion) {
        // Selectable circles for "which circle is different" question
        circles.push(
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className={`absolute rounded-full transition-all ${
              isSelected 
                ? "bg-blue-900 border-2 border-blue-900" 
                : "bg-green-300 border-2 border-green-300 hover:border-blue-900"
            }`}
            style={{
              width: isLarger ? "48px" : "40px",
              height: isLarger ? "48px" : "40px",
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )
      } else {
        // Display-only circles for "are they the same size" question
        circles.push(
          <div
            key={i}
            className="absolute rounded-full bg-green-300 border-2 border-green-300"
            style={{
              width: isLarger ? "48px" : "40px",
              height: isLarger ? "48px" : "40px",
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )
      }
    }
    
    return (
      <div className="relative w-full h-96 max-w-2xl mx-auto">
        {circles}
      </div>
    )
  }

  // Create dots grid with varied sizes
  const renderDotsGrid = (isSelectableQuestion = false) => {
    const dots = []
    const question = QUESTIONS[currentQuestion]
    
    // Fewer positions for dots (12 dots instead of 24)
    const positions = [
      { top: '15%', left: '20%' }, { top: '12%', left: '50%' }, { top: '18%', left: '80%' },
      { top: '35%', left: '15%' }, { top: '30%', left: '45%' }, { top: '40%', left: '75%' },
      { top: '55%', left: '25%' }, { top: '50%', left: '60%' }, { top: '45%', left: '85%' },
      { top: '75%', left: '20%' }, { top: '80%', left: '55%' }, { top: '70%', left: '80%' }
    ]
    
    // Define different sizes for dots - more varied than circles
    const getSizeForDot = (index) => {
      if (index === question.smallestDotPosition) return "28px" // Smallest
      if (index === 3 || index === 9) return "52px" // Largest
      if (index === 1 || index === 7) return "46px" // Large
      if (index === 2 || index === 5 || index === 11) return "42px" // Medium-large
      if (index === 4 || index === 6) return "38px" // Medium
      return "32px" // Small-medium (default)
    }
    
    for (let i = 0; i < 12; i++) {
      const isSelected = isSelectableQuestion && answers[currentQuestion]?.answer === i
      const position = positions[i]
      const size = getSizeForDot(i)
      
      if (isSelectableQuestion) {
        // Selectable dots for "which dot is smallest" question
        dots.push(
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className={`absolute rounded-full transition-all ${
              isSelected 
                ? "bg-blue-900 border-2 border-blue-900" 
                : "bg-red-400 border-2 border-red-400 hover:border-blue-900"
            }`}
            style={{
              width: size,
              height: size,
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )
      } else {
        // Display-only dots for "are they the same size" question
        dots.push(
          <div
            key={i}
            className="absolute rounded-full bg-red-400 border-2 border-red-400"
            style={{
              width: size,
              height: size,
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )
      }
    }
    
    return (
      <div className="relative w-full h-96 max-w-2xl mx-auto">
        {dots}
      </div>
    )
  }

  // Render geometric figures for area estimation
  const renderFigure = (figureData: { id: number; shape: string }, isSelected = false) => {
    const { id, shape } = figureData
    const size = 80 // SVG size
    
    const svgClass = `transition-all ${isSelected ? 'stroke-blue-900' : 'stroke-gray-800'}`
    
    const figures = {
      circle: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx={size/2} cy={size/2} r={(size-6)/2} fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      plus: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="2"/>
          <rect x="4" y="4" width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="2"/>
          <rect x={size-size/3} y="4" width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="2"/>
          <rect x="4" y={size-size/3} width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="2"/>
          <rect x={size-size/3} y={size-size/3} width={size/3-2} height={size/3-2} fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      triangle: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="2"/>
          <polygon points={`${size/2},4 ${size-4},${size-4} 4,${size-4}`} fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      diamond: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="2"/>
          <polygon points={`${size/2},4 ${size-4},${size/2} ${size/2},${size-4} 4,${size/2}`} fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      hexagon: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="2"/>
          <polygon points={`${size/2-18},12 ${size/2+18},12 ${size/2+26},${size/2} ${size/2+18},${size-12} ${size/2-18},${size-12} ${size/2-26},${size/2}`} fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      cross: (
        <svg width={size} height={size} className={svgClass}>
          <rect x="2" y="2" width={size-4} height={size-4} fill="none" stroke="currentColor" strokeWidth="2"/>
          <polygon points={`${size/2-15},10 ${size/2+15},10 ${size/2+15},${size/2-15} ${size-6},${size/2-15} ${size-6},${size/2+15} ${size/2+15},${size/2+15} ${size/2+15},${size-6} ${size/2-15},${size-6} ${size/2-15},${size/2+15} 6,${size/2+15} 6,${size/2-15} ${size/2-15},${size/2-15}`} fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    }
    
    return (figures as any)[shape] || <div>Shape not found</div>
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
          <p className="text-gray-600">You completed the activity.</p>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[currentQuestion]

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">Assessment</h1>
              <span className="text-sm text-gray-500">{studentInfo.firstName}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Question {currentQuestion + 1} of {QUESTIONS.length}
              </div>
              {/* Question Jump Selector */}
              <select
                value={currentQuestion}
                onChange={(e) => {
                  const newQuestion = parseInt(e.target.value)
                  setCurrentQuestion(newQuestion)
                  // Reset states for new question
                  setShowHand(true)
                  setShowHands(true)
                  setHasPlayedAudio(false)
                  setIsPlayingAudio(false)
                  setHasPlayedAudioA(false)
                  setHasPlayedAudioB(false)
                  setIsPlayingAudioA(false)
                  setIsPlayingAudioB(false)
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {QUESTIONS.map((_, index) => (
                  <option key={index} value={index}>
                    Q{index + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {question.question}
          </h2>

          {/* Finger Count Question */}
          {question.type === "finger_count" && (
            <div className="space-y-8">
              {/* Hand with 2 fingers - disappears after 1 second */}
              <div className="text-center h-40 flex flex-col justify-center">
                {showHand ? (
                  <>
                    <div className="text-9xl mb-6">✌️</div>
                    <p className="text-sm text-gray-500">Look carefully at this hand</p>
                  </>
                ) : (
                  <p className="text-lg text-gray-600">How many fingers did you see?</p>
                )}
              </div>
              
              {/* Number input field - always visible */}
              <div className="flex justify-center">
                <div className="text-center">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={answers[currentQuestion]?.answer || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || (parseInt(value) >= 0 && parseInt(value) <= 10)) {
                        handleAnswer(value === "" ? null : parseInt(value))
                      }
                    }}
                    className="w-24 h-16 text-3xl font-bold text-center border-2 border-gray-300 rounded-xl focus:border-blue-900 focus:outline-none"
                    placeholder="?"
                  />
                  <p className="text-sm text-gray-500 mt-2">Enter a number</p>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Question */}
          {(question.type === "comparison" || question.type === "weight_comparison") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {/* Option A */}
              <button
                onClick={() => handleAnswer("A")}
                className={`p-8 rounded-xl border-2 transition-all ${
                  answers[currentQuestion]?.answer === "A" 
                    ? "border-blue-900 bg-blue-100" 
                    : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                }`}
              >
                <div className="text-center">
                  <div className="text-8xl mb-4">{question.objectA?.emoji}</div>
                  <p className="text-lg font-medium text-gray-900">{question.objectA?.name}</p>
                </div>
              </button>

              {/* Option B */}
              <button
                onClick={() => handleAnswer("B")}
                className={`p-8 rounded-xl border-2 transition-all ${
                  answers[currentQuestion]?.answer === "B" 
                    ? "border-blue-900 bg-blue-100" 
                    : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                }`}
              >
                <div className="text-center">
                  <div className="text-8xl mb-4">{question.objectB?.emoji}</div>
                  <p className="text-lg font-medium text-gray-900">{question.objectB?.name}</p>
                </div>
              </button>
            </div>
          )}

          {/* Circles Yes/No Question */}
          {question.type === "circles_yesno" && (
            <div className="space-y-8">
              {renderCircleGrid(false)}
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => handleAnswer("yes")}
                  className={`px-8 py-4 rounded-xl border-2 transition-all ${
                    answers[currentQuestion]?.answer === "yes" 
                      ? "border-blue-900 bg-blue-100" 
                      : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-lg font-medium text-gray-900">Yes</span>
                </button>
                <button
                  onClick={() => handleAnswer("no")}
                  className={`px-8 py-4 rounded-xl border-2 transition-all ${
                    answers[currentQuestion]?.answer === "no" 
                      ? "border-blue-900 bg-blue-100" 
                      : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-lg font-medium text-gray-900">No</span>
                </button>
              </div>
            </div>
          )}

          {/* Circle Selection Question */}
          {question.type === "circles_select" && (
            <div className="space-y-6">
              <div className="text-center text-gray-600 mb-4">
                Click on the circle that is different
              </div>
              {renderCircleGrid(true)}
            </div>
          )}

          {/* Area Estimation Question */}
          {question.type === "area_estimation" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {question.figures?.map((figure) => (
                  <button
                    key={figure.id}
                    onClick={() => handleAnswer(figure.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      answers[currentQuestion]?.answer === figure.id
                        ? "border-blue-900 bg-blue-100"
                        : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="mb-2">
                        {renderFigure(figure, answers[currentQuestion]?.answer === figure.id)}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{figure.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dots Yes/No Question */}
          {question.type === "dots_yesno" && (
            <div className="space-y-8">
              {renderDotsGrid(false)}
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => handleAnswer("yes")}
                  className={`px-8 py-4 rounded-xl border-2 transition-all ${
                    answers[currentQuestion]?.answer === "yes" 
                      ? "border-blue-900 bg-blue-100" 
                      : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-lg font-medium text-gray-900">Yes</span>
                </button>
                <button
                  onClick={() => handleAnswer("no")}
                  className={`px-8 py-4 rounded-xl border-2 transition-all ${
                    answers[currentQuestion]?.answer === "no" 
                      ? "border-blue-900 bg-blue-100" 
                      : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-lg font-medium text-gray-900">No</span>
                </button>
              </div>
            </div>
          )}

          {/* Dot Selection Question */}
          {question.type === "dots_select_smallest" && (
            <div className="space-y-6">
              <div className="text-center text-gray-600 mb-4">
                Click on the smallest dot
              </div>
              {renderDotsGrid(true)}
            </div>
          )}

          {/* Liquid Capacity Question */}
          {question.type === "liquid_capacity" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {question.containers?.map((container) => (
                  <button
                    key={container.id}
                    onClick={() => handleAnswer(container.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      answers[currentQuestion]?.answer === container.id
                        ? "border-blue-900 bg-blue-100"
                        : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-3">{container.emoji}</div>
                      <p className="text-sm font-medium text-gray-900">{container.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messy Room Comparison */}
          {question.type === "messy_room_comparison" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Room A */}
                <button
                  onClick={() => handleAnswer("A")}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    answers[currentQuestion]?.answer === "A" 
                      ? "border-blue-900 bg-blue-100" 
                      : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                      {question.roomA?.image ? (
                        <img 
                          src={question.roomA.image} 
                          alt={question.roomA.description}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-6xl">🏠</div>
                      )}
                    </div>
                    <p className="text-lg font-medium text-gray-900">{question.roomA?.name}</p>
                  </div>
                </button>

                {/* Room B */}
                <button
                  onClick={() => handleAnswer("B")}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    answers[currentQuestion]?.answer === "B" 
                      ? "border-blue-900 bg-blue-100" 
                      : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <div className="text-center">
                    <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                      {question.roomB?.image ? (
                        <img 
                          src={question.roomB.image} 
                          alt={question.roomB.description}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-6xl">🏠</div>
                      )}
                    </div>
                    <p className="text-lg font-medium text-gray-900">{question.roomB?.name}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Finger Comparison Question */}
          {question.type === "finger_comparison" && (
            <div className="space-y-8">
              {/* Two hands display - disappears after 5 seconds */}
              <div className="text-center h-96 flex flex-col justify-center">
                {showHands ? (
                  <>
                    <p className="text-lg text-gray-600 mb-6">Look carefully at both hands</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-2xl mx-auto">
                      <div className="text-center">
                        <div className="w-48 h-48 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src={question.leftHand?.image}
                            alt="Left hand showing fingers"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-gray-500">Left Hand</p>
                      </div>
                      <div className="text-center">
                        <div className="w-48 h-48 mx-auto mb-4 flex items-center justify-center">
                          <img 
                            src={question.rightHand?.image}
                            alt="Right hand showing fingers"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-gray-500">Right Hand</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-lg text-gray-600 mb-8">Which hand had more fingers up?</p>
                    
                    {/* Answer options - only visible after hands disappear */}
                    <div className="flex justify-center space-x-8">
                      <button
                        onClick={() => handleAnswer("left")}
                        className={`px-8 py-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion]?.answer === "left"
                            ? "border-blue-900 bg-blue-100"
                            : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        <span className="text-xl font-bold text-gray-900">Left Hand</span>
                      </button>
                      <button
                        onClick={() => handleAnswer("right")}
                        className={`px-8 py-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion]?.answer === "right"
                            ? "border-blue-900 bg-blue-100"
                            : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        <span className="text-xl font-bold text-gray-900">Right Hand</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Audio Estimation Question */}
          {question.type === "audio_estimation" && (
            <div className="space-y-8">
              <div className="text-center h-64 flex flex-col justify-center">
                {!hasPlayedAudio ? (
                  <>
                    {!isPlayingAudio ? (
                      <>
                        <p className="text-2xl text-gray-900 mb-8">{question.instruction}</p>
                        
                        {/* Play button */}
                        <div className="flex justify-center">
                          <button
                            onClick={playAudio}
                            className="flex items-center space-x-3 px-8 py-4 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-all"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 012 2v0a2 2 0 01-2 2h-1.586a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 0010.586 14H9a2 2 0 01-2-2v0a2 2 0 012-2z" />
                            </svg>
                            <span className="text-xl">Play</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-lg text-gray-600 mb-6">Listen carefully</p>
                        
                        {/* Audio playing visual indicator */}
                        <div className="flex justify-center items-center space-x-4 mb-6">
                          <div className="flex space-x-1">
                            <div className="w-3 h-8 bg-blue-500 rounded animate-pulse"></div>
                            <div className="w-3 h-12 bg-blue-600 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-3 h-6 bg-blue-500 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                            <div className="w-3 h-10 bg-blue-600 rounded animate-pulse" style={{animationDelay: '0.6s'}}></div>
                            <div className="w-3 h-8 bg-blue-500 rounded animate-pulse" style={{animationDelay: '0.8s'}}></div>
                          </div>
                          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                          </svg>
                        </div>
                        
                        <p className="text-gray-600">Audio playing...</p>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xl text-gray-900 mb-8">{question.question}</p>
                    
                    {/* Answer options - only visible after audio has played */}
                    <div className="flex justify-center space-x-8">
                      <button
                        onClick={() => handleAnswer("less")}
                        className={`px-8 py-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion]?.answer === "less"
                            ? "border-blue-900 bg-blue-100"
                            : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        <span className="text-lg font-bold text-gray-900">Less than 50</span>
                      </button>
                      <button
                        onClick={() => handleAnswer("more")}
                        className={`px-8 py-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion]?.answer === "more"
                            ? "border-blue-900 bg-blue-100"
                            : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        <span className="text-lg font-bold text-gray-900">More than 50</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Audio Duration Comparison Question */}
          {question.type === "audio_duration_comparison" && (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-2xl text-gray-900 mb-8">{question.instruction}</p>
                
                {/* Two audio buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-8">
                  {/* Audio A */}
                  <div className="text-center">
                    <div className="h-32 flex flex-col justify-center">
                      {!isPlayingAudioA ? (
                        <button
                          onClick={playAudioA}
                          disabled={isPlayingAudioB} // Disable if other audio is playing
                          className="flex items-center space-x-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all mx-auto"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 012 2v0a2 2 0 01-2 2h-1.586a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 0010.586 14H9a2 2 0 01-2-2v0a2 2 0 012-2z" />
                          </svg>
                          <span>Play Sound A</span>
                        </button>
                      ) : (
                        <>
                          <div className="flex justify-center items-center space-x-2 mb-4">
                            <div className="flex space-x-1">
                              <div className="w-2 h-6 bg-green-500 rounded animate-pulse"></div>
                              <div className="w-2 h-8 bg-green-600 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-4 bg-green-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                              <div className="w-2 h-7 bg-green-600 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
                            </div>
                            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                            </svg>
                          </div>
                          <p className="text-green-700 font-medium">Playing Sound A...</p>
                        </>
                      )}
                    </div>
                    {hasPlayedAudioA && (
                      <div className="mt-2">
                        <svg className="w-6 h-6 text-green-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm text-green-600">Played</p>
                      </div>
                    )}
                  </div>

                  {/* Audio B */}
                  <div className="text-center">
                    <div className="h-32 flex flex-col justify-center">
                      {!isPlayingAudioB ? (
                        <button
                          onClick={playAudioB}
                          disabled={isPlayingAudioA} // Disable if other audio is playing
                          className="flex items-center space-x-3 px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all mx-auto"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15a2 2 0 012 2v0a2 2 0 01-2 2h-1.586a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 0010.586 14H9a2 2 0 01-2-2v0a2 2 0 012-2z" />
                          </svg>
                          <span>Play Sound B</span>
                        </button>
                      ) : (
                        <>
                          <div className="flex justify-center items-center space-x-2 mb-4">
                            <div className="flex space-x-1">
                              <div className="w-2 h-6 bg-purple-500 rounded animate-pulse"></div>
                              <div className="w-2 h-8 bg-purple-600 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-4 bg-purple-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                              <div className="w-2 h-7 bg-purple-600 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
                            </div>
                            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                            </svg>
                          </div>
                          <p className="text-purple-700 font-medium">Playing Sound B...</p>
                        </>
                      )}
                    </div>
                    {hasPlayedAudioB && (
                      <div className="mt-2">
                        <svg className="w-6 h-6 text-purple-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm text-purple-600">Played</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Answer options - only show after both audios have been played */}
                {hasPlayedAudioA && hasPlayedAudioB && (
                  <div>
                    <p className="text-xl text-gray-900 mb-6">{question.question}</p>
                    <div className="flex justify-center space-x-8">
                      <button
                        onClick={() => handleAnswer("A")}
                        className={`px-8 py-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion]?.answer === "A"
                            ? "border-blue-900 bg-blue-100"
                            : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        <span className="text-lg font-bold text-gray-900">Sound A was longer</span>
                      </button>
                      <button
                        onClick={() => handleAnswer("B")}
                        className={`px-8 py-4 rounded-xl border-2 transition-all ${
                          answers[currentQuestion]?.answer === "B"
                            ? "border-blue-900 bg-blue-100"
                            : "border-gray-300 hover:border-blue-900 hover:bg-blue-50"
                        }`}
                      >
                        <span className="text-lg font-bold text-gray-900">Sound B was longer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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