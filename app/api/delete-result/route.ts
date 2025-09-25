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
    
    // Try to delete from external storage first
    try {
      const BIN_ID = process.env.JSONBIN_BIN_ID || '673de8a3ad19ca34f8d3f4bb'
      const API_KEY = process.env.JSONBIN_API_KEY || '$2a$10$K1m0R4ydVTBBfMCyuzIRSeQqsVqI6p7gQJ2VJH1Z5R3bKTjWlXJ.G'
      
      // First, get existing data
      const getResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': API_KEY
        }
      })
      
      if (!getResponse.ok) {
        throw new Error('Failed to fetch existing data')
      }
      
      const getResult = await getResponse.json()
      const existingResults = getResult.record.results || []
      
      // Filter out the result with matching sessionId
      const originalLength = existingResults.length
      const filteredResults = existingResults.filter((result: any) => result.sessionId !== sessionId)
      
      if (filteredResults.length === originalLength) {
        throw new Error('Result not found in external storage')
      }
      
      // Update the bin with filtered results
      const updateResponse = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': API_KEY
        },
        body: JSON.stringify({
          results: filteredResults
        })
      })
      
      if (!updateResponse.ok) {
        throw new Error(`JSONBin update failed: ${updateResponse.status}`)
      }
      
      console.log(`Successfully deleted result from external storage for session: ${sessionId}`)
    } catch (externalError) {
      console.log('External deletion failed, trying file storage:', externalError)
      
      // Fallback to file storage for local development
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
    }
    
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