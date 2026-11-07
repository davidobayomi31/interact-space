import { afterAll } from 'vitest'
import { pool } from '../server/db.js'

// Each test file gets its own copy of the app and its connection pool.
afterAll(async () => {
  await pool.end()
})
