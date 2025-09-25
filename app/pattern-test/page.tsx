'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PatternTestEntry() {
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

    // Redirect to the pattern reasoning test
    router.push(`/student/${sessionId}/pattern-reasoning`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Visual Pattern Reasoning Test</h1>
          <p className="text-gray-600">Test your pattern recognition skills with visual puzzles</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Test Information:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 53 visual pattern questions</li>
              <li>• Questions range from ages 2.5 to 15+</li>
              <li>• No time limit - work at your own pace</li>
              <li>• Choose the best answer for each pattern</li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            disabled={isStarting || !name.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            {isStarting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Test...
              </span>
            ) : (
              'Start Pattern Test'
            )}
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Your responses will be stored locally in your browser</p>
        </div>
      </div>
    </div>
  )
}