import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subtestName = searchParams.get('subtest')

    if (!subtestName) {
      return NextResponse.json(
        { error: 'Subtest name is required' },
        { status: 400 }
      )
    }

    // Query all responses for the specified subtest
    const result = await query(
      `SELECT
        s.session_id,
        s.first_name,
        s.last_name,
        ss.subtest_name,
        ss.age_filter,
        ss.start_time,
        ss.end_time,
        ss.completed,
        sr.question_id,
        sr.student_answer,
        sr.correct_answer,
        sr.is_correct,
        sr.time_spent_seconds,
        sr.answered_at
       FROM subtest_responses sr
       JOIN subtest_sessions ss ON sr.session_id = ss.id
       JOIN students s ON ss.student_id = s.id
       WHERE ss.subtest_name = $1
       ORDER BY s.session_id, sr.question_id`,
      [subtestName]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this subtest' },
        { status: 404 }
      )
    }

    // Generate CSV
    const headers = [
      'Session ID',
      'First Name',
      'Last Name',
      'Subtest',
      'Age Filter',
      'Start Time',
      'End Time',
      'Completed',
      'Question ID',
      'Student Answer',
      'Correct Answer',
      'Is Correct',
      'Time Spent (seconds)',
      'Answered At'
    ]

    const csvRows = [headers.join(',')]

    for (const row of result.rows) {
      const csvRow = [
        row.session_id,
        row.first_name,
        row.last_name,
        row.subtest_name,
        row.age_filter || '',
        row.start_time?.toISOString() || '',
        row.end_time?.toISOString() || '',
        row.completed,
        row.question_id,
        row.student_answer,
        row.correct_answer,
        row.is_correct,
        row.time_spent_seconds || '',
        row.answered_at?.toISOString() || ''
      ]
      csvRows.push(csvRow.map(field => `"${field}"`).join(','))
    }

    const csv = csvRows.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${subtestName}-responses.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}
