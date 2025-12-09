"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic'

export default function StudentInterface() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [connected, setConnected] = useState(false)
  const [studentName, setStudentName] = useState("")
  const [hasJoined, setHasJoined] = useState(false)
  const [testStarted, setTestStarted] = useState(false)

  useEffect(() => {
    // Check if student has already joined this session
    const existingData = localStorage.getItem(`student_${sessionId}`)
    if (existingData) {
      const data = JSON.parse(existingData)
      setStudentName(data.name)
      setHasJoined(true)
      setConnected(true)
    } else {
      // Check if there's student info from examiner for this session
      const sessionStudentInfo = localStorage.getItem(`session_${sessionId}_studentInfo`)
      if (sessionStudentInfo) {
        const studentInfo = JSON.parse(sessionStudentInfo)
        const fullName = `${studentInfo.firstName} ${studentInfo.lastName}`
        setStudentName(fullName)
        // Auto-join with examiner-entered information
        const studentData = {
          name: fullName,
          firstName: studentInfo.firstName,
          lastName: studentInfo.lastName,
          grade: studentInfo.grade,
          age: studentInfo.age,
          joinedAt: new Date().toISOString(),
          sessionId
        }
        localStorage.setItem(`student_${sessionId}`, JSON.stringify(studentData))
        setHasJoined(true)
        setConnected(true)
      }
    }
  }, [sessionId])

  // Check for test start
  useEffect(() => {
    if (!hasJoined) return

    const checkTestStart = () => {
      const testStart = localStorage.getItem(`test_start_${sessionId}`)
      if (testStart === "true") {
        setTestStarted(true)

        // Check which test was selected
        const selectedTests = localStorage.getItem(`selected_tests_${sessionId}`)
        if (selectedTests?.includes("value-estimation")) {
          window.location.href = `/student/${sessionId}/test`
        } else if (selectedTests?.includes("analogies")) {
          window.location.href = `/student/${sessionId}/analogies`
        } else if (selectedTests?.includes("pattern-reasoning")) {
          window.location.href = `/student/${sessionId}/pattern-reasoning`
        } else if (selectedTests?.includes("math-concepts-applications")) {
          window.location.href = `/student/${sessionId}/math-concepts`
        } else if (selectedTests?.includes("figure-reproduction")) {
          window.location.href = `/student/${sessionId}/figure-reproduction`
        } else if (selectedTests?.includes("visual-recognition-memory")) {
          window.location.href = `/student/${sessionId}/visual-recognition-memory`
        } else if (selectedTests?.includes("visual-pattern-reasoning-v2")) {
          window.location.href = `/student/${sessionId}/visual-pattern-reasoning-v2`
        } else if (selectedTests?.includes("associative-learning-v2")) {
          window.location.href = `/student/${sessionId}/associative-learning-v2`
        } else if (selectedTests?.includes("associative-learning")) {
          window.location.href = `/student/${sessionId}/associative-learning`
        } else if (selectedTests?.includes("listening-comprehension")) {
          window.location.href = `/student/${sessionId}/listening-comprehension`
        }
      }
    }

    checkTestStart()
    const interval = setInterval(checkTestStart, 1000)

    return () => clearInterval(interval)
  }, [sessionId, hasJoined])

  const joinSession = () => {
    if (!studentName.trim()) {
      alert("Please enter your name")
      return
    }

    // Store student data to simulate connection
    const studentData = {
      name: studentName.trim(),
      joinedAt: new Date().toISOString(),
      sessionId
    }
    
    localStorage.setItem(`student_${sessionId}`, JSON.stringify(studentData))
    setHasJoined(true)
    setConnected(true)
  }

  const leaveSession = () => {
    localStorage.removeItem(`student_${sessionId}`)
    setHasJoined(false)
    setConnected(false)
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="bg-stone-100 rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Join Assessment
          </h1>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your name:
              </label>
              <input
                type="text"
                id="name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && joinSession()}
              />
            </div>
            
            <button
              onClick={joinSession}
              className="w-full px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800"
            >
              Join Session
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Session ID: {sessionId}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">Assessment</h1>
              <span className="text-sm text-gray-500">Welcome, {studentName.split(' ')[0]}</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-600">Connected</span>
              </div>
              
              <button
                onClick={leaveSession}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Leave Session
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-lg shadow p-8 text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-blue-900 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome {studentName.split(' ')[0]}</h2>
            <p className="text-lg text-gray-600">
              This activity will begin soon
            </p>
          </div>

          <div className="bg-blue-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 text-blue-700">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Waiting for examiner to begin...</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>Session ID: {sessionId}</p>
            <p>Joined at: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </main>
    </div>
  )
}