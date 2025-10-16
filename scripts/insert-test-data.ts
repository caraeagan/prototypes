import { config } from 'dotenv'
import { resolve } from 'path'
import { query } from '../lib/db'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

async function insertTestData() {
  console.log('🚀 Inserting test data...')

  try {
    // Insert a test student
    const studentResult = await query(
      `INSERT INTO students (session_id, first_name, last_name)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['test-session-123', 'Test', 'Student']
    )
    const studentId = studentResult.rows[0].id
    console.log('✅ Created test student with ID:', studentId)

    // Insert a test session for pattern-reasoning
    const sessionResult = await query(
      `INSERT INTO subtest_sessions (student_id, subtest_name, age_filter, completed)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [studentId, 'pattern-reasoning', '12plus', true]
    )
    const sessionId = sessionResult.rows[0].id
    console.log('✅ Created test session with ID:', sessionId)

    // Insert some test responses
    for (let i = 1; i <= 5; i++) {
      await query(
        `INSERT INTO subtest_responses
         (session_id, question_id, student_answer, correct_answer, is_correct, time_spent_seconds)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, i, 'A', i % 2 === 0 ? 'A' : 'B', i % 2 === 0, Math.floor(Math.random() * 30) + 10]
      )
    }
    console.log('✅ Created 5 test responses')

    console.log('🎉 Test data inserted successfully!')
    console.log('Now refresh your dashboard to see the export button!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error inserting test data:', error)
    process.exit(1)
  }
}

insertTestData()
