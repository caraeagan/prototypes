'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PatternTestEntryNew() {
  const [name, setName] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const router = useRouter()

  const handleStart = async () => {
    if (!name.trim()) {
      alert('Please enter your name to start the test.')
      return
    }

    setIsStarting(true)
    
    // Generate a simple session ID based on name and timestamp
    const sessionId = `${name.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`
    
    // Store the name in localStorage for the session (matching expected format)
    localStorage.setItem(`student_${sessionId}`, JSON.stringify({
      firstName: name.trim(),
      lastName: '',
      startTime: new Date().toISOString(),
      sessionId
    }))

    // Redirect to the pattern reasoning test with 15+ filter
    router.push(`/student/${sessionId}/pattern-reasoning?filter=15plus`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-gray-900 text-center">Input your name</h1>

          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-center text-lg"
            onKeyPress={(e) => e.key === 'Enter' && handleStart()}
          />

          <button
            onClick={handleStart}
            disabled={isStarting || !name.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isStarting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </span>
            ) : (
              'Start'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}