'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

// Test configuration
const SYMBOLS = [
  {
    id: 1,
    image: "/images/associative-learning/symbol1.png",
    sound: "/audio/associative-learning/sound1.mp3",
  },
  {
    id: 3,
    image: "/images/associative-learning/symbol3.png",
    sound: "/audio/associative-learning/sound3.mp3",
  },
  {
    id: 2,
    image: "/images/associative-learning/symbol2.png",
    sound: "/audio/associative-learning/sound2.mp3",
  }
]

// All 6 symbols for sentence building (3 correct + 3 distractors)
const ALL_SYMBOLS = [
  "/images/associative-learning/symbol1.png",
  "/images/associative-learning/symbol2.png",
  "/images/associative-learning/symbol3.png",
  "/images/associative-learning/symbol4.png",
  "/images/associative-learning/symbol5.png",
  "/images/associative-learning/symbol6.png",
]

// Distractors for each test question (3 distractors per question)
const DISTRACTORS = {
  1: ["/images/associative-learning/symbol2.png", "/images/associative-learning/symbol4.png", "/images/associative-learning/symbol5.png"],
  2: ["/images/associative-learning/symbol1.png", "/images/associative-learning/symbol4.png", "/images/associative-learning/symbol6.png"],
  3: ["/images/associative-learning/symbol1.png", "/images/associative-learning/symbol4.png", "/images/associative-learning/symbol6.png"],
}

// Correct sentence order (matches SYMBOLS order: symbol1, symbol3, symbol2)
const CORRECT_SENTENCE = [
  "/images/associative-learning/symbol1.png",
  "/images/associative-learning/symbol3.png",
  "/images/associative-learning/symbol2.png",
]

// Practice uses the same symbols as the test
const PRACTICE_SYMBOLS = SYMBOLS

// Distractors for practice questions (same as test distractors)
const PRACTICE_DISTRACTORS = DISTRACTORS

const MAX_PRACTICE_ATTEMPTS = 3

type Phase = 'practice-intro' | 'practice-test' | 'intro' | 'test' | 'correction' | 'sentence' | 'sentence-correction' | 'complete' | 'practice-failed'

