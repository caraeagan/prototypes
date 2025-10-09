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
  completedSubtests: string[]
  assignedSubtests: string[]
}

// Subtests that have score review available
const REVIEWABLE_SUBTESTS = [
  {
    id: "nonsense-word-decoding",
    name: "Nonsense Word Decoding",
    description: "Review and score student's nonsense word pronunciations",
    available: true
  },
  {
    id: "spelling",
    name: "Spelling",
    description: "Review and score student's spelling responses",
    available: false // Not yet implemented
  },
  {
    id: "letter-word-identification",
    name: "Letter and Word Identification",
    description: "Review and score student's letter and word identification",
    available: false // Not yet implemented
  }
]

export default function ScoreReviewHome() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [student, setStudent] = useState<Student | null>(null)

  useEffect(() => {
    // Find student by session ID or temp session ID
    const savedStudents = localStorage.getItem('students')
    if (savedStudents) {
      const students = JSON.parse(savedStudents)

      // First try to find by sessionId
      let foundStudent = students.find((s: Student) => s.sessionId === sessionId)

      // If not found and sessionId starts with "temp_", try to find by student ID
      if (!foundStudent && sessionId.startsWith('temp_')) {
        const studentId = sessionId.replace('temp_', '')
        foundStudent = students.find((s: Student) => s.id === studentId)
      }

      if (foundStudent) {
        setStudent(foundStudent)
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }, [sessionId, router])

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

  // Show all reviewable subtests (not filtered by assigned subtests)
  const availableSubtests = REVIEWABLE_SUBTESTS

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

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Student Info */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-gray-600">Select a subtest to review and score responses</p>
        </div>

        {/* Subtest List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Subtests for Review</h2>
          </div>

          {availableSubtests.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No subtests available for score review.</p>
              <p className="text-sm mt-2">This student has not been assigned any subtests that require manual scoring.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {availableSubtests.map((subtest) => {
                const isCompleted = student.completedSubtests.includes(subtest.id)

                return (
                  <div key={subtest.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {subtest.name}
                          </h3>
                          {isCompleted ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                              Completed
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{subtest.description}</p>
                      </div>

                      {subtest.available ? (
                        <button
                          onClick={() => {
                            router.push(`/score-review/${sessionId}/${subtest.id}`)
                          }}
                          className="ml-4 px-4 py-2 bg-blue-900 text-white text-sm rounded-lg font-medium hover:bg-blue-800"
                        >
                          Review Scores
                        </button>
                      ) : (
                        <button
                          disabled
                          className="ml-4 px-4 py-2 bg-gray-300 text-gray-500 text-sm rounded-lg font-medium cursor-not-allowed"
                        >
                          Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
