import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    let results = []
    
    // Try to get results from external storage first
    try {
      const BIN_ID = process.env.JSONBIN_BIN_ID || '673de8a3ad19ca34f8d3f4bb'
      const API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$K1m0R4ydVTBBfMCyuzIRSeQqsVqI6p7gQJ2VJH1Z5R3bKTjWlXJ.G'
      
      const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': API_KEY
        }
      })
      
      if (getResponse.ok) {
        const getResult = await getResponse.json()
        results = getResult.record.results || []
        console.log('Loaded', results.length, 'results from external storage')
      } else {
        throw new Error(`JSONBin fetch failed: ${getResponse.status}`)
      }
    } catch (externalError) {
      console.log('External storage failed, trying file storage as fallback:', externalError)
      
      // Fallback to file storage for local development
      const dataDir = path.join(process.cwd(), 'data')
      const filePath = path.join(dataDir, 'test-results.json')
      
      if (!existsSync(filePath)) {
        console.log('No results file found either')
        return NextResponse.json({
          success: true,
          results: [],
          message: 'No storage available. Results may be in logs only.'
        })
      }
      
      const fileContent = await readFile(filePath, 'utf8')
      results = JSON.parse(fileContent)
    }
    
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