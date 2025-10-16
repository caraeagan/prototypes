import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      subtestSessionId,
      questionId,
      studentAnswer,
      correctAnswer,
      timeSpentSeconds
    } = body

    const isCorrect = studentAnswer === correctAnswer

    await query(
      `INSERT INTO subtest_responses
       (session_id, question_id, student_answer, correct_answer, is_correct, time_spent_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [subtestSessionId, questionId, studentAnswer, correctAnswer, isCorrect, timeSpentSeconds]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving subtest response:', error)
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    )
  }
}
