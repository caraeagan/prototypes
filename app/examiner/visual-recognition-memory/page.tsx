"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function VisualRecognitionMemoryExaminerContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session") || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)

  useEffect(() => {
    // Get student info from localStorage
    const examinerStudentInfo = localStorage.getItem('examinerStudentInfo')
    if (examinerStudentInfo) {
      const info = JSON.parse(examinerStudentInfo)
      setStudentInfo(info)
    }
  }, [])

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Visual Recognition Memory - Examiner</h1>
              {studentInfo && (
                <p className="text-sm text-gray-600 mt-1">
                  {studentInfo.firstName} {studentInfo.lastName} • Grade {studentInfo.grade} • Age {studentInfo.age}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                Dashboard
              </button>
              <div className="text-sm text-gray-600">Examiner View</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Visual Recognition Memory Subtest</h2>
          <p className="text-gray-600 mb-4">
            Monitor the student's progress as they complete the visual recognition memory tasks.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium mb-2">Instructions for Examiner:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>The student will be shown a series of visual patterns</li>
                <li>After a brief delay, they will need to identify the pattern they saw</li>
                <li>Monitor their engagement and attention throughout the test</li>
                <li>Do not provide any hints or assistance during the test</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium mb-2">Student Link:</h3>
              <p className="text-sm text-gray-600 mb-2">Share this link with the student to begin:</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={`${window.location.origin}/student/${sessionId}/visual-recognition-memory`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/student/${sessionId}/visual-recognition-memory`)
                    alert('Link copied!')
                  }}
                  className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => router.push(`/examiner?session=${sessionId}`)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
              >
                Back to Examiner Interface
              </button>
              <button
                onClick={() => {
                  window.open(`/student/${sessionId}/visual-recognition-memory`, '_blank')
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Open Student View
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function VisualRecognitionMemoryExaminer() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VisualRecognitionMemoryExaminerContent />
    </Suspense>
  )
}
