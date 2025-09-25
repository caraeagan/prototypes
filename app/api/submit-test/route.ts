import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Log the data for now (you can replace this with your preferred spreadsheet service)
    console.log('Pattern Reasoning Test Submission:', {
      timestamp: new Date().toISOString(),
      ...data
    })
    
    // Option 1: Google Sheets API (uncomment and configure if you want to use Google Sheets)
    /*
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}/values/Sheet1!A:Z:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GOOGLE_SHEETS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [
            data.name,
            data.sessionId,
            data.completedAt,
            data.totalQuestions,
            data.correctAnswers,
            data.score,
            JSON.stringify(data.answers)
          ]
        ]
      })
    })
    */
    
    // Option 2: Send to webhook (Zapier, Make.com, etc.)
    // Uncomment and configure if you want to use a webhook service
    /*
    const webhookUrl = process.env.WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          ...data
        })
      })
    }
    */
    
    // Option 3: CSV Export (will create a downloadable CSV)
    const csvData = formatAsCSV(data)
    
    // Store data in a JSON file for cross-computer syncing
    await storeTestResult(data)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test results submitted successfully',
      csvData 
    })
    
  } catch (error) {
    console.error('Error submitting test results:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit test results' },
      { status: 500 }
    )
  }
}

async function storeTestResult(data: any) {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const filePath = path.join(dataDir, 'test-results.json')
    
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true })
    }
    
    let existingData = []
    
    // Read existing data if file exists
    if (existsSync(filePath)) {
      try {
        const fileContent = await readFile(filePath, 'utf8')
        existingData = JSON.parse(fileContent)
      } catch (error) {
        console.warn('Could not read existing data file, starting fresh:', error)
      }
    }
    
    // Add new result
    existingData.push({
      ...data,
      submittedAt: new Date().toISOString()
    })
    
    // Write back to file
    await writeFile(filePath, JSON.stringify(existingData, null, 2))
    
    console.log('Test result stored successfully for:', data.name)
  } catch (error) {
    console.error('Error storing test result:', error)
  }
}

function formatAsCSV(data: any) {
  const headers = [
    'Name',
    'Session ID', 
    'Completed At',
    'Total Questions',
    'Correct Answers',
    'Score (%)',
  ]
  
  // Add question headers dynamically based on actual results
  if (data.detailedResults && data.detailedResults.length > 0) {
    data.detailedResults.forEach((result: any, index: number) => {
      headers.push(`Q${result.questionId} Answer`)
      headers.push(`Q${result.questionId} Correct`)
    })
  }
  
  const row = [
    data.name,
    data.sessionId,
    data.completedAt,
    data.totalQuestions,
    data.correctAnswers,
    data.score,
  ]
  
  // Add individual question results from detailedResults
  if (data.detailedResults && data.detailedResults.length > 0) {
    data.detailedResults.forEach((result: any) => {
      row.push(result.userAnswer || 'No Answer')
      row.push(result.isCorrect ? 'Correct' : 'Incorrect')
    })
  }
  
  return {
    headers: headers.join(','),
    row: row.join(',')
  }
}