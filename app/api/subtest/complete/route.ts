import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subtestSessionId } = body

    await query(
      `UPDATE subtest_sessions
       SET completed = true, end_time = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [subtestSessionId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing subtest session:', error)
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    )
  }
}
