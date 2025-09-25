import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const filePath = path.join(dataDir, 'test-results.json')
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ success: true, results: [] })
    }
    
    const fileContent = await readFile(filePath, 'utf8')
    const results = JSON.parse(fileContent)
    
    // Transform the data to match the format expected by the results page
    const transformedResults = results.map((result: any) => {
      // Calculate age group stats
      const ageGroupStats: any = {}
      if (result.detailedResults) {
        result.detailedResults.forEach((r: any) => {
          const ageGroup = r.ageGroup || 'Unknown'
          if (!ageGroupStats[ageGroup]) {
            ageGroupStats[ageGroup] = { total: 0, correct: 0 }
          }
          ageGroupStats[ageGroup].total += 1
          if (r.isCorrect) {
            ageGroupStats[ageGroup].correct += 1
          }
        })
      }
      
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
      
      return {
        sessionId: result.sessionId,
        name: result.name,
        completedAt: result.completedAt,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        score: result.score,
        results: result.detailedResults || [],
        ageGroupStats: ageGroupPercentages,
        isFiltered: result.isFiltered || false,
        filterType: result.filterType || 'all'
      }
    })
    
    // Sort by completion date (newest first)
    transformedResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    
    return NextResponse.json({ 
      success: true, 
      results: transformedResults 
    })
    
  } catch (error) {
    console.error('Error fetching test results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test results' },
      { status: 500 }
    )
  }
}