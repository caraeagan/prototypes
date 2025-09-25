'use client'

import { useState, useEffect } from 'react'

export default function ResultsDashboard() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For now, load results from localStorage (in production, this would come from your database)
    const loadResults = () => {
      const allResults: any[] = []
      
      // Scan localStorage for completed tests
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('test_completed_')) {
          try {
            const result = JSON.parse(localStorage.getItem(key) || '{}')
            const sessionId = key.replace('test_completed_', '')
            
            // Get student info
            const studentData = localStorage.getItem(`student_${sessionId}`)
            const studentInfo = studentData ? JSON.parse(studentData) : null
            
            // Get detailed test results
            const testData = localStorage.getItem(`pattern_reasoning_test_${sessionId}`)
            const testResults = testData ? JSON.parse(testData) : []
            
            if (result.testType === 'pattern_reasoning' || result.subtest === 'pattern-reasoning') {
              const correctCount = testResults.filter((r: any) => r.isCorrect).length
              const totalQuestions = testResults.length
              const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
              
              allResults.push({
                sessionId,
                name: studentInfo?.firstName || result.studentName || 'Unknown',
                completedAt: result.completedAt || result.timestamp,
                totalQuestions,
                correctAnswers: correctCount,
                score: result.score || scorePercentage,
                results: testResults
              })
            }
          } catch (error) {
            console.error('Error parsing result:', error)
          }
        }
      }
      
      // Sort by completion date (newest first)
      allResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      
      setResults(allResults)
      setLoading(false)
    }

    loadResults()
  }, [])

  const exportToCSV = () => {
    if (results.length === 0) return
    
    const headers = ['Name', 'Session ID', 'Completed At', 'Total Questions', 'Correct Answers', 'Score (%)']
    
    // Add headers for individual questions
    const maxQuestions = Math.max(...results.map(r => r.totalQuestions))
    for (let i = 1; i <= maxQuestions; i++) {
      headers.push(`Q${i} Answer`)
      headers.push(`Q${i} Correct`)
    }
    
    const csvContent = [
      headers.join(','),
      ...results.map(result => {
        const row = [
          result.name,
          result.sessionId,
          new Date(result.completedAt).toLocaleString(),
          result.totalQuestions,
          result.correctAnswers,
          result.score
        ]
        
        // Add individual question results
        for (let i = 0; i < maxQuestions; i++) {
          const questionResult = result.results[i]
          if (questionResult) {
            row.push(questionResult.answer?.answer || 'No Answer')
            row.push(questionResult.isCorrect ? 'Correct' : 'Incorrect')
          } else {
            row.push('No Answer')
            row.push('Incorrect')
          }
        }
        
        return row.join(',')
      })
    ].join('\\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pattern-reasoning-results-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const clearAllResults = () => {
    if (confirm('Are you sure you want to clear all results? This cannot be undone.')) {
      // Remove all test-related localStorage items
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('test_completed_') ||
          key.startsWith('pattern_reasoning_test_') ||
          key.startsWith('student_')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      setResults([])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Pattern Reasoning Test Results</h1>
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                disabled={results.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
              <button
                onClick={clearAllResults}
                disabled={results.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No test results found</p>
              <p className="text-gray-400 mt-2">Results will appear here after people complete the pattern reasoning test</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correct</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.sessionId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{result.name}</div>
                        <div className="text-sm text-gray-500">{result.sessionId}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.completedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.totalQuestions}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.correctAnswers}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.score >= 80 ? 'bg-green-100 text-green-800' :
                          result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.score}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => {
                            // Show detailed results (you can expand this)
                            console.log('Detailed results for:', result.name, result.results)
                            alert(`Detailed results for ${result.name} logged to console`)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}