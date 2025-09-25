'use client'

import { useState } from 'react'

export default function DownloadResults() {
  const [sessionId, setSessionId] = useState('')
  const [name, setName] = useState('')

  const downloadCSV = () => {
    if (!sessionId.trim()) {
      alert('Please enter a session ID')
      return
    }

    console.log('Attempting to download CSV for session:', sessionId)
    
    // Try to get results from localStorage
    const storedResults = localStorage.getItem(`pattern_reasoning_test_${sessionId}`)
    
    if (!storedResults) {
      alert('No test results found for that session ID. Make sure you completed the test and the session ID is correct.')
      return
    }

    try {
      const results = JSON.parse(storedResults)
      console.log('Found results:', results.length)

      const headers = ['Name', 'Question Number', 'Question', 'Your Answer', 'Correct Answer', 'Result', 'Age Group']
      const userName = name || 'Student'
      
      const rows = results.map((result, index) => [
        userName,
        index + 1,
        `"${result.questionText || 'Question ' + (index + 1)}"`,
        result.userAnswer || 'No Answer',
        result.correctAnswer || 'N/A',
        result.isCorrect ? 'Correct' : 'Incorrect',
        result.ageGroup || 'N/A'
      ])
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pattern-test-results-${userName}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      alert(`CSV downloaded successfully with ${results.length} questions!`)
    } catch (error) {
      console.error('Error parsing results:', error)
      alert('Error reading test results. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📥</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Download Test Results</h1>
          <p className="text-gray-600">Download your pattern reasoning test results as a CSV file</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (optional)
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-2">
              Session ID
            </label>
            <input
              type="text"
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="e.g., h-1758831275604"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              This is part of the URL when you took the test (after /student/)
            </p>
          </div>

          <button
            onClick={downloadCSV}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            📥 Download CSV Results
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Your test results are stored locally in your browser</p>
          <p className="mt-2">The CSV will include your name, each question, your answers, and whether they were correct</p>
        </div>
      </div>
    </div>
  )
}