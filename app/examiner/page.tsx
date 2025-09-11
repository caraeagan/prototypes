"use client"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function ExaminerInterfaceContent() {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string>("")
  const [studentConnected, setStudentConnected] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [studentLink, setStudentLink] = useState<string>("")
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [testCompleted, setTestCompleted] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const selectedTests = searchParams.get("tests")?.split(",") || []

  useEffect(() => {
    // Use existing session ID from URL if available, otherwise generate new one
    const existingSessionId = searchParams.get("session")
    const id = existingSessionId || Math.random().toString(36).substring(2, 15)
    setSessionId(id)
    setStudentLink(`${window.location.origin}/student/${id}`)
    
    // Get student info from localStorage
    const examinerStudentInfo = localStorage.getItem('examinerStudentInfo')
    if (examinerStudentInfo) {
      const info = JSON.parse(examinerStudentInfo)
      setStudentInfo(info)
      
      // Store the student info with the session ID for the student interface to access
      localStorage.setItem(`session_${id}_studentInfo`, JSON.stringify(info))
    }
  }, [searchParams])

  // Check student connection and test completion status
  useEffect(() => {
    if (!sessionId) return
    
    const checkStatus = () => {
      const studentData = localStorage.getItem(`student_${sessionId}`)
      setStudentConnected(!!studentData)
      
      // Check for test completion
      const completionStatus = localStorage.getItem(`test_completed_${sessionId}`)
      if (completionStatus && !testCompleted) {
        setTestCompleted(true)
        setShowCompletionModal(true)
        
        // Update student status in students list
        const students = JSON.parse(localStorage.getItem('students') || '[]')
        const updatedStudents = students.map((student: any) => 
          student.sessionId === sessionId 
            ? { ...student, testStatus: 'completed' }
            : student
        )
        localStorage.setItem('students', JSON.stringify(updatedStudents))
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 1000)

    return () => clearInterval(interval)
  }, [sessionId, testCompleted])



  const copyStudentLink = async () => {
    try {
      await navigator.clipboard.writeText(studentLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Examiner Interface</h1>
              
              {/* Student Connection Status Indicator */}
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-full ${
                    studentConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {studentConnected ? "Student Connected" : "Waiting for Student"}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                Dashboard
              </button>
              <div className="text-sm text-gray-600">Examiner</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Student Link Section */}
        <div className="bg-stone-100 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Student Access</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={copyStudentLink}
              className="px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copiedLink ? "Copied!" : "Copy Student Link"}</span>
            </button>
            {sessionId && (
              <span className="text-sm text-gray-500">
                Session ID: {sessionId}
              </span>
            )}
          </div>
        </div>

        {/* Student Information */}
        {studentInfo && (
          <div className="bg-stone-100 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Student Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium">{studentInfo.firstName} {studentInfo.lastName}</p>
              </div>
              <div>
                <span className="text-gray-500">Grade:</span>
                <p className="font-medium">{studentInfo.grade}</p>
              </div>
              <div>
                <span className="text-gray-500">Age:</span>
                <p className="font-medium">{studentInfo.age} years old</p>
              </div>
            </div>
          </div>
        )}

        {/* Selected Tests */}
        <div className="bg-stone-100 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Selected Subtests</h2>
          <div className="space-y-2">
            {selectedTests.map((test) => (
              <div key={test} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="capitalize">{test.replace("-", " ")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Test Control Panel */}
        <div className="bg-stone-100 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Test Controls</h2>
          
          {!studentConnected ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Waiting for student to join...
              </div>
              <p className="text-sm text-gray-400">
                Share the student link above for the student to join the session
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600 mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Student is connected and ready</span>
              </div>
              
              <button 
                onClick={() => {
                  // Start the test for both examiner and student
                  const tests = selectedTests.join(",")
                  localStorage.setItem(`test_start_${sessionId}`, "true")
                  localStorage.setItem(`selected_tests_${sessionId}`, tests)
                  
                  // Route to appropriate test based on selection
                  if (tests.includes("value-estimation")) {
                    window.location.href = `/examiner/test?session=${sessionId}`
                  } else if (tests.includes("analogies")) {
                    window.location.href = `/examiner/analogies?session=${sessionId}`
                  } else if (tests.includes("pattern-reasoning")) {
                    window.location.href = `/examiner/pattern-reasoning?session=${sessionId}`
                  }
                }}
                className="px-6 py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800"
              >
                Begin Assessment
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Test Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Test Completed!
              </h2>
            </div>
            
            <div className="px-6 py-4">
              <p className="text-gray-600 mb-4">
                {studentInfo ? `${studentInfo.firstName} ${studentInfo.lastName}` : 'The student'} has completed all assigned subtests.
              </p>
              <p className="text-sm text-gray-500">
                What would you like to do next?
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex flex-col space-y-3">
              <button
                onClick={() => {
                  window.location.href = '/dashboard'
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400"
              >
                Stay on Current Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExaminerInterface() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExaminerInterfaceContent />
    </Suspense>
  )
}