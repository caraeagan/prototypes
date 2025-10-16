import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, firstName, lastName, subtestName, ageFilter } = body

    // First, ensure student exists or create them
    const studentResult = await query(
      `INSERT INTO students (session_id, first_name, last_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id)
       DO UPDATE SET first_name = $2, last_name = $3
       RETURNING id`,
      [sessionId, firstName, lastName || '']
    )

    const studentId = studentResult.rows[0].id

    // Create subtest session
    const sessionResult = await query(
      `INSERT INTO subtest_sessions (student_id, subtest_name, age_filter)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [studentId, subtestName, ageFilter]
    )

    return NextResponse.json({
      success: true,
      subtestSessionId: sessionResult.rows[0].id
    })
  } catch (error) {
    console.error('Error starting subtest session:', error)
    return NextResponse.json(
      { error: 'Failed to start subtest session' },
      { status: 500 }
    )
  }
}
