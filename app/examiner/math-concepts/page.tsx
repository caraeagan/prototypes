"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

const QUESTIONS = [
  {
    id: 1,
    question: "The temperature outside rises from 60 °F at 8 AM to 80 °F at 12 PM. What is the average rate of change in degrees per hour?",
    correctAnswer: "5",
    type: "numeric"
  },
  {
    id: 2,
    question: "A rectangular garden has a length of 15 feet and a width of 8 feet. What is the area of the garden in square feet?",
    correctAnswer: "120",
    type: "numeric"
  },
  {
    id: 3,
    question: "Sarah has $45. She buys 3 books that cost $12 each. How much money does she have left?",
    correctAnswer: "9",
    type: "numeric"
  }
]

function ExaminerMathConceptsContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [testState, setTestState] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [scores, setScores] = useState<{[key: number]: {score: number, isCorrect: boolean}}>({})
  const [totalScore, setTotalScore] = useState(0)

  useEffect(() => {
    // If session ID is provided, directly select that student
    if (sessionId) {
      const studentData = localStorage.getItem(`student_${sessionId}`)
      if (studentData) {
        const student = JSON.parse(studentData)
        setSelectedStudent({ ...student, sessionId })
        setCurrentQuestion(0)
        setScores({})
        setTotalScore(0)
      }
    } else {
      // Get all students from localStorage for selection
      const allStudents = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('student_')) {
          try {
            const student = JSON.parse(localStorage.getItem(key) || '{}')
            const studentSessionId = key.replace('student_', '')
            allStudents.push({ ...student, sessionId: studentSessionId })
          } catch (e) {
            console.error('Error parsing student data:', e)
          }
        }
      }
      setStudents(allStudents)
    }
  }, [sessionId])

  useEffect(() => {
    if (selectedStudent) {
      // Poll for test state updates
      const interval = setInterval(() => {
        const testStateData = localStorage.getItem(`mathConceptsTestState_${selectedStudent.sessionId}`)
        if (testStateData) {
          try {
            const parsedState = JSON.parse(testStateData)
            setTestState(parsedState)
            if (parsedState.currentQuestion !== undefined) {
              setCurrentQuestion(parsedState.currentQuestion)
            }
          } catch (e) {
            console.error('Error parsing test state:', e)
          }
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [selectedStudent])

  useEffect(() => {
    // Calculate total score whenever scores change
    const total = Object.values(scores).reduce((sum, scoreData) => sum + scoreData.score, 0)
    setTotalScore(total)
  }, [scores])

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student)
    setCurrentQuestion(0)
    setScores({})
    setTotalScore(0)
  }

  const handleScore = (questionIndex: number, score: number, isCorrect: boolean) => {
    const newScores = { ...scores }
    newScores[questionIndex] = { score, isCorrect }
    setScores(newScores)
  }

  const navigateQuestion = (direction: 'next' | 'prev') => {
    if (!selectedStudent) return
    
    let newQuestionIndex
    if (direction === 'next' && currentQuestion < QUESTIONS.length - 1) {
      newQuestionIndex = currentQuestion + 1
    } else if (direction === 'prev' && currentQuestion > 0) {
      newQuestionIndex = currentQuestion - 1
    } else {
      return
    }
    
    setCurrentQuestion(newQuestionIndex)
    
    // Update the student's test state
    const currentTestState = {
      currentQuestion: newQuestionIndex,
      answers: testState?.answers || {},
      studentName: selectedStudent.firstName || 'Student',
      testType: 'math-concepts'
    }
    localStorage.setItem(`mathConceptsTestState_${selectedStudent.sessionId}`, JSON.stringify(currentTestState))
  }

  if (!selectedStudent) {
    return (
      <div className="min-h-screen bg-blue-50">
        <header className="bg-blue-900 text-white p-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold">Marker Method - Math Concepts Test</h1>
          </div>
        </header>

        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-stone-100 rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Select a Student</h2>
            
            <div className="grid gap-4">
              {students.length === 0 ? (
                <p className="text-gray-600">No students found. Students need to be added first.</p>
              ) : (
                students.map((student) => (
                  <button
                    key={student.sessionId}
                    onClick={() => handleStudentSelect(student)}
                    className="w-full p-4 bg-white rounded-lg border border-gray-300 hover:border-blue-900 hover:bg-blue-50 text-left transition-colors"
                  >
                    <div className="font-semibold text-gray-900">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Session ID: {student.sessionId}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  const currentQuestionData = QUESTIONS[currentQuestion]
  const studentAnswer = testState?.answers?.[currentQuestion]?.answer || ""

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-blue-900 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Marker Method - Math Concepts Test</h1>
          <button
            onClick={() => setSelectedStudent(null)}
            className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Students
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedStudent.firstName} {selectedStudent.lastName}
            </h2>
            <p className="text-gray-600">Question {currentQuestion + 1} of {QUESTIONS.length}</p>
          </div>

          {/* Student View Box */}
          <div className="mb-8">
            <div className="border-2 border-blue-500 rounded-lg p-1 bg-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-2 px-2">STUDENT VIEW</div>
              <div className="bg-white rounded p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  {/* Question Section */}
                  <div className="space-y-6">
                    <h3 className="text-3xl font-bold text-gray-900 leading-relaxed">
                      {currentQuestionData.question}
                    </h3>
                  </div>

                  {/* Calculator Section */}
                  <div className="flex justify-center">
                    <div className="space-y-4">
                      {/* Answer Output Box */}
                      <div className="bg-white rounded-lg p-4 border border-gray-300 w-96">
                        <div className="text-center font-lexend text-black min-h-[60px] flex items-center justify-center">
                          <div className="text-4xl font-semibold break-all overflow-hidden" style={{
                            fontSize: (studentAnswer || "0").length > 15 ? '1.5rem' : (studentAnswer || "0").length > 10 ? '2rem' : '2.5rem'
                          }}>
                            {studentAnswer || "0"}
                          </div>
                        </div>
                      </div>
                      
                      {/* Calculator */}
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 w-96">

                        {/* Button Grid */}
                        <div className="grid grid-cols-5 gap-3">
                          {/* Row 1 - Clear and Functions */}
                          <div className="bg-orange-400 text-white py-2 rounded-lg font-semibold text-sm text-center">
                            C
                          </div>
                          <div className="bg-orange-400 text-white py-2 rounded-lg font-semibold text-sm text-center">
                            ⌫
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-xs text-center">
                            √
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-xs text-center">
                            x²
                          </div>
                          <div className="bg-orange-400 text-white py-2 rounded-lg font-semibold text-lg text-center">
                            ÷
                          </div>

                          {/* Row 2 - Trig Functions */}
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-xs text-center">
                            sin
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-xs text-center">
                            cos
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-xs text-center">
                            tan
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-xs text-center">
                            log
                          </div>
                          <div className="bg-orange-400 text-white py-2 rounded-lg font-semibold text-lg text-center">
                            ×
                          </div>

                          {/* Row 3 - Numbers 7-9 */}
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            7
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            8
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            9
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-xs text-center">
                            ln
                          </div>
                          <div className="bg-orange-400 text-white py-2 rounded-lg font-semibold text-lg text-center">
                            -
                          </div>

                          {/* Row 4 - Numbers 4-6 */}
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            4
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            5
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            6
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-sm text-center">
                            π
                          </div>
                          <div className="bg-orange-400 text-white py-2 rounded-lg font-semibold text-lg text-center">
                            +
                          </div>

                          {/* Row 5 - Numbers 1-3 */}
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            1
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            2
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            3
                          </div>
                          <div className="bg-purple-400 text-white py-2 rounded-lg font-semibold text-sm text-center">
                            e
                          </div>
                          <div className="bg-blue-500 text-white py-2 rounded-lg font-semibold text-lg text-center">
                            =
                          </div>

                          {/* Row 6 - 0 and special */}
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            (
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            0
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            )
                          </div>
                          <div className="bg-gray-200 text-black py-2 rounded-lg font-semibold text-lg text-center">
                            .
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Examiner Navigation */}
          <div className="mb-6 flex justify-between items-center">
            <button
              onClick={() => navigateQuestion('prev')}
              disabled={currentQuestion === 0}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <button
              onClick={() => navigateQuestion('next')}
              disabled={currentQuestion === QUESTIONS.length - 1}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          {/* Automatic Scoring Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Automatic Scoring</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div>
                  <p className="font-medium">Student Answer: <span className="text-blue-900">{studentAnswer || "No answer"}</span></p>
                  <p className="text-sm text-gray-600">Correct Answer: {currentQuestionData.correctAnswer}</p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleScore(currentQuestion, 1, true)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      scores[currentQuestion]?.isCorrect === true
                        ? "bg-green-500 text-white"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    Correct (1 pt)
                  </button>
                  <button
                    onClick={() => handleScore(currentQuestion, 0, false)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      scores[currentQuestion]?.isCorrect === false
                        ? "bg-red-500 text-white"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    Incorrect (0 pt)
                  </button>
                </div>
              </div>

              {/* Auto-score if answer matches exactly */}
              {studentAnswer && studentAnswer === currentQuestionData.correctAnswer && !scores[currentQuestion] && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">✓ Answer matches correct answer exactly</p>
                </div>
              )}
            </div>
          </div>

          {/* Score Summary */}
          <div className="mt-6 pt-6 border-t">
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Test Progress</h3>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Questions Scored: {Object.keys(scores).length} / {QUESTIONS.length}
                </span>
                <span className="text-xl font-bold text-blue-900">
                  Total Score: {totalScore} / {QUESTIONS.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ExaminerMathConceptsTest() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExaminerMathConceptsContent />
    </Suspense>
  )
}