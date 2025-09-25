import { NextRequest, NextResponse } from 'next/server'

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
    
    // Store in a simple JSON file for now (you can replace this with your database)
    // This is just for demonstration - in production, use a proper database
    
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

function formatAsCSV(data: any) {
  const headers = [
    'Name',
    'Session ID', 
    'Completed At',
    'Total Questions',
    'Correct Answers',
    'Score (%)',
    'Question 1',
    'Q1 Correct',
    'Question 2', 
    'Q2 Correct',
    // Add more question columns as needed
  ]
  
  const row = [
    data.name,
    data.sessionId,
    data.completedAt,
    data.totalQuestions,
    data.correctAnswers,
    data.score,
  ]
  
  // Add individual question results
  for (let i = 1; i <= data.totalQuestions; i++) {
    const answer = data.answers[i]
    if (answer) {
      row.push(answer.answer || 'No Answer')
      row.push(answer.isCorrect ? 'Correct' : 'Incorrect')
    } else {
      row.push('No Answer')
      row.push('Incorrect')
    }
  }
  
  return {
    headers: headers.join(','),
    row: row.join(',')
  }
}