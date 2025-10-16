import { config } from 'dotenv'
import { resolve } from 'path'
import { query } from '../lib/db'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

async function clearTestData() {
  console.log('🗑️  Clearing all test data...')

  try {
    // Delete all responses first (foreign key constraint)
    const responsesResult = await query('DELETE FROM subtest_responses RETURNING id')
    console.log(`✅ Deleted ${responsesResult.rows.length} responses`)

    // Delete all sessions
    const sessionsResult = await query('DELETE FROM subtest_sessions RETURNING id')
    console.log(`✅ Deleted ${sessionsResult.rows.length} sessions`)

    // Delete all students
    const studentsResult = await query('DELETE FROM students RETURNING id')
    console.log(`✅ Deleted ${studentsResult.rows.length} students`)

    console.log('🎉 All test data cleared successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error clearing test data:', error)
    process.exit(1)
  }
}

clearTestData()
