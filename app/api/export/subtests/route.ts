import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(
      `SELECT DISTINCT subtest_name, COUNT(*) as response_count
       FROM subtest_sessions ss
       JOIN subtest_responses sr ON ss.id = sr.session_id
       GROUP BY subtest_name
       ORDER BY subtest_name`
    )

    return NextResponse.json({
      success: true,
      subtests: result.rows
    })
  } catch (error) {
    console.error('Error fetching subtests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subtests' },
      { status: 500 }
    )
  }
}
