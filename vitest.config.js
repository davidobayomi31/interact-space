import os from 'os'
import { defineConfig } from 'vitest/config'

// Integration tests run the real Express app against a real, throwaway
// Postgres database. They wipe that database before every run, so refuse to
// start unless it is clearly a local test database.
const DATABASE_URL = process.env.TEST_DATABASE_URL
  || `postgres://${os.userInfo().username}@127.0.0.1:5432/voidaj_test`

const { hostname, pathname } = new URL(DATABASE_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname) || !pathname.endsWith('_test')) {
  throw new Error(`Refusing to run tests against ${hostname}${pathname}: the test database must be local and its name must end in _test.`)
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    globalSetup: ['test/global-setup.js'],
    setupFiles: ['test/setup.js'],
    // Every file shares one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL,
      JWT_SECRET: 'test-secret-that-is-long-enough-to-sign-tokens',
      // Keep tests offline and deterministic: no real LLM, no cloud storage.
      ANTHROPIC_API_KEY: '',
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    },
  },
})
