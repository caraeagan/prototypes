"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Test data: symbols and their associated sounds
const SYMBOLS = [
  {
    id: 1,
    image: "/images/associative-learning/symbol1.png",
    sound: "/audio/associative-learning/sound1.mp3",
    distractors: [
      "/images/associative-learning/symbol2.png",
      "/images/associative-learning/symbol3.png",
      "/images/associative-learning/symbol5.png"
    ]
  },
  {
    id: 2,
    image: "/images/associative-learning/symbol2.png",
    sound: "/audio/associative-learning/sound2.mp3",
    distractors: [
      "/images/associative-learning/symbol1.png",
      "/images/associative-learning/symbol4.png",
      "/images/associative-learning/symbol6.png"
    ]
  },
  {
    id: 3,
    image: "/images/associative-learning/symbol3.png",
    sound: "/audio/associative-learning/sound3.mp3",
    distractors: [
      "/images/associative-learning/symbol1.png",
      "/images/associative-learning/symbol2.png",
      "/images/associative-learning/symbol5.png"
    ]
  }
]

export default function AssociativeLearning() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const audioRef = useRef<HTMLAudioElement>(null)

  // Track which symbols have been learned
  const [learnedSymbols, setLearnedSymbols] = useState<number[]>([])

  // Current symbol index being learned
  const [currentSymbolIndex, setCurrentSymbolIndex] = useState(0)

  // Current phase: 'learn', 'test', or 'sentence'
  const skipTo = searchParams.get('skipTo')
  const [phase, setPhase] = useState<'learn' | 'test' | 'sentence'>(
    skipTo === 'sentence' ? 'sentence' : 'learn'
  )

  // Current test question index (which learned symbol to test)
  const [testQuestionIndex, setTestQuestionIndex] = useState(0)

  // Track selected answer
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  // Show feedback
  const [showFeedback, setShowFeedback] = useState(false)

  // Store shuffled choices to prevent re-shuffling on each render
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([])

  // Sentence building state
  const [sentenceSlots, setSentenceSlots] = useState<(string | null)[]>([null, null, null])
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([])
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationStep, setAnimationStep] = useState(0)
  const correctSentence = [
    "/images/associative-learning/symbol1.png", // "the"
    "/images/associative-learning/symbol3.png", // "dog"
    "/images/associative-learning/symbol2.png"  // "jumps"
  ]

  const currentSymbol = SYMBOLS[currentSymbolIndex]
  const symbolsToTest = learnedSymbols.map(id => SYMBOLS.find(s => s.id === id)!)

  // Shuffle choices when test phase starts or question changes
  useEffect(() => {
    if (phase === 'test' && symbolsToTest.length > 0) {
      const testSymbol = symbolsToTest[testQuestionIndex]
      if (testSymbol) {
        const choices = [testSymbol.image, ...testSymbol.distractors]
        const shuffled = [...choices].sort(() => Math.random() - 0.5)
        setShuffledChoices(shuffled)
      }
    } else if (phase === 'sentence') {
      // Set up available symbols for sentence building (all 6 symbols)
      const allSymbols = [
        "/images/associative-learning/symbol1.png",
        "/images/associative-learning/symbol2.png",
        "/images/associative-learning/symbol3.png",
        "/images/associative-learning/symbol4.png",
        "/images/associative-learning/symbol5.png",
        "/images/associative-learning/symbol6.png"
      ]
      const shuffled = [...allSymbols].sort(() => Math.random() - 0.5)
      setAvailableSymbols(shuffled)
    }
  }, [phase, testQuestionIndex, learnedSymbols.length])

  const playSound = (soundPath: string) => {
    if (audioRef.current) {
      audioRef.current.src = soundPath
      audioRef.current.play()
    }
  }

  const handleLearnNext = () => {
    // Add current symbol to learned list
    const newLearned = [...learnedSymbols, currentSymbol.id]
    setLearnedSymbols(newLearned)

    // Move to testing phase
    setPhase('test')
    setTestQuestionIndex(0)
  }

  const handleAnswerSelect = (image: string) => {
    setSelectedAnswer(image)
  }

  const handleSubmitAnswer = () => {
    setShowFeedback(true)
  }

  const handleNextQuestion = () => {
    // Check if there are more questions to test
    if (testQuestionIndex < symbolsToTest.length - 1) {
      // Move to next test question
      setTestQuestionIndex(testQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
    } else {
      // All questions answered for this round
      // Check if there are more symbols to learn
      if (learnedSymbols.length < SYMBOLS.length) {
        // Move to next learning phase
        setCurrentSymbolIndex(learnedSymbols.length)
        setPhase('learn')
        setTestQuestionIndex(0)
        setSelectedAnswer(null)
        setShowFeedback(false)
      } else {
        // All symbols learned and tested - move to sentence building
        setPhase('sentence')
        setSelectedAnswer(null)
        setShowFeedback(false)
      }
    }
  }

  const handleSymbolClick = (symbolPath: string) => {
    // Find first empty slot
    const emptySlotIndex = sentenceSlots.findIndex(slot => slot === null)
    if (emptySlotIndex !== -1) {
      const newSlots = [...sentenceSlots]
      newSlots[emptySlotIndex] = symbolPath
      setSentenceSlots(newSlots)

      // Remove from available symbols
      setAvailableSymbols(availableSymbols.filter(s => s !== symbolPath))
    }
  }

  const handleSlotClick = (slotIndex: number) => {
    const symbolInSlot = sentenceSlots[slotIndex]
    if (symbolInSlot) {
      // Remove from slot
      const newSlots = [...sentenceSlots]
      newSlots[slotIndex] = null
      setSentenceSlots(newSlots)

      // Add back to available symbols
      setAvailableSymbols([...availableSymbols, symbolInSlot])
    }
  }

  const handleSubmitSentence = () => {
    const isCorrect = sentenceSlots.every((slot, index) => slot === correctSentence[index])

    if (isCorrect) {
      setShowFeedback(true)
      // Redirect after showing success feedback
      setTimeout(() => {
        router.push(`/student/${sessionId}`)
      }, 1500)
    } else {
      // Show feedback and start animation sequence immediately
      setShowFeedback(true)
      setShowAnimation(true)
      setAnimationStep(1)

      // Step 1: Hide audio icon (immediate)
      // Step 2: Move student answer to top (after 500ms)
      setTimeout(() => setAnimationStep(2), 500)

      // Step 3: Show all symbols at bottom again (after 1000ms)
      setTimeout(() => {
        setAnimationStep(3)
        setAvailableSymbols([
          "/images/associative-learning/symbol1.png",
          "/images/associative-learning/symbol2.png",
          "/images/associative-learning/symbol3.png",
          "/images/associative-learning/symbol4.png",
          "/images/associative-learning/symbol5.png",
          "/images/associative-learning/symbol6.png"
        ].sort(() => Math.random() - 0.5))
      }, 1000)

      // Step 4-6: Animate correct symbols one by one
      setTimeout(() => setAnimationStep(4), 2000) // Highlight first
      setTimeout(() => setAnimationStep(5), 3000) // Highlight second
      setTimeout(() => setAnimationStep(6), 4000) // Highlight third

      // Step 7: Show "Try Again" button
      setTimeout(() => setAnimationStep(7), 5000)
    }
  }

  const handleTryAgain = () => {
    // Reset everything
    setAvailableSymbols([
      "/images/associative-learning/symbol1.png",
      "/images/associative-learning/symbol2.png",
      "/images/associative-learning/symbol3.png",
      "/images/associative-learning/symbol4.png",
      "/images/associative-learning/symbol5.png",
      "/images/associative-learning/symbol6.png"
    ].sort(() => Math.random() - 0.5))
    setSentenceSlots([null, null, null])
    setShowFeedback(false)
    setShowAnimation(false)
    setAnimationStep(0)
  }

  // Initial sound play for learning phase
  const handlePlayLearningSound = () => {
    playSound(currentSymbol.sound)
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <audio ref={audioRef} />

      <main className="w-full max-w-7xl">
        <div className="bg-white rounded-lg shadow-lg p-8">

          {phase === 'learn' && (
            <div>
              <div className="text-center">
                <p className="text-gray-600 mb-8 text-lg">
                  Tap the symbol to hear its sound
                </p>

                <button
                  onClick={handlePlayLearningSound}
                  className="mb-8 hover:scale-105 transition-transform cursor-pointer inline-block"
                >
                  <Image
                    src={currentSymbol.image}
                    alt="Symbol to learn"
                    width={300}
                    height={300}
                    className="rounded-lg"
                  />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleLearnNext}
                  className="px-8 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 text-lg"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {phase === 'test' && (
            <div>
              <div className="flex justify-center mb-8">
                <button
                  onClick={() => playSound(symbolsToTest[testQuestionIndex].sound)}
                  className="hover:scale-105 transition-transform cursor-pointer bg-green-100 rounded-full p-6"
                >
                  <svg className="w-24 h-24 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-8">
                {shuffledChoices.map((imagePath, index) => {
                  const isSelected = selectedAnswer === imagePath
                  const isCorrect = imagePath === symbolsToTest[testQuestionIndex].image
                  const showCorrect = showFeedback && isCorrect
                  const showWrong = showFeedback && isSelected && !isCorrect

                  return (
                    <button
                      key={index}
                      onClick={() => !showFeedback && handleAnswerSelect(imagePath)}
                      disabled={showFeedback}
                      className={`
                        p-3 border-4 rounded-lg transition-all flex items-center justify-center
                        ${showCorrect
                          ? 'border-green-500 bg-green-50'
                          : showWrong
                          ? 'border-red-500 bg-red-50'
                          : isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }
                        ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <Image
                        src={imagePath}
                        alt="Choice"
                        width={180}
                        height={180}
                        className="rounded-lg"
                      />
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-center mt-6">
                {selectedAnswer && !showFeedback && (
                  <button
                    onClick={handleSubmitAnswer}
                    className="px-8 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 text-lg"
                  >
                    Submit Answer
                  </button>
                )}
                {showFeedback && (
                  <button
                    onClick={handleNextQuestion}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-lg"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          )}

          {phase === 'sentence' && (
            <div className="-mt-16">
              {/* Audio icon - slides up when animation starts */}
              <div className={`flex justify-center mb-8 transition-all duration-500 ${
                showAnimation && animationStep >= 1 ? '-translate-y-[200%] opacity-0' : 'translate-y-0 opacity-100'
              }`}>
                <button
                  onClick={() => playSound("/audio/associative-learning/sentence1.mp3")}
                  className="hover:scale-105 transition-transform cursor-pointer bg-green-100 rounded-full p-6"
                  disabled={showAnimation}
                >
                  <svg className="w-24 h-24 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </div>

              {/* Student's answer - slides up to top */}
              <div className={`flex justify-center gap-4 transition-all duration-700 ${
                showAnimation && animationStep >= 2 ? 'mb-3' : 'mb-12'
              }`}>
                {sentenceSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => !showAnimation && handleSlotClick(index)}
                    disabled={showAnimation}
                    className={`w-40 h-40 border-4 rounded-lg flex items-center justify-center transition-all ${
                      showFeedback
                        ? slot === correctSentence[index]
                          ? 'border-green-500 bg-green-50'
                          : 'border-red-500 bg-red-50'
                        : slot
                        ? 'border-blue-500 bg-blue-50 cursor-pointer hover:border-blue-600'
                        : 'border-dashed border-gray-400 bg-gray-50'
                    }`}
                  >
                    {slot && (
                      <Image
                        src={slot}
                        alt="Selected symbol"
                        width={120}
                        height={120}
                        className="rounded-lg"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Correct answer slots - appear during animation */}
              {showAnimation && animationStep >= 3 && (
                <div className="flex justify-center gap-4 mb-3 animate-fade-in">
                  {correctSentence.map((correctSymbol, index) => (
                    <div
                      key={index}
                      className="w-40 h-40 border-4 border-green-500 bg-green-50 rounded-lg flex items-center justify-center"
                    >
                      {animationStep >= 4 + index && (
                        <Image
                          src={correctSymbol}
                          alt="Correct symbol"
                          width={120}
                          height={120}
                          className="rounded-lg animate-slide-up"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Available symbols */}
              {animationStep >= 3 && (
                <div className="grid grid-cols-6 gap-3 mb-3 animate-fade-in">
                  {availableSymbols.map((symbolPath, index) => {
                    const isCorrectSymbol = correctSentence.includes(symbolPath)
                    const correctIndex = correctSentence.indexOf(symbolPath)
                    const shouldHighlight = isCorrectSymbol && animationStep >= 4 + correctIndex && animationStep < 4 + correctIndex + 1

                    return (
                      <button
                        key={index}
                        className={`p-2 border-4 rounded-lg transition-all flex items-center justify-center ${
                          shouldHighlight
                            ? 'border-yellow-500 bg-yellow-100 scale-110'
                            : 'border-gray-300 opacity-50'
                        }`}
                        disabled
                      >
                        <Image
                          src={symbolPath}
                          alt="Symbol"
                          width={100}
                          height={100}
                          className="rounded-lg"
                        />
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Available symbols - normal state */}
              {!showAnimation && (
                <div className="grid grid-cols-6 gap-3 mb-8">
                  {availableSymbols.map((symbolPath, index) => (
                    <button
                      key={index}
                      onClick={() => !showFeedback && handleSymbolClick(symbolPath)}
                      disabled={showFeedback}
                      className={`p-2 border-4 rounded-lg transition-all flex items-center justify-center ${
                        showFeedback
                          ? 'border-gray-300 cursor-not-allowed opacity-50'
                          : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      }`}
                    >
                      <Image
                        src={symbolPath}
                        alt="Symbol"
                        width={100}
                        height={100}
                        className="rounded-lg"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-center mt-6">
                {sentenceSlots.every(slot => slot !== null) && !showFeedback && (
                  <button
                    onClick={handleSubmitSentence}
                    className="px-8 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 text-lg"
                  >
                    Submit Answer
                  </button>
                )}
                {showAnimation && animationStep >= 7 && (
                  <button
                    onClick={handleTryAgain}
                    className="px-8 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 text-lg animate-fade-in"
                  >
                    Try Again
                  </button>
                )}
              </div>

              <style jsx>{`
                @keyframes fade-in {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                @keyframes slide-up {
                  from {
                    opacity: 0;
                    transform: translateY(100px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                .animate-fade-in {
                  animation: fade-in 0.5s ease-in;
                }
                .animate-slide-up {
                  animation: slide-up 0.5s ease-out;
                }
              `}</style>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
