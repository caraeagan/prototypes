'use client'

import { useState, useEffect } from 'react'

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        // First try to load from API (centralized storage)
        const response = await fetch('/api/get-results')
        const data = await response.json()
        
        let allResults: any[] = []
        
        if (data.success) {
          // Transform API results to analytics format
          allResults = data.results.map((result: any) => ({
            sessionId: result.sessionId,
            name: result.name,
            isFiltered: result.isFiltered || false,
            results: result.results
          }))
        } else {
          throw new Error('Failed to fetch from API')
        }
        
        // Also check localStorage for any results not synced yet
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('test_completed_')) {
            try {
              const result = JSON.parse(localStorage.getItem(key) || '{}')
              const sessionId = key.replace('test_completed_', '')
              
              // Check if this result is already in API results
              const existsInApi = allResults.find((r: any) => r.sessionId === sessionId)
              if (existsInApi) continue // Skip if already in API results
              
              // Get student info
              const studentData = localStorage.getItem(`student_${sessionId}`)
              const studentInfo = studentData ? JSON.parse(studentData) : null
              
              // Get detailed test results
              const testData = localStorage.getItem(`pattern_reasoning_test_${sessionId}`)
              const testResults = testData ? JSON.parse(testData) : []
              
              if (result.testType === 'pattern_reasoning' || result.subtest === 'pattern-reasoning') {
                const userResult = {
                  sessionId,
                  name: studentInfo?.firstName || result.studentName || 'Unknown',
                  isFiltered: result.isFiltered || false,
                  results: testResults
                }
                allResults.push(userResult)
              }
            } catch (error) {
              console.error('Error parsing analytics data:', error)
            }
          }
        }
        
        // Process question statistics
        const questionStats: any = {}
        
        allResults.forEach((userResult: any) => {
          // Process each question
          userResult.results.forEach((questionResult: any) => {
            const questionId = questionResult.questionId
            const ageGroup = questionResult.ageGroup || 'Unknown'
            
            if (!questionStats[questionId]) {
              questionStats[questionId] = {
                questionId,
                ageGroup,
                total: 0,
                correct: 0,
                totalFiltered: 0,
                correctFiltered: 0,
                totalFull: 0,
                correctFull: 0
              }
            }
            
            questionStats[questionId].total += 1
            if (questionResult.isCorrect) {
              questionStats[questionId].correct += 1
            }
            
            // Track by test type
            if (userResult.isFiltered) {
              questionStats[questionId].totalFiltered += 1
              if (questionResult.isCorrect) {
                questionStats[questionId].correctFiltered += 1
              }
            } else {
              questionStats[questionId].totalFull += 1
              if (questionResult.isCorrect) {
                questionStats[questionId].correctFull += 1
              }
            }
          })
        })
        
        // Calculate percentages
        const processedStats = Object.values(questionStats).map((stat: any) => ({
          ...stat,
          percentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
          percentageFiltered: stat.totalFiltered > 0 ? Math.round((stat.correctFiltered / stat.totalFiltered) * 100) : 0,
          percentageFull: stat.totalFull > 0 ? Math.round((stat.correctFull / stat.totalFull) * 100) : 0
        }))
        
        // Sort by question ID
        processedStats.sort((a, b) => a.questionId - b.questionId)
        
        setAnalytics({
          questionStats: processedStats,
          totalUsers: allResults.length,
          filteredUsers: allResults.filter(r => r.isFiltered).length,
          fullTestUsers: allResults.filter(r => !r.isFiltered).length
        })
        
      } catch (error) {
        console.error('Error loading analytics:', error)
        // Fallback to localStorage only
        const questionStats: any = {}
        const allResults: any[] = []
        
        // Scan localStorage for all completed tests
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
                const userResult = {
                  sessionId,
                  name: studentInfo?.firstName || result.studentName || 'Unknown',
                  isFiltered: result.isFiltered || false,
                  results: testResults
                }
                allResults.push(userResult)
                
                // Process each question
                testResults.forEach((questionResult: any) => {
                  const questionId = questionResult.questionId
                  const ageGroup = questionResult.ageGroup || 'Unknown'
                  
                  if (!questionStats[questionId]) {
                    questionStats[questionId] = {
                      questionId,
                      ageGroup,
                      total: 0,
                      correct: 0,
                      totalFiltered: 0,
                      correctFiltered: 0,
                      totalFull: 0,
                      correctFull: 0
                    }
                  }
                  
                  questionStats[questionId].total += 1
                  if (questionResult.isCorrect) {
                    questionStats[questionId].correct += 1
                  }
                  
                  // Track by test type
                  if (userResult.isFiltered) {
                    questionStats[questionId].totalFiltered += 1
                    if (questionResult.isCorrect) {
                      questionStats[questionId].correctFiltered += 1
                    }
                  } else {
                    questionStats[questionId].totalFull += 1
                    if (questionResult.isCorrect) {
                      questionStats[questionId].correctFull += 1
                    }
                  }
                })
              }
            } catch (error) {
              console.error('Error parsing analytics data:', error)
            }
          }
        }
        
        // Calculate percentages
        const processedStats = Object.values(questionStats).map((stat: any) => ({
          ...stat,
          percentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
          percentageFiltered: stat.totalFiltered > 0 ? Math.round((stat.correctFiltered / stat.totalFiltered) * 100) : 0,
          percentageFull: stat.totalFull > 0 ? Math.round((stat.correctFull / stat.totalFull) * 100) : 0
        }))
        
        // Sort by question ID
        processedStats.sort((a, b) => a.questionId - b.questionId)
        
        setAnalytics({
          questionStats: processedStats,
          totalUsers: allResults.length,
          filteredUsers: allResults.filter(r => r.isFiltered).length,
          fullTestUsers: allResults.filter(r => !r.isFiltered).length
        })
      }
      
      setLoading(false)
    }

    loadAnalytics()
  }, [])

  const exportAnalytics = () => {
    if (!analytics) return
    
    const headers = [
      'Question ID',
      'Age Group', 
      'Total Attempts',
      'Correct Answers',
      'Success Rate (%)',
      'Ages 12+ Test Attempts',
      'Ages 12+ Test Correct',
      'Ages 12+ Test Success Rate (%)',
      'Full Test Attempts',
      'Full Test Correct',
      'Full Test Success Rate (%)'
    ]
    
    const csvContent = [
      headers.join(','),
      ...analytics.questionStats.map((stat: any) => [
        stat.questionId,
        stat.ageGroup,
        stat.total,
        stat.correct,
        stat.percentage,
        stat.totalFiltered,
        stat.correctFiltered,
        stat.percentageFiltered,
        stat.totalFull,
        stat.correctFull,
        stat.percentageFull
      ].join(','))
    ].join('\\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pattern-reasoning-analytics-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics || analytics.questionStats.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h1>
          <p className="text-gray-600">No test results found for analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pattern Reasoning Analytics</h1>
              <p className="text-gray-600">Question-by-question performance analysis</p>
            </div>
            <button
              onClick={exportAnalytics}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Export Analytics CSV
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-900">{analytics.totalUsers}</div>
              <div className="text-sm text-blue-700">Total Users</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-900">{analytics.filteredUsers}</div>
              <div className="text-sm text-purple-700">Ages 12+ Test</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-indigo-900">{analytics.fullTestUsers}</div>
              <div className="text-sm text-indigo-700">Full Test</div>
            </div>
          </div>

          {/* Question Performance Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Success</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ages 12+ Test</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Full Test</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.questionStats.map((stat: any) => {
                  const getDifficultyLevel = (percentage: number) => {
                    if (percentage >= 80) return { text: 'Easy', color: 'text-green-600', bg: 'bg-green-100' }
                    if (percentage >= 60) return { text: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100' }
                    if (percentage >= 40) return { text: 'Hard', color: 'text-orange-600', bg: 'bg-orange-100' }
                    return { text: 'Very Hard', color: 'text-red-600', bg: 'bg-red-100' }
                  }
                  
                  const difficulty = getDifficultyLevel(stat.percentage)
                  
                  return (
                    <tr key={stat.questionId} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">Question {stat.questionId}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {stat.ageGroup}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="text-sm font-semibold text-gray-900">{stat.percentage}%</div>
                        <div className="text-xs text-gray-500">{stat.correct}/{stat.total}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {stat.totalFiltered > 0 ? (
                          <>
                            <div className="text-sm font-semibold text-purple-900">{stat.percentageFiltered}%</div>
                            <div className="text-xs text-purple-600">{stat.correctFiltered}/{stat.totalFiltered}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {stat.totalFull > 0 ? (
                          <>
                            <div className="text-sm font-semibold text-indigo-900">{stat.percentageFull}%</div>
                            <div className="text-xs text-indigo-600">{stat.correctFull}/{stat.totalFull}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${difficulty.bg} ${difficulty.color}`}>
                          {difficulty.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Difficulty Distribution */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Question Difficulty Distribution</h2>
            <div className="grid grid-cols-4 gap-4">
              {['Easy (80%+)', 'Medium (60-79%)', 'Hard (40-59%)', 'Very Hard (<40%)'].map((category, index) => {
                const ranges = [
                  [80, 100], [60, 79], [40, 59], [0, 39]
                ]
                const [min, max] = ranges[index]
                const count = analytics.questionStats.filter((stat: any) => 
                  stat.percentage >= min && stat.percentage <= max
                ).length
                
                const colors = [
                  'bg-green-100 text-green-800',
                  'bg-yellow-100 text-yellow-800', 
                  'bg-orange-100 text-orange-800',
                  'bg-red-100 text-red-800'
                ]
                
                return (
                  <div key={category} className={`rounded-lg p-4 text-center ${colors[index]}`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm">{category}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}