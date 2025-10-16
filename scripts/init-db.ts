import { config } from 'dotenv'
import { resolve } from 'path'
import { query } from '../lib/db'

// Load environment variables from .vercel/.env.development.local
config({ path: resolve(__dirname, '../.vercel/.env.development.local') })

async function initializeDatabase() {
  console.log('🚀 Initializing database schema...')

  try {
    // Create students table
    await query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('✅ Created students table')

    // Create subtest_sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS subtest_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        subtest_name TEXT NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        age_filter TEXT,
        completed BOOLEAN DEFAULT false,
        CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES students(id)
      );
    `)
    console.log('✅ Created subtest_sessions table')

    // Create subtest_responses table
    await query(`
      CREATE TABLE IF NOT EXISTS subtest_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES subtest_sessions(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL,
        student_answer TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        time_spent_seconds INTEGER,
        answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES subtest_sessions(id)
      );
    `)
    console.log('✅ Created subtest_responses table')

    // Create indexes for better query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_students_session_id ON students(session_id);
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_subtest_sessions_student_id ON subtest_sessions(student_id);
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_subtest_sessions_subtest_name ON subtest_sessions(subtest_name);
    `)
    await query(`
      CREATE INDEX IF NOT EXISTS idx_subtest_responses_session_id ON subtest_responses(session_id);
    `)
    console.log('✅ Created indexes')

    console.log('🎉 Database initialization complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

initializeDatabase()