export default function AssociativeLearningV2() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  // Phase management
  const [phase, setPhase] = useState<Phase>('practice-intro')
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(0) // Track which symbol we're on (0-2)

  // Practice phase
  const [currentPracticeSymbolIndex, setCurrentPracticeSymbolIndex] = useState(0) // Track which practice symbol we're on (0-2)
  const [practiceAttempts, setPracticeAttempts] = useState(0)
  const [practiceShuffledChoices, setPracticeShuffledChoices] = useState<string[]>([])
  const [practiceFailedItems, setPracticeFailedItems] = useState(0) // Track how many items user failed all 3 attempts

  // Testing phase
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  // Correction animation
  const [correctionStep, setCorrectionStep] = useState(0) // 0: show incorrect, 1: move incorrect back, 2: move correct up, 3: show correct and play audio

  // Sentence building
  const [sentenceSlots, setSentenceSlots] = useState<(string | null)[]>([null, null, null])
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([...ALL_SYMBOLS])
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null)
  const [sentenceSubmitted, setSentenceSubmitted] = useState(false)
  const [sentenceCorrect, setSentenceCorrect] = useState(false)

  // Sentence correction animation
  const [sentenceCorrectionStep, setSentenceCorrectionStep] = useState(0) // 0: show incorrect, 1-3: show tiles one by one, 4: play audio
  const [studentAnswer, setStudentAnswer] = useState<string[]>([])
  const [correctTilesShown, setCorrectTilesShown] = useState(0) // Number of correct tiles shown (0-3)

  // Audio play count tracking - limit each symbol to 2 plays
  const [audioPlayCounts, setAudioPlayCounts] = useState<Record<string, number>>({})
  const MAX_AUDIO_PLAYS = 2

  const audioRef = useRef<HTMLAudioElement>(null)
  const isPlayingAudioRef = useRef(false) // Flag to prevent concurrent audio playback

  // Initialize practice question choices when entering practice-test phase
  useEffect(() => {
    if (phase === 'practice-test') {
      initializePracticeQuestion(currentPracticeSymbolIndex)
    }
  }, [phase, currentPracticeSymbolIndex])

  // Initialize question choices when entering test phase
  useEffect(() => {
    if (phase === 'test') {
      initializeQuestion(currentSymbolIndex)
    }
  }, [phase, currentSymbolIndex])

  // Auto-play audio for practice-test phase
  useEffect(() => {
    if (phase === 'practice-test' && !showFeedback) {
      playAudio(PRACTICE_SYMBOLS[currentPracticeSymbolIndex].sound, true)
    }
  }, [phase, showFeedback, currentPracticeSymbolIndex])

  // Auto-play audio for current question in test phase
  useEffect(() => {
    if (phase === 'test' && !showFeedback) {
      playAudio(SYMBOLS[currentSymbolIndex].sound, true)
    }
  }, [phase, currentSymbolIndex, showFeedback])

  // Play combined audio for sentence building
  useEffect(() => {
    if (phase === 'sentence' && !sentenceSubmitted) {
      playCombinedAudio(true)
    }
  }, [phase])

  const playAudio = (soundPath: string, isAutoPlay: boolean = false) => {
    // Check if audio play limit has been reached for this sound (only for manual plays)
    if (!isAutoPlay) {
      const currentCount = audioPlayCounts[soundPath] || 0
      if (currentCount >= MAX_AUDIO_PLAYS) {
        return // Audio disabled for this sound
      }
    }

    if (audioRef.current) {
      audioRef.current.src = soundPath
      audioRef.current.play()
      // Increment play count only for manual plays
      if (!isAutoPlay) {
        setAudioPlayCounts(prev => ({
          ...prev,
          [soundPath]: (prev[soundPath] || 0) + 1
        }))
      }
    }
  }

  const playCombinedAudio = async (isAutoPlay: boolean = false) => {
    // Prevent concurrent playback
    if (isPlayingAudioRef.current) return
    if (!audioRef.current) return

    // Check if any audio can still be played (only for manual plays)
    if (!isAutoPlay) {
      const canPlayAny = SYMBOLS.some(symbol => {
        const count = audioPlayCounts[symbol.sound] || 0
        return count < MAX_AUDIO_PLAYS
      })
      if (!canPlayAny) return // All audio disabled
    }

    isPlayingAudioRef.current = true

    try {
      // Play all three audio files in sequence (only those not at limit for manual plays)
      for (let i = 0; i < SYMBOLS.length; i++) {
        const soundPath = SYMBOLS[i].sound
        const currentCount = audioPlayCounts[soundPath] || 0

        if (!isAutoPlay && currentCount >= MAX_AUDIO_PLAYS) {
          continue // Skip this sound, it's at limit
        }

        await new Promise<void>((resolve) => {
          if (!audioRef.current) {
            resolve()
            return
          }

          const audio = audioRef.current

          // Fully reset the audio element
          audio.pause()
          audio.onended = null
          audio.currentTime = 0

          // Set new source
          audio.src = soundPath
          audio.load()

          // Increment play count only for manual plays
          if (!isAutoPlay) {
            setAudioPlayCounts(prev => ({
              ...prev,
              [soundPath]: (prev[soundPath] || 0) + 1
            }))
          }

          // Use a simple onended handler that only fires once
          let hasEnded = false
          audio.onended = () => {
            if (hasEnded) return
            hasEnded = true
            audio.onended = null
            resolve()
          }

          audio.play().catch(() => resolve())
        })
      }
    } finally {
      isPlayingAudioRef.current = false
    }
  }

  const initializePracticeQuestion = (symbolIndex: number) => {
    const currentSymbol = PRACTICE_SYMBOLS[symbolIndex]
    const choices = [currentSymbol.image, ...PRACTICE_DISTRACTORS[currentSymbol.id as keyof typeof PRACTICE_DISTRACTORS]]

    // Shuffle choices
    const shuffled = [...choices].sort(() => Math.random() - 0.5)
    setPracticeShuffledChoices(shuffled)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setCorrectionStep(0)
    setIsCorrect(false)
  }

  const initializeQuestion = (symbolIndex: number) => {
    const currentSymbol = SYMBOLS[symbolIndex]
    const choices = [currentSymbol.image, ...DISTRACTORS[currentSymbol.id as keyof typeof DISTRACTORS]]

    // Shuffle choices
    const shuffled = [...choices].sort(() => Math.random() - 0.5)
    setShuffledChoices(shuffled)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setCorrectionStep(0) // Reset correction step for new question
    setIsCorrect(false) // Reset correct state for new question
  }

  // Auto-play audio when entering practice-intro phase
  useEffect(() => {
    if (phase === 'practice-intro') {
      playAudio(PRACTICE_SYMBOLS[currentPracticeSymbolIndex].sound, true)
    }
  }, [phase, currentPracticeSymbolIndex])

  // Auto-play audio when entering intro phase
  useEffect(() => {
    if (phase === 'intro') {
      playAudio(SYMBOLS[currentSymbolIndex].sound, true)
    }
  }, [phase, currentSymbolIndex])

  // PRACTICE PHASE: Introduction - Show symbol-audio pair, then move to practice testing
  const handlePracticeIntroNext = () => {
    setPhase('practice-test')
    initializePracticeQuestion(currentPracticeSymbolIndex)
  }

  const playPracticeIntroAudio = () => {
    playAudio(PRACTICE_SYMBOLS[currentPracticeSymbolIndex].sound)
  }

  // PRACTICE PHASE: Testing - Answer questions with up to 3 attempts
  const handlePracticeAnswerSelect = (choice: string) => {
    if (showFeedback) return // Prevent changes after submission
    setSelectedAnswer(choice)

    // Immediately evaluate the answer
    const currentPracticeSymbol = PRACTICE_SYMBOLS[currentPracticeSymbolIndex]
    const correct = choice === currentPracticeSymbol.image

    setIsCorrect(correct)
    setShowFeedback(true)

    if (correct) {
      // Play audio for correct answer
      playAudio(currentPracticeSymbol.sound, true)
    } else {
      // Increment attempt count
      setPracticeAttempts(prev => prev + 1)
      // Start correction animation on same screen
      setCorrectionStep(0)
    }
  }

  const handlePracticeAnswerSlotDrop = () => {
    if (draggedSymbol && !showFeedback) {
      handlePracticeAnswerSelect(draggedSymbol)
      setDraggedSymbol(null)
    }
  }

  const handlePracticeTestNext = (failedAllAttempts: boolean = false) => {
    // Track if user failed all attempts for this item
    const newFailedItems = failedAllAttempts ? practiceFailedItems + 1 : practiceFailedItems
    if (failedAllAttempts) {
      setPracticeFailedItems(newFailedItems)
    }

    // If user has failed 2 items, end the test early
    if (newFailedItems >= 2) {
      setPhase('practice-failed')
      setCorrectionStep(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setIsCorrect(false)
      return
    }

    // Move to next practice symbol or to the actual learn phase
    if (currentPracticeSymbolIndex < PRACTICE_SYMBOLS.length - 1) {
      // Go to next practice symbol's intro
      setCurrentPracticeSymbolIndex(currentPracticeSymbolIndex + 1)
      setPracticeAttempts(0)
      setPhase('practice-intro')
      setCorrectionStep(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setIsCorrect(false)
    } else {
      // All practice symbols done, go to actual learn phase
      setPhase('intro')
      setCorrectionStep(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setIsCorrect(false)
    }
  }

  // PHASE 1: Introduction - Show symbol-audio pair, then move to testing
  const handleIntroNext = () => {
    // After showing the symbol, immediately test it
    setPhase('test')
    initializeQuestion(currentSymbolIndex)
  }

  const playIntroAudio = () => {
    playAudio(SYMBOLS[currentSymbolIndex].sound)
  }

  // PHASE 2: Testing - Answer questions
  const handleAnswerSelect = (choice: string) => {
    if (showFeedback) return // Prevent changes after submission
    setSelectedAnswer(choice)

    // Immediately evaluate the answer
    const currentSymbol = SYMBOLS[currentSymbolIndex]
    const correct = choice === currentSymbol.image

    setIsCorrect(correct)
    setShowFeedback(true)

    if (correct) {
      // Play audio for correct answer
      playAudio(currentSymbol.sound, true)
    } else {
      // Start correction animation on same screen
      setCorrectionStep(0)
    }
  }

  const handleAnswerSlotDrop = () => {
    if (draggedSymbol && !showFeedback) {
      handleAnswerSelect(draggedSymbol)
      setDraggedSymbol(null)
    }
  }

  const handleTestNext = () => {
    // Move to next symbol or sentence phase
    if (currentSymbolIndex < SYMBOLS.length - 1) {
      // Go to next symbol's intro
      setCurrentSymbolIndex(currentSymbolIndex + 1)
      setPhase('intro')
      setCorrectionStep(0)
    } else {
      // All symbols learned and tested, go to sentence building
      setPhase('sentence')
      setCorrectionStep(0)
    }
  }

  // Auto-advance after correct answer in test phase
  useEffect(() => {
    if (phase === 'test' && showFeedback && isCorrect) {
      // Wait 1.5 seconds to show correct feedback, then move to next
      const timer = setTimeout(() => {
        handleTestNext()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [phase, showFeedback, isCorrect])

  // Auto-advance after correct answer in practice-test phase
  useEffect(() => {
    if (phase === 'practice-test' && showFeedback && isCorrect) {
      // Wait 1.5 seconds to show correct feedback, then move to next practice symbol or learn phase
      const timer = setTimeout(() => {
        handlePracticeTestNext()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [phase, showFeedback, isCorrect])

  // PHASE 3: Correction (shown on test screen)
  // Step 0: Show incorrect answer highlighted in red in slot (1 second)
  // Step 1: Incorrect answer back in choices (highlighted red), answer slot empty (1 second)
  // Step 2: Correct answer highlighted in green in choices, answer slot empty (1 second)
  // Step 3: Correct answer shown in slot
  useEffect(() => {
    if (phase === 'test' && showFeedback && !isCorrect) {
      if (correctionStep === 0) {
        // Show incorrect choice for 1 second
        const timer = setTimeout(() => setCorrectionStep(1), 1000)
        return () => clearTimeout(timer)
      } else if (correctionStep === 1) {
        // Incorrect back in row for 1 second
        const timer = setTimeout(() => setCorrectionStep(2), 1000)
        return () => clearTimeout(timer)
      } else if (correctionStep === 2) {
        // Correct highlighted for 1 second, then show in slot
        const timer = setTimeout(() => {
          setCorrectionStep(3)
          // Play audio when correct answer appears in slot
          playAudio(SYMBOLS[currentSymbolIndex].sound, true)
        }, 1000)
        return () => clearTimeout(timer)
      }
      // correctionStep === 3: correct answer in slot with button
    }
  }, [phase, showFeedback, isCorrect, correctionStep])

  // Practice phase correction
  useEffect(() => {
    if (phase === 'practice-test' && showFeedback && !isCorrect) {
      if (correctionStep === 0) {
        // Show incorrect choice for 1 second
        const timer = setTimeout(() => setCorrectionStep(1), 1000)
        return () => clearTimeout(timer)
      } else if (correctionStep === 1) {
        // Incorrect back in row for 1 second
        const timer = setTimeout(() => setCorrectionStep(2), 1000)
        return () => clearTimeout(timer)
      } else if (correctionStep === 2) {
        // Correct highlighted for 1 second, then show in slot
        const timer = setTimeout(() => {
          setCorrectionStep(3)
          // Play audio when correct answer appears in slot
          playAudio(PRACTICE_SYMBOLS[currentPracticeSymbolIndex].sound, true)
        }, 1000)
        return () => clearTimeout(timer)
      } else if (correctionStep === 3) {
        // Check if this is the 2nd failed item (user will have failed 2 items after this)
        // practiceAttempts is already incremented, so if it's >= MAX and this would be the 2nd failure
        if (practiceAttempts >= MAX_PRACTICE_ATTEMPTS && practiceFailedItems >= 1) {
          // Auto-advance to practice-failed screen after showing correction
          const timer = setTimeout(() => {
            setPhase('practice-failed')
          }, 1500)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [phase, showFeedback, isCorrect, correctionStep, currentPracticeSymbolIndex, practiceAttempts, practiceFailedItems])

  // PHASE 4: Sentence Building
  const handleDragStart = (symbol: string) => {
    setDraggedSymbol(symbol)
  }

  const handleDrop = (slotIndex: number) => {
    if (draggedSymbol) {
      const newSlots = [...sentenceSlots]

      // If slot already has a symbol, return it to available symbols
      if (newSlots[slotIndex]) {
        setAvailableSymbols([...availableSymbols, newSlots[slotIndex]!])
      }

      // Place dragged symbol in slot
      newSlots[slotIndex] = draggedSymbol
      setSentenceSlots(newSlots)

      // Remove from available symbols
      setAvailableSymbols(availableSymbols.filter(s => s !== draggedSymbol))
      setDraggedSymbol(null)
    }
  }

  const handleRemoveFromSlot = (slotIndex: number) => {
    const symbol = sentenceSlots[slotIndex]
    if (symbol) {
      setSentenceSlots(sentenceSlots.map((s, i) => i === slotIndex ? null : s))
      setAvailableSymbols([...availableSymbols, symbol])
    }
  }

  const handleSymbolClick = (symbol: string) => {
    // Find first empty slot
    const firstEmptyIndex = sentenceSlots.findIndex(s => s === null)
    if (firstEmptyIndex !== -1) {
      const newSlots = [...sentenceSlots]
      newSlots[firstEmptyIndex] = symbol
      setSentenceSlots(newSlots)
      setAvailableSymbols(availableSymbols.filter(s => s !== symbol))
    }
  }

  const handleSentenceSubmit = () => {
    const answer = sentenceSlots.filter(s => s !== null) as string[]

    if (answer.length !== 3) {
      alert('Please fill all three slots')
      return
    }

    // Go directly to test ended screen without showing correction
    setPhase('complete')
  }

  // PHASE 5: Sentence Correction Animation (shown inline on sentence screen)
  useEffect(() => {
    if (sentenceSubmitted && !sentenceCorrect) {
      if (sentenceCorrectionStep === 0) {
        // Show incorrect answer for 1 second
        const timer = setTimeout(() => {
          setSentenceCorrectionStep(1)
          setCorrectTilesShown(1) // Show first tile
        }, 1000)
        return () => clearTimeout(timer)
      } else if (sentenceCorrectionStep >= 1 && sentenceCorrectionStep <= 2) {
        // Show tiles one by one (500ms between each)
        const timer = setTimeout(() => {
          setSentenceCorrectionStep(sentenceCorrectionStep + 1)
          setCorrectTilesShown(sentenceCorrectionStep + 1)
        }, 500)
        return () => clearTimeout(timer)
      } else if (sentenceCorrectionStep === 3) {
        // Show final tile, then play audio after a brief pause
        const timer = setTimeout(() => {
          setCorrectTilesShown(3)
          playCombinedAudio()
          setSentenceCorrectionStep(4)
        }, 500)
        return () => clearTimeout(timer)
      }
      // sentenceCorrectionStep === 4: all tiles shown, audio playing, show buttons
    }
  }, [sentenceSubmitted, sentenceCorrect, sentenceCorrectionStep])

  const handleEndTest = () => {
    router.push(`/student/${sessionId}`)
  }

  const handleRestartTest = () => {
    // Reset all state to initial values
    setPhase('practice-intro')
    setCurrentSymbolIndex(0)
    setCurrentPracticeSymbolIndex(0)
    setPracticeAttempts(0)
    setPracticeFailedItems(0)
    setPracticeShuffledChoices([])
    setShuffledChoices([])
    setSelectedAnswer(null)
    setShowFeedback(false)
    setIsCorrect(false)
    setCorrectionStep(0)
    setSentenceSlots([null, null, null])
    setAvailableSymbols([...ALL_SYMBOLS])
    setDraggedSymbol(null)
    setSentenceSubmitted(false)
    setSentenceCorrect(false)
    setSentenceCorrectionStep(0)
    setStudentAnswer([])
    setCorrectTilesShown(0)
    setAudioPlayCounts({}) // Reset audio play counts
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <audio ref={audioRef} />

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* PRACTICE PHASE: Introduction */}
          {phase === 'practice-intro' && (
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">
                Practice Round ({currentPracticeSymbolIndex + 1} of {PRACTICE_SYMBOLS.length})
              </h2>
              <p className="text-sm mb-8 text-gray-500 italic">
                Click the symbol to hear the sound again
              </p>

              <div className="flex flex-col items-center gap-6">
                <div
                  className="relative w-64 h-64 border-4 border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
                  onClick={playPracticeIntroAudio}
                >
                  <Image
                    src={PRACTICE_SYMBOLS[currentPracticeSymbolIndex].image}
                    alt={`Practice Symbol ${currentPracticeSymbolIndex + 1}`}
                    fill
                    className="object-contain p-4"
                  />
                </div>

                <button
                  onClick={handlePracticeIntroNext}
                  className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors mt-4"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* PRACTICE PHASE: Testing */}
          {phase === 'practice-test' && (
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2 text-gray-700">
                Practice Round ({currentPracticeSymbolIndex + 1} of {PRACTICE_SYMBOLS.length})
              </h2>
              <p className="text-lg mb-6 text-gray-600">
                Which symbol matches this sound?
              </p>

              {/* Answer slot at the top */}
              <div className="mb-8">
                <p className="text-sm text-gray-600 mb-2 text-center">Your answer:</p>
                <div className="flex justify-center">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handlePracticeAnswerSlotDrop}
                    onClick={() => selectedAnswer && !showFeedback && setSelectedAnswer(null)}
                    className={`relative w-48 h-48 border-4 border-dashed rounded-lg ${
                      // Step 0: red for incorrect answer
                      (showFeedback && !isCorrect && correctionStep === 0)
                        ? 'border-red-500 bg-red-50'
                        // Step 3: green for correct answer
                        : (showFeedback && !isCorrect && correctionStep === 3)
                        ? 'border-green-500 bg-green-50'
                        // Steps 1 & 2: empty slot (gray)
                        : (showFeedback && !isCorrect && (correctionStep === 1 || correctionStep === 2))
                        ? 'border-gray-400 bg-gray-50'
                        : selectedAnswer
                        ? showFeedback
                          ? isCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-400 bg-gray-50'
                          : 'border-blue-400 bg-blue-50 cursor-pointer'
                        : 'border-gray-400 bg-gray-50'
                    }`}
                  >
                    {(showFeedback && !isCorrect) ? (
                      /* During incorrect answer correction sequence */
                      correctionStep === 0 ? (
                        /* Step 0: Show incorrect answer */
                        <Image
                          src={selectedAnswer!}
                          alt="Your answer"
                          fill
                          className="object-contain p-4"
                        />
                      ) : correctionStep === 3 ? (
                        /* Step 3: Show correct answer */
                        <Image
                          src={PRACTICE_SYMBOLS[currentPracticeSymbolIndex].image}
                          alt="Correct answer"
                          fill
                          className="object-contain p-4"
                        />
                      ) : (
                        /* Steps 1 & 2: Empty slot */
                        null
                      )
                    ) : selectedAnswer ? (
                      /* Show selected answer (normal state or correct answer) */
                      <Image
                        src={selectedAnswer}
                        alt="Your answer"
                        fill
                        className="object-contain p-4"
                      />
                    ) : null}
                  </div>
                </div>
                {showFeedback && isCorrect && (
                  <div className="flex justify-center mt-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                {showFeedback && !isCorrect && correctionStep === 0 && (
                  <div className="flex justify-center mt-4">
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                )}
                {showFeedback && !isCorrect && correctionStep === 3 && (
                  <div className="flex justify-center mt-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Answer choices */}
              <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
                {practiceShuffledChoices.map((choice, index) => {
                  const isSelectedChoice = selectedAnswer === choice
                  const isCorrectChoice = choice === PRACTICE_SYMBOLS[currentPracticeSymbolIndex].image

                  // Steps 1-3: highlight incorrect answer back in its place (stays highlighted while user is on screen)
                  const highlightIncorrect = isSelectedChoice && showFeedback && !isCorrect && correctionStep >= 1
                  // Step 2: highlight correct answer in green
                  const highlightCorrect = isCorrectChoice && showFeedback && !isCorrect && correctionStep === 2

                  return (
                    <div
                      key={index}
                      draggable={!showFeedback}
                      onDragStart={() => !showFeedback && setDraggedSymbol(choice)}
                      onClick={() => !showFeedback && handlePracticeAnswerSelect(choice)}
                      className={`relative w-full aspect-square border-4 rounded-lg ${
                        highlightCorrect
                          ? 'border-green-500 bg-green-50'
                          : highlightIncorrect
                          ? 'border-red-500 bg-red-50'
                          : !showFeedback
                          ? 'border-gray-300 hover:border-blue-400 cursor-pointer'
                          : 'border-gray-300 opacity-50'
                      }`}
                    >
                      <Image
                        src={choice}
                        alt={`Choice ${index + 1}`}
                        fill
                        className="object-contain p-4"
                      />
                    </div>
                  )
                })}
              </div>

              {/* Next button for practice - show after correction or after 3 attempts */}
              {/* Hide button if this is the 2nd failed item - auto-advance will handle it */}
              {showFeedback && !isCorrect && correctionStep === 3 && !(practiceAttempts >= MAX_PRACTICE_ATTEMPTS && practiceFailedItems >= 1) && (
                <div className="text-center mt-8">
                  {practiceAttempts >= MAX_PRACTICE_ATTEMPTS ? (
                    <button
                      onClick={() => handlePracticeTestNext(true)}
                      className="px-8 py-4 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {currentPracticeSymbolIndex < PRACTICE_SYMBOLS.length - 1 ? 'Next Practice' : 'Continue to Test'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedAnswer(null)
                        setShowFeedback(false)
                        setCorrectionStep(0)
                        setIsCorrect(false)
                        initializePracticeQuestion(currentPracticeSymbolIndex)
                      }}
                      className="px-8 py-4 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PHASE 1: Introduction */}
          {phase === 'intro' && (
            <div className="text-center">
              <p className="text-sm mb-8 text-gray-500 italic">
                Click the symbol to hear the sound again
              </p>

              <div className="flex flex-col items-center gap-6">
                <div
                  className="relative w-64 h-64 border-4 border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
                  onClick={playIntroAudio}
                >
                  <Image
                    src={SYMBOLS[currentSymbolIndex].image}
                    alt={`Symbol ${currentSymbolIndex + 1}`}
                    fill
                    className="object-contain p-4"
                  />
                </div>

                <button
                  onClick={handleIntroNext}
                  className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors mt-4"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* PHASE 2: Testing */}
          {phase === 'test' && (
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-8 text-gray-700">
                Which symbol matches this sound?
              </h2>

              {/* Answer slot at the top */}
              <div className="mb-8">
                <p className="text-sm text-gray-600 mb-2 text-center">Your answer:</p>
                <div className="flex justify-center">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleAnswerSlotDrop}
                    onClick={() => selectedAnswer && !showFeedback && setSelectedAnswer(null)}
                    className={`relative w-48 h-48 border-4 border-dashed rounded-lg ${
                      // Step 0: red for incorrect answer
                      (showFeedback && !isCorrect && correctionStep === 0)
                        ? 'border-red-500 bg-red-50'
                        // Step 3: green for correct answer
                        : (showFeedback && !isCorrect && correctionStep === 3)
                        ? 'border-green-500 bg-green-50'
                        // Steps 1 & 2: empty slot (gray)
                        : (showFeedback && !isCorrect && (correctionStep === 1 || correctionStep === 2))
                        ? 'border-gray-400 bg-gray-50'
                        : selectedAnswer
                        ? showFeedback
                          ? isCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-400 bg-gray-50'
                          : 'border-blue-400 bg-blue-50 cursor-pointer'
                        : 'border-gray-400 bg-gray-50'
                    }`}
                  >
                    {(showFeedback && !isCorrect) ? (
                      /* During incorrect answer correction sequence */
                      correctionStep === 0 ? (
                        /* Step 0: Show incorrect answer */
                        <Image
                          src={selectedAnswer!}
                          alt="Your answer"
                          fill
                          className="object-contain p-4"
                        />
                      ) : correctionStep === 3 ? (
                        /* Step 3: Show correct answer */
                        <Image
                          src={SYMBOLS[currentSymbolIndex].image}
                          alt="Correct answer"
                          fill
                          className="object-contain p-4"
                        />
                      ) : (
                        /* Steps 1 & 2: Empty slot */
                        null
                      )
                    ) : selectedAnswer ? (
                      /* Show selected answer (normal state or correct answer) */
                      <Image
                        src={selectedAnswer}
                        alt="Your answer"
                        fill
                        className="object-contain p-4"
                      />
                    ) : null}
                  </div>
                </div>
                {showFeedback && isCorrect && (
                  <div className="flex justify-center mt-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                {showFeedback && !isCorrect && correctionStep === 0 && (
                  <div className="flex justify-center mt-4">
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                )}
                {showFeedback && !isCorrect && correctionStep === 3 && (
                  <div className="flex justify-center mt-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Answer choices */}
              <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
                {shuffledChoices.map((choice, index) => {
                  const isSelectedChoice = selectedAnswer === choice
                  const isCorrectChoice = choice === SYMBOLS[currentSymbolIndex].image

                  // Steps 1-3: highlight incorrect answer back in its place (stays highlighted while user is on screen)
                  const highlightIncorrect = isSelectedChoice && showFeedback && !isCorrect && correctionStep >= 1
                  // Step 2: highlight correct answer in green
                  const highlightCorrect = isCorrectChoice && showFeedback && !isCorrect && correctionStep === 2

                  return (
                    <div
                      key={index}
                      draggable={!showFeedback}
                      onDragStart={() => !showFeedback && setDraggedSymbol(choice)}
                      onClick={() => !showFeedback && handleAnswerSelect(choice)}
                      className={`relative w-full aspect-square border-4 rounded-lg ${
                        highlightCorrect
                          ? 'border-green-500 bg-green-50'
                          : highlightIncorrect
                          ? 'border-red-500 bg-red-50'
                          : !showFeedback
                          ? 'border-gray-300 hover:border-blue-400 cursor-pointer'
                          : 'border-gray-300 opacity-50'
                      }`}
                    >
                      <Image
                        src={choice}
                        alt={`Choice ${index + 1}`}
                        fill
                        className="object-contain p-4"
                      />
                    </div>
                  )
                })}
              </div>

              {/* Next button for incorrect answers - show after correction */}
              {showFeedback && !isCorrect && correctionStep === 3 && (
                <div className="text-center mt-8">
                  <button
                    onClick={handleTestNext}
                    className="px-8 py-4 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHASE 4: Sentence Building */}
          {phase === 'sentence' && (
            <div className="text-center">
              {/* Sentence slots */}
              <div className="flex justify-center items-start gap-8 mb-12">
                <div>
                  <p className="text-sm text-gray-600 mb-2 text-center">Your answer:</p>
                  <div className="flex justify-center gap-4">
                    {sentenceSlots.map((slot, index) => (
                      <div
                        key={index}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(index)}
                        onClick={() => slot && handleRemoveFromSlot(index)}
                        className="relative w-32 h-32 border-4 rounded-lg transition-colors border-dashed border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      >
                        {slot ? (
                          <Image
                            src={slot}
                            alt={`Slot ${index + 1}`}
                            fill
                            className="object-contain p-2"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-4xl">
                            {index + 1}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Available symbols */}
              <div className="grid grid-cols-6 gap-4 max-w-3xl mx-auto mb-8">
                {availableSymbols.map((symbol, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(symbol)}
                    onClick={() => handleSymbolClick(symbol)}
                    className="relative w-full aspect-square border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    <Image
                      src={symbol}
                      alt={`Symbol ${index + 1}`}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSentenceSubmit}
                disabled={sentenceSlots.some(s => s === null)}
                className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Practice Failed - User failed 2 items */}
          {phase === 'practice-failed' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-700 mb-8">
                Test Ended
              </h2>

              <button
                onClick={handleRestartTest}
                className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors"
              >
                Restart Test
              </button>
            </div>
          )}

          {/* PHASE 5: Complete */}
          {phase === 'complete' && (
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-700 mb-8">
                Test Ended
              </h2>

              <button
                onClick={handleRestartTest}
                className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors"
              >
                Restart Test
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
