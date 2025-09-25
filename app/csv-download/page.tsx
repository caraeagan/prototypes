'use client'

import { useState } from 'react'

export default function CSVDownloadPage() {
  const [sessionId, setSessionId] = useState('')
  const [name, setName] = useState('Student')

  const downloadCSV = () => {
    console.log('CSV Download clicked for session:', sessionId)
    
    // Try to get results from localStorage using the session ID
    const keys = Object.keys(localStorage)
    console.log('All localStorage keys:', keys)
    
    let resultsToUse = []
    let foundKey = ''
    
    // Look for pattern test results with the session ID
    if (sessionId.trim()) {
      foundKey = `pattern_reasoning_test_${sessionId}`
      const storedResults = localStorage.getItem(foundKey)
      if (storedResults) {
        try {
          resultsToUse = JSON.parse(storedResults)
          console.log('Found results for session:', resultsToUse.length)
        } catch (error) {
          console.error('Error parsing stored results:', error)
        }
      }
    }
    
    // If no session ID provided or no results found, try to find any pattern test results
    if (resultsToUse.length === 0) {
      const patternKeys = keys.filter(key => key.includes('pattern_reasoning_test_'))
      if (patternKeys.length > 0) {
        foundKey = patternKeys[0] // Use the first one found
        const storedResults = localStorage.getItem(foundKey)
        if (storedResults) {
          try {
            resultsToUse = JSON.parse(storedResults)
            console.log('Found results from key:', foundKey, resultsToUse.length, 'results')
          } catch (error) {
            console.error('Error parsing stored results:', error)
          }
        }
      }
    }
    
    if (resultsToUse.length === 0) {
      alert('No test results found! Make sure you completed a pattern test first.')
      return
    }
    
    // Generate CSV with requested format: Name column, then Question 1, Question 2, etc.
    const headers = ['Name', ...resultsToUse.map((_, index) => `Question ${index + 1}`)]
    const resultRow = [name, ...resultsToUse.map(result => result.isCorrect ? 'Correct' : 'Incorrect')]
    
    const csvContent = [
      headers.join(','),
      resultRow.join(',')
    ].join('\n')
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pattern-test-results-${name}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    alert(`CSV downloaded successfully with ${resultsToUse.length} questions!`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Download CSV Results</h1>
          <p className="text-gray-600">Download your pattern test results as a CSV file</p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700 mb-2">
              Session ID (optional)
            </label>
            <input
              type="text"
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Leave blank to auto-find results"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={downloadCSV}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg"
          >
            📊 DOWNLOAD CSV RESULTS
          </button>
          
          <div 
            onClick={downloadCSV}
            style={{ 
              background: 'red', 
              color: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >
            🔴 EMERGENCY DOWNLOAD - CLICK HERE 🔴
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>This will find your most recent pattern test results and download them as CSV</p>
          <p className="mt-2">Format: Name, Question 1, Question 2, etc. with Correct/Incorrect results</p>
        </div>
      </div>
    </div>
  )
}