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

type Phase = 'intro' | 'test' | 'correction' | 'sentence' | 'sentence-correction' | 'complete'

export default function AssociativeLearningV2() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  // Phase management
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(0) // Track which symbol we're on (0-2)

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

  const audioRef = useRef<HTMLAudioElement>(null)

  // Initialize question choices when entering test phase
  useEffect(() => {
    if (phase === 'test' && shuffledChoices.length === 0) {
      initializeQuestion(currentSymbolIndex)
    }
  }, [phase])

  // Auto-play audio for current question in test phase
  useEffect(() => {
    if (phase === 'test' && !showFeedback) {
      playAudio(SYMBOLS[currentSymbolIndex].sound)
    }
  }, [phase, currentSymbolIndex, showFeedback])

  // Play combined audio for sentence building
  useEffect(() => {
    if (phase === 'sentence' && !sentenceSubmitted) {
      playCombinedAudio()
    }
  }, [phase])

  const playAudio = (soundPath: string) => {
    if (audioRef.current) {
      audioRef.current.src = soundPath
      audioRef.current.play()
    }
  }

  const playCombinedAudio = async () => {
    // Play all three audio files in sequence
    for (let i = 0; i < SYMBOLS.length; i++) {
      await new Promise<void>((resolve) => {
        if (audioRef.current) {
          audioRef.current.src = SYMBOLS[i].sound
          audioRef.current.onended = () => {
            if (audioRef.current) {
              audioRef.current.onended = null // Clear the event handler
            }
            resolve()
          }
          audioRef.current.play()
        } else {
          resolve()
        }
      })
    }
  }

  const initializeQuestion = (symbolIndex: number) => {
    const currentSymbol = SYMBOLS[symbolIndex]
    const choices = [currentSymbol.image, ...DISTRACTORS[currentSymbol.id as keyof typeof DISTRACTORS]]

    // Shuffle choices
    const shuffled = [...choices].sort(() => Math.random() - 0.5)
    setShuffledChoices(shuffled)
    setSelectedAnswer(null)
    setShowFeedback(false)
  }

  // Auto-play audio when entering intro phase
  useEffect(() => {
    if (phase === 'intro') {
      playAudio(SYMBOLS[currentSymbolIndex].sound)
    }
  }, [phase, currentSymbolIndex])

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
  }

  const handleAnswerSlotDrop = () => {
    if (draggedSymbol && !showFeedback) {
      setSelectedAnswer(draggedSymbol)
      setDraggedSymbol(null)
    }
  }

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return

    const currentSymbol = SYMBOLS[currentSymbolIndex]
    const correct = selectedAnswer === currentSymbol.image

    setIsCorrect(correct)
    setShowFeedback(true)

    if (correct) {
      // Play audio for correct answer
      playAudio(currentSymbol.sound)
    } else {
      // Start correction animation on same screen
      setCorrectionStep(0)
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

  // PHASE 3: Correction Animation (shown on test screen)
  useEffect(() => {
    if (showFeedback && !isCorrect) {
      if (correctionStep === 0) {
        // Show incorrect choice for 1 second
        const timer = setTimeout(() => setCorrectionStep(1), 1000)
        return () => clearTimeout(timer)
      } else if (correctionStep === 1) {
        // Move incorrect answer back (800ms animation)
        const timer = setTimeout(() => setCorrectionStep(2), 800)
        return () => clearTimeout(timer)
      } else if (correctionStep === 2) {
        // Move correct answer up (800ms animation)
        const timer = setTimeout(() => {
          setCorrectionStep(3)
          // Play audio when correct answer appears in slot
          playAudio(SYMBOLS[currentSymbolIndex].sound)
        }, 800)
        return () => clearTimeout(timer)
      }
      // correctionStep === 3: show correct answer with button
    }
  }, [showFeedback, isCorrect, correctionStep])

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

    const correct = answer.every((symbol, i) => symbol === CORRECT_SENTENCE[i])
    setSentenceSubmitted(true)
    setSentenceCorrect(correct)

    if (!correct) {
      // Save student's answer and show correction inline
      setStudentAnswer(answer)
      setSentenceCorrectionStep(0)
    } else {
      // Wait a moment to show correct feedback, then play audio
      setTimeout(() => {
        playCombinedAudio()
      }, 300)
    }
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
    setPhase('intro')
    setCurrentSymbolIndex(0)
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <audio ref={audioRef} />

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
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
                    className={`relative w-48 h-48 border-4 border-dashed rounded-lg transition-colors ${
                      // Show correct answer in slot at step 3
                      (showFeedback && !isCorrect && correctionStep === 3)
                        ? 'border-green-500 bg-green-50'
                        : selectedAnswer
                        ? showFeedback
                          ? isCorrect
                            ? 'border-green-500 bg-green-50'
                            : correctionStep === 0
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-400 bg-gray-50'
                          : 'border-blue-400 bg-blue-50 cursor-pointer'
                        : 'border-gray-400 bg-gray-50'
                    }`}
                  >
                    {/* Show incorrect answer moving down during step 1 */}
                    {showFeedback && !isCorrect && correctionStep === 1 && selectedAnswer ? (
                      <div className="animate-move-down">
                        <Image
                          src={selectedAnswer}
                          alt="Your answer"
                          fill
                          className="object-contain p-4"
                        />
                      </div>
                    ) : (showFeedback && !isCorrect && correctionStep === 3) ? (
                      /* Show correct answer at step 3 */
                      <Image
                        src={SYMBOLS[currentSymbolIndex].image}
                        alt="Correct answer"
                        fill
                        className="object-contain p-4"
                      />
                    ) : selectedAnswer && correctionStep !== 1 ? (
                      /* Show selected answer normally */
                      <Image
                        src={selectedAnswer}
                        alt="Your answer"
                        fill
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-lg">
                        Drag or click a symbol
                      </div>
                    )}
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
                  const isSelected = selectedAnswer === choice
                  const isCorrectAnswer = choice === SYMBOLS[currentSymbolIndex].image

                  // Show incorrect answer coming back during step 1
                  const showIncorrectReturning = isSelected && showFeedback && !isCorrect && correctionStep === 1
                  // Show correct answer moving up during step 2
                  const showCorrectMoving = isCorrectAnswer && showFeedback && !isCorrect && correctionStep === 2
                  // Hide tiles at various stages
                  const shouldHide = (isSelected && showFeedback && !isCorrect && correctionStep === 0) ||
                                     (isCorrectAnswer && showFeedback && !isCorrect && (correctionStep === 0 || correctionStep === 1)) ||
                                     (isSelected && showFeedback && !isCorrect && correctionStep >= 2) ||
                                     (isCorrectAnswer && showFeedback && !isCorrect && correctionStep === 3)

                  return (
                    <div
                      key={index}
                      draggable={!showFeedback}
                      onDragStart={() => !showFeedback && setDraggedSymbol(choice)}
                      onClick={() => !showFeedback && handleAnswerSelect(choice)}
                      className={`relative w-full aspect-square border-4 rounded-lg transition-opacity duration-300 ${
                        !showFeedback
                          ? 'border-gray-300 hover:border-blue-400 cursor-pointer'
                          : 'border-gray-300 opacity-50'
                      } ${isSelected && !showFeedback ? 'opacity-50' : ''} ${
                        shouldHide ? 'opacity-0' : ''
                      } ${showCorrectMoving ? 'animate-move-up' : ''}`}
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

              {!showFeedback && selectedAnswer && (
                <button
                  onClick={handleAnswerSubmit}
                  className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors"
                >
                  Next
                </button>
              )}

              {showFeedback && isCorrect && (
                <div className="text-center">
                  <button
                    onClick={handleTestNext}
                    className="px-8 py-4 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

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
              {/* Sentence slots - show student's answer and correction side by side */}
              <div className="flex justify-center items-start gap-8 mb-12">
                {/* Student's answer */}
                <div>
                  <p className="text-sm text-gray-600 mb-2 text-center">Your answer:</p>
                  <div className="flex justify-center gap-4">
                    {sentenceSlots.map((slot, index) => (
                      <div
                        key={index}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => !sentenceSubmitted && handleDrop(index)}
                        onClick={() => !sentenceSubmitted && slot && handleRemoveFromSlot(index)}
                        className={`relative w-32 h-32 border-4 rounded-lg transition-colors ${
                          sentenceSubmitted
                            ? sentenceCorrect
                              ? 'border-green-500 bg-green-50'
                              : 'border-red-500 bg-red-50'
                            : 'border-dashed border-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer'
                        }`}
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
                  {sentenceSubmitted && !sentenceCorrect && (
                    <div className="flex justify-center mt-4">
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </div>
                  )}
                  {sentenceSubmitted && sentenceCorrect && (
                    <div className="flex justify-center mt-4">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Correct answer - animate in tiles one by one if incorrect */}
                {sentenceSubmitted && !sentenceCorrect && sentenceCorrectionStep >= 1 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2 text-center">Correct answer:</p>
                    <div className="flex justify-center gap-4">
                      {CORRECT_SENTENCE.map((symbol, index) => (
                        <div
                          key={index}
                          className={`relative w-32 h-32 border-4 rounded-lg transition-all duration-300 ${
                            index < correctTilesShown
                              ? 'border-green-500 bg-green-50 opacity-100 scale-100'
                              : 'border-gray-300 bg-gray-50 opacity-30 scale-90'
                          }`}
                        >
                          {index < correctTilesShown ? (
                            <Image
                              src={symbol}
                              alt={`Correct ${index + 1}`}
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
                    {sentenceCorrectionStep === 4 && (
                      <div className="flex justify-center mt-4">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

              {!sentenceSubmitted && (
                <button
                  onClick={handleSentenceSubmit}
                  disabled={sentenceSlots.some(s => s === null)}
                  className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}

              {/* Show restart/end buttons after sentence correction or correct answer */}
              {sentenceSubmitted && sentenceCorrect && (
                <div className="flex gap-4 justify-center mt-4">
                  <button
                    onClick={handleRestartTest}
                    className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Restart Test
                  </button>
                  <button
                    onClick={handleEndTest}
                    className="px-8 py-4 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    End Test
                  </button>
                </div>
              )}

              {sentenceSubmitted && !sentenceCorrect && sentenceCorrectionStep === 4 && (
                <div className="flex gap-4 justify-center mt-4">
                  <button
                    onClick={handleRestartTest}
                    className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Restart Test
                  </button>
                  <button
                    onClick={handleEndTest}
                    className="px-8 py-4 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    End Test
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PHASE 5: Complete */}
          {phase === 'complete' && (
            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-green-600 mb-4">
                  Test Complete!
                </h2>
                <p className="text-xl text-gray-700 mb-8">
                  Great job! You answered all questions correctly.
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleRestartTest}
                  className="px-8 py-4 bg-green-500 text-white text-lg rounded-lg hover:bg-green-600 transition-colors"
                >
                  Restart Test
                </button>
                <button
                  onClick={handleEndTest}
                  className="px-8 py-4 bg-blue-500 text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
                >
                  End Test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
