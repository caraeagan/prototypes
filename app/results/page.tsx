'use client'

import { useState, useEffect } from 'react'

export default function ResultsDashboard() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResults = async () => {
      try {
        // First try to load from API (centralized storage)
        const response = await fetch('/api/get-results')
        const data = await response.json()
        
        if (data.success) {
          let apiResults = data.results || []
          
          // Also load any localStorage results that might not be synced yet
          const localResults: any[] = []
          
          // Scan localStorage for completed tests
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('test_completed_')) {
              try {
                const result = JSON.parse(localStorage.getItem(key) || '{}')
                const sessionId = key.replace('test_completed_', '')
                
                // Check if this result is already in API results
                const existsInApi = apiResults.find((r: any) => r.sessionId === sessionId)
                if (existsInApi) continue // Skip if already in API results
                
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
                  
                  // Calculate age group breakdowns
                  const ageGroupStats: any = {}
                  testResults.forEach((r: any) => {
                    const ageGroup = r.ageGroup || 'Unknown'
                    if (!ageGroupStats[ageGroup]) {
                      ageGroupStats[ageGroup] = { total: 0, correct: 0 }
                    }
                    ageGroupStats[ageGroup].total += 1
                    if (r.isCorrect) {
                      ageGroupStats[ageGroup].correct += 1
                    }
                  })
                  
                  // Calculate percentages for each age group
                  const ageGroupPercentages: any = {}
                  Object.keys(ageGroupStats).forEach(ageGroup => {
                    const stats = ageGroupStats[ageGroup]
                    ageGroupPercentages[ageGroup] = {
                      total: stats.total,
                      correct: stats.correct,
                      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
                    }
                  })
                  
                  localResults.push({
                    sessionId,
                    name: studentInfo?.firstName || result.studentName || 'Unknown',
                    completedAt: result.completedAt || result.timestamp,
                    totalQuestions,
                    correctAnswers: correctCount,
                    score: result.score || scorePercentage,
                    results: testResults,
                    ageGroupStats: ageGroupPercentages,
                    isFiltered: result.isFiltered || false,
                    filterType: result.filterType || 'all'
                  })
                }
              } catch (error) {
                console.error('Error parsing local result:', error)
              }
            }
          }
          
          // Combine API and local results
          const allResults = [...apiResults, ...localResults]
          
          // Sort by completion date (newest first)
          allResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
          
          setResults(allResults)
        } else {
          throw new Error('Failed to fetch from API')
        }
      } catch (error) {
        console.error('Error loading results:', error)
        // Fallback to localStorage only if API fails
        const localResults: any[] = []
        
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
                
                // Calculate age group breakdowns
                const ageGroupStats: any = {}
                testResults.forEach((r: any) => {
                  const ageGroup = r.ageGroup || 'Unknown'
                  if (!ageGroupStats[ageGroup]) {
                    ageGroupStats[ageGroup] = { total: 0, correct: 0 }
                  }
                  ageGroupStats[ageGroup].total += 1
                  if (r.isCorrect) {
                    ageGroupStats[ageGroup].correct += 1
                  }
                })
                
                // Calculate percentages for each age group
                const ageGroupPercentages: any = {}
                Object.keys(ageGroupStats).forEach(ageGroup => {
                  const stats = ageGroupStats[ageGroup]
                  ageGroupPercentages[ageGroup] = {
                    total: stats.total,
                    correct: stats.correct,
                    percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
                  }
                })
                
                localResults.push({
                  sessionId,
                  name: studentInfo?.firstName || result.studentName || 'Unknown',
                  completedAt: result.completedAt || result.timestamp,
                  totalQuestions,
                  correctAnswers: correctCount,
                  score: result.score || scorePercentage,
                  results: testResults,
                  ageGroupStats: ageGroupPercentages,
                  isFiltered: result.isFiltered || false,
                  filterType: result.filterType || 'all'
                })
              }
            } catch (error) {
              console.error('Error parsing result:', error)
            }
          }
        }
        
        // Sort by completion date (newest first)
        localResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        
        setResults(localResults)
      }
      
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

  const deleteResult = async (sessionId: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}'s test result? This cannot be undone.`)) {
      try {
        let apiDeleteSuccess = false
        
        // Try to delete from API (centralized storage)
        try {
          const response = await fetch('/api/delete-result', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId })
          })

          if (response.ok) {
            apiDeleteSuccess = true
          } else {
            const data = await response.json()
            console.log('API delete failed:', data.error)
            // Don't show error yet - might only be in localStorage
          }
        } catch (apiError) {
          console.log('API delete error:', apiError)
          // Don't show error yet - might only be in localStorage
        }

        // Always try to remove from localStorage (for local-only results)
        const localDeleted = {
          completed: !!localStorage.getItem(`test_completed_${sessionId}`),
          test: !!localStorage.getItem(`pattern_reasoning_test_${sessionId}`),
          student: !!localStorage.getItem(`student_${sessionId}`)
        }
        
        localStorage.removeItem(`test_completed_${sessionId}`)
        localStorage.removeItem(`pattern_reasoning_test_${sessionId}`)
        localStorage.removeItem(`student_${sessionId}`)
        
        const localDeletedAny = localDeleted.completed || localDeleted.test || localDeleted.student
        
        if (apiDeleteSuccess || localDeletedAny) {
          // Remove from current results state
          setResults(results.filter(r => r.sessionId !== sessionId))
          alert(`Successfully deleted ${name}'s test result.`)
        } else {
          alert(`Could not find ${name}'s test result to delete.`)
        }
      } catch (error) {
        console.error('Error deleting result:', error)
        alert('Error deleting result. Please try again.')
      }
    }
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
                onClick={() => window.location.href = '/analytics'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Analytics
              </button>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group Breakdown</th>
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
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.isFiltered ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {result.isFiltered ? 'Ages 12+' : 'All Ages'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.completedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.totalQuestions}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.score >= 80 ? 'bg-green-100 text-green-800' :
                          result.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.score}% ({result.correctAnswers}/{result.totalQuestions})
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs space-y-1">
                          {Object.entries(result.ageGroupStats || {}).map(([ageGroup, stats]: [string, any]) => (
                            <div key={ageGroup} className="flex justify-between items-center">
                              <span className="font-medium text-gray-600">{ageGroup}:</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                stats.percentage >= 80 ? 'bg-green-100 text-green-800' :
                                stats.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {stats.percentage}% ({stats.correct}/{stats.total})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              window.location.href = `/results/${result.sessionId}`
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => deleteResult(result.sessionId, result.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
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