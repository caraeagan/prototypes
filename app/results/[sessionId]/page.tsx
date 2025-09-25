'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function IndividualResults() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResult = () => {
      try {
        // Load the specific result from localStorage
        const completedData = localStorage.getItem(`test_completed_${sessionId}`)
        const studentData = localStorage.getItem(`student_${sessionId}`)
        const testData = localStorage.getItem(`pattern_reasoning_test_${sessionId}`)
        
        if (!completedData || !testData) {
          setResult(null)
          setLoading(false)
          return
        }

        const completed = JSON.parse(completedData)
        const student = studentData ? JSON.parse(studentData) : null
        const testResults = JSON.parse(testData)

        const correctCount = testResults.filter((r: any) => r.isCorrect).length
        const totalQuestions = testResults.length
        const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

        setResult({
          sessionId,
          name: student?.firstName || completed.studentName || 'Unknown',
          completedAt: completed.completedAt || completed.timestamp,
          totalQuestions,
          correctAnswers: correctCount,
          score: completed.score || scorePercentage,
          results: testResults,
          isFiltered: completed.isFiltered || false,
          filterType: completed.filterType || 'all'
        })
      } catch (error) {
        console.error('Error loading individual result:', error)
        setResult(null)
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [sessionId])

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

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Results Not Found</h1>
          <p className="text-gray-600 mb-6">The results for this session could not be found.</p>
          <button
            onClick={() => router.push('/results')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{result.name}'s Results</h1>
              <p className="text-gray-600">Session: {result.sessionId}</p>
              <p className="text-gray-600">Completed: {new Date(result.completedAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                result.isFiltered ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {result.isFiltered ? 'Ages 12+ Test' : 'Full Test'}
              </span>
            </div>
          </div>

          {/* Overall Score */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{result.totalQuestions}</div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{result.correctAnswers}</div>
              <div className="text-sm text-gray-600">Correct</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${
                result.score >= 80 ? 'text-green-600' :
                result.score >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {result.score}%
              </div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
          </div>

          <button
            onClick={() => router.push('/results')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Back to All Results
          </button>
        </div>

        {/* Question by Question Results */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Question-by-Question Results</h2>
          
          <div className="space-y-3">
            {result.results.map((questionResult: any, index: number) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  questionResult.isCorrect
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                    questionResult.isCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {questionResult.isCorrect ? '✓' : '✗'}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Question {questionResult.questionId}
                    </div>
                    <div className="text-sm text-gray-600">
                      Age Group: {questionResult.ageGroup || 'Unknown'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Your Answer: <span className="font-semibold">{questionResult.answer?.answer || 'No Answer'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Correct Answer: <span className="font-semibold">{questionResult.correctAnswer}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Age Group Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance by Age Group</h2>
          
          {/* Calculate age group stats */}
          {(() => {
            const ageGroupStats: any = {}
            result.results.forEach((r: any) => {
              const ageGroup = r.ageGroup || 'Unknown'
              if (!ageGroupStats[ageGroup]) {
                ageGroupStats[ageGroup] = { total: 0, correct: 0 }
              }
              ageGroupStats[ageGroup].total += 1
              if (r.isCorrect) {
                ageGroupStats[ageGroup].correct += 1
              }
            })

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(ageGroupStats).map(([ageGroup, stats]: [string, any]) => {
                  const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
                  return (
                    <div key={ageGroup} className="bg-gray-50 rounded-lg p-4">
                      <div className="text-lg font-semibold text-gray-900">{ageGroup}</div>
                      <div className="text-sm text-gray-600 mb-2">{stats.correct} of {stats.total} questions</div>
                      <div className={`text-2xl font-bold ${
                        percentage >= 80 ? 'text-green-600' :
                        percentage >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {percentage}%
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}