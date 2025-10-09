"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  age: string
  languageType: 'multilingual' | 'monolingual'
  sessionId?: string
}

// Mock data for nonsense words
const NONSENSE_WORDS = [
  {
    id: 1,
    word: "gortroof",
    pronunciation: "GORT-roof",
    audioUrl: null, // Placeholder for future audio
    flagged: false // Will be loaded from localStorage
  },
  {
    id: 2,
    word: "bipmank",
    pronunciation: "BIP-mank",
    audioUrl: null,
    flagged: false
  },
  {
    id: 3,
    word: "jek",
    pronunciation: "JEK",
    audioUrl: null,
    flagged: true // Example: pre-flagged word
  },
  {
    id: 4,
    word: "rinpag",
    pronunciation: "RIN-pag",
    audioUrl: null,
    flagged: false
  },
  {
    id: 5,
    word: "wog",
    pronunciation: "WOG",
    audioUrl: null,
    flagged: false
  },
  {
    id: 6,
    word: "zumrep",
    pronunciation: "ZUM-rep",
    audioUrl: null,
    flagged: true // Example: pre-flagged word
  },
  {
    id: 7,
    word: "dace",
    pronunciation: "DAYSS",
    audioUrl: null,
    flagged: false
  },
  {
    id: 8,
    word: "mege",
    pronunciation: "MEEJ",
    audioUrl: null,
    flagged: false
  },
  {
    id: 9,
    word: "hix",
    pronunciation: "HIKS",
    audioUrl: null,
    flagged: false
  }
]

export default function ScoreReview() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [student, setStudent] = useState<Student | null>(null)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [scores, setScores] = useState<{[key: number]: 'correct' | 'incorrect' | null}>({})
  const [studentAudioPlaying, setStudentAudioPlaying] = useState(false)
  const [correctAudioPlaying, setCorrectAudioPlaying] = useState(false)
  const [studentAudioProgress, setStudentAudioProgress] = useState(0)
  const [correctAudioProgress, setCorrectAudioProgress] = useState(0)
  const [filter, setFilter] = useState<'all' | 'flagged' | 'not-flagged'>('all')
  const [flaggedWords, setFlaggedWords] = useState<Set<number>>(new Set([3, 6])) // Example: words 3 and 6 are flagged
  const [previousScores, setPreviousScores] = useState<{[key: number]: 'correct' | 'incorrect' | null}>({
    1: 'correct',
    2: 'incorrect',
    4: 'correct',
    5: 'incorrect',
    7: 'correct'
  }) // Example previous scores

  useEffect(() => {
    // Find student by session ID
    const savedStudents = localStorage.getItem('students')
    if (savedStudents) {
      const students = JSON.parse(savedStudents)
      const foundStudent = students.find((s: Student) => s.sessionId === sessionId)
      if (foundStudent) {
        setStudent(foundStudent)
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }, [sessionId, router])

  const handleScore = (wordId: number, score: 'correct' | 'incorrect') => {
    setScores(prev => ({
      ...prev,
      [wordId]: score
    }))
  }

  const playStudentAudio = () => {
    setStudentAudioPlaying(true)
    setStudentAudioProgress(0)

    // Simulate audio playback (3 second duration)
    const duration = 3000
    const interval = 50
    let elapsed = 0

    const progressInterval = setInterval(() => {
      elapsed += interval
      const progress = (elapsed / duration) * 100
      setStudentAudioProgress(progress)

      if (elapsed >= duration) {
        clearInterval(progressInterval)
        setStudentAudioPlaying(false)
        setStudentAudioProgress(0)
      }
    }, interval)
  }

  const playCorrectAudio = () => {
    setCorrectAudioPlaying(true)
    setCorrectAudioProgress(0)

    // Simulate audio playback (3 second duration)
    const duration = 3000
    const interval = 50
    let elapsed = 0

    const progressInterval = setInterval(() => {
      elapsed += interval
      const progress = (elapsed / duration) * 100
      setCorrectAudioProgress(progress)

      if (elapsed >= duration) {
        clearInterval(progressInterval)
        setCorrectAudioPlaying(false)
        setCorrectAudioProgress(0)
      }
    }, interval)
  }

  // Filter words based on selected filter
  const getFilteredWords = () => {
    return NONSENSE_WORDS.filter(word => {
      if (filter === 'flagged') return flaggedWords.has(word.id)
      if (filter === 'not-flagged') return !flaggedWords.has(word.id)
      return true // 'all'
    })
  }

  const filteredWords = getFilteredWords()
  const currentWord = filteredWords[currentWordIndex]

  const toggleFlag = (wordId: number) => {
    setFlaggedWords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(wordId)) {
        newSet.delete(wordId)
      } else {
        newSet.add(wordId)
      }
      return newSet
    })
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/profile/${student.id}`)}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Profile
              </button>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Score Review</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 h-[calc(100vh-4rem)]">
        <div className="flex gap-4 h-full">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-3 h-full flex flex-col">
              <h3 className="text-xs font-semibold text-gray-900 mb-2">All Words</h3>
              <div className="space-y-0.5 flex-1 overflow-y-auto">
                {NONSENSE_WORDS.map((word, index) => {
                  const isScored = scores[word.id] !== undefined && scores[word.id] !== null
                  const isFlagged = flaggedWords.has(word.id)
                  const isCurrentWord = filteredWords[currentWordIndex]?.id === word.id
                  const currentScore = scores[word.id]
                  const previousScore = previousScores[word.id]

                  // Determine what color to show
                  let scoreColor = 'border-gray-300' // default: not scored
                  if (isScored) {
                    // Use current score if available
                    scoreColor = currentScore === 'correct' ? 'bg-green-500' : 'bg-red-500'
                  } else if (previousScore) {
                    // Use previous score if no current score
                    scoreColor = previousScore === 'correct' ? 'bg-green-500' : 'bg-red-500'
                  } else if (isFlagged) {
                    // Flagged but no score
                    scoreColor = 'bg-gray-400'
                  }

                  return (
                    <button
                      key={word.id}
                      onClick={() => {
                        setFilter('all')
                        const allWordsIndex = NONSENSE_WORDS.findIndex(w => w.id === word.id)
                        setCurrentWordIndex(allWordsIndex)
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg transition-all flex items-center justify-between ${
                        isCurrentWord
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          isCurrentWord ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          {word.word}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        {/* Flag indicator */}
                        {isFlagged && (
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
                          </svg>
                        )}

                        {/* Score indicator */}
                        {isScored || previousScore || isFlagged ? (
                          <div className={`w-3 h-3 rounded-full ${scoreColor}`} />
                        ) : (
                          <div className={`w-3 h-3 rounded-full border-2 ${scoreColor}`} />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1 flex-shrink-0">
                <div className="text-xs text-gray-600 font-semibold mb-1">Legend:</div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Correct</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Incorrect</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span>Not scored</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                  <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
                  </svg>
                  <span>Flagged</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col h-full">
        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setFilter('all')
                    setCurrentWordIndex(0)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-900 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All Words ({NONSENSE_WORDS.length})
                </button>
                <button
                  onClick={() => {
                    setFilter('flagged')
                    setCurrentWordIndex(0)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'flagged'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Flagged Only ({flaggedWords.size})
                </button>
                <button
                  onClick={() => {
                    setFilter('not-flagged')
                    setCurrentWordIndex(0)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'not-flagged'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Not Flagged ({NONSENSE_WORDS.length - flaggedWords.size})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Word Review Card */}
        <div className="bg-white rounded-lg shadow p-6 flex-1 flex flex-col justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-2">
              <div className="text-sm text-gray-500">
                Word {currentWordIndex + 1} of {filteredWords.length}
              </div>
              {/* Flag Button */}
              <button
                onClick={() => toggleFlag(currentWord.id)}
                className={`p-2 rounded-lg transition-colors ${
                  flaggedWords.has(currentWord.id)
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={flaggedWords.has(currentWord.id) ? 'Unflag word' : 'Flag word'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" />
                </svg>
              </button>
            </div>
            <div className="mb-6">
              <h3 className="text-4xl font-bold text-gray-900 inline-block">
                {currentWord.word}
              </h3>
              <span className="text-sm text-gray-400 ml-3 align-middle">
                {currentWord.pronunciation}
              </span>
            </div>

            {/* Audio Players */}
            <div className="mb-6 space-y-4">
              <div className="flex justify-center space-x-4">
                {/* Student Response Audio */}
                <div className="flex flex-col items-center space-y-2">
                  <button
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
                    onClick={playStudentAudio}
                    disabled={studentAudioPlaying}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base font-medium">Student Response</span>
                  </button>

                  {/* Student Audio Progress Bar */}
                  {studentAudioPlaying && (
                    <div className="w-64 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-900 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${studentAudioProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Correct Response Audio */}
                <div className="flex flex-col items-center space-y-2">
                  <button
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    onClick={playCorrectAudio}
                    disabled={correctAudioPlaying}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-base font-medium">Correct Response</span>
                  </button>

                  {/* Correct Audio Progress Bar */}
                  {correctAudioPlaying && (
                    <div className="w-64 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-100"
                        style={{ width: `${correctAudioProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-sm text-gray-500">
                Listen to both pronunciations to compare
              </p>
            </div>

            {/* Previous Score Indicator */}
            {previousScores[currentWord.id] && (
              <div className="mb-4">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  previousScores[currentWord.id] === 'correct'
                    ? 'bg-green-50 text-green-700 border border-green-300'
                    : 'bg-red-50 text-red-700 border border-red-300'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">
                    Originally scored as {previousScores[currentWord.id] === 'correct' ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              </div>
            )}

            {flaggedWords.has(currentWord.id) && !previousScores[currentWord.id] && (
              <div className="mb-4">
                <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">
                    Originally flagged as uncertain
                  </span>
                </div>
              </div>
            )}

            {/* Scoring Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => handleScore(currentWord.id, 'incorrect')}
                className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                  scores[currentWord.id] === 'incorrect'
                    ? 'bg-red-600 text-white ring-4 ring-red-300'
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                ✗ Incorrect
              </button>
              <button
                onClick={() => handleScore(currentWord.id, 'correct')}
                className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
                  scores[currentWord.id] === 'correct'
                    ? 'bg-green-600 text-white ring-4 ring-green-300'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                ✓ Correct
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={() => setCurrentWordIndex(Math.max(0, currentWordIndex - 1))}
              disabled={currentWordIndex === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-sm text-gray-600">
              {Object.values(scores).filter(s => s !== null).length} / {NONSENSE_WORDS.length} scored
              {filter !== 'all' && ` • Viewing ${filteredWords.length} ${filter === 'flagged' ? 'flagged' : 'not flagged'} words`}
            </div>

            {currentWordIndex === filteredWords.length - 1 ? (
              <button
                onClick={() => {
                  // Save scores and return to score review home
                  localStorage.setItem(`nwd_scores_${sessionId}`, JSON.stringify(scores))
                  router.push(`/score-review/${sessionId}`)
                }}
                className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 font-semibold"
              >
                {filter === 'all' && Object.values(scores).filter(s => s !== null).length === NONSENSE_WORDS.length ? 'Complete Scoring' : 'Save & Return'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentWordIndex(Math.min(filteredWords.length - 1, currentWordIndex + 1))}
                disabled={currentWordIndex === filteredWords.length - 1}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
          </div>
        </div>
      </main>
    </div>
  )
}
