import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    const dataDir = path.join(process.cwd(), 'data')
    const filePath = path.join(dataDir, 'test-results.json')
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'No results found' },
        { status: 404 }
      )
    }
    
    // Read existing data
    const fileContent = await readFile(filePath, 'utf8')
    const results = JSON.parse(fileContent)
    
    // Find and remove the result with matching sessionId
    const originalLength = results.length
    const filteredResults = results.filter((result: any) => result.sessionId !== sessionId)
    
    if (filteredResults.length === originalLength) {
      return NextResponse.json(
        { success: false, error: 'Result not found' },
        { status: 404 }
      )
    }
    
    // Write back the filtered results
    await writeFile(filePath, JSON.stringify(filteredResults, null, 2))
    
    console.log(`Successfully deleted result for session: ${sessionId}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Result deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting result:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete result' },
      { status: 500 }
    )
  }
}