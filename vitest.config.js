import os from 'os'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Two test projects:
// - api: the server. Unit tests for its helpers, and integration tests that
//   run the real Express app against a real, throwaway Postgres database.
// - web: the React app's helpers and components, in a simulated browser
//   (jsdom). No database.
// `npm test` runs both; `npm run test:api` / `npm run test:web` run one.

// The api project wipes its database before every run, so refuse to start
// unless it is clearly a local test database.
const DATABASE_URL = process.env.TEST_DATABASE_URL
  || `postgres://${os.userInfo().username}@127.0.0.1:5432/voidaj_test`

const { hostname, pathname } = new URL(DATABASE_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname) || !pathname.endsWith('_test')) {
  throw new Error(`Refusing to run tests against ${hostname}${pathname}: the test database must be local and its name must end in _test.`)
}

export default defineConfig({
  test: {
    // The api files share one database, so files run one at a time.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['server/**/*.js', 'src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/main.jsx'],
      reporter: ['text-summary', 'html', 'json-summary'],
      // The server is well covered (about 84% of lines); keep it that way.
      // The React pages are mostly untested so far, so they have no floor yet.
      thresholds: { 'server/**/*.js': { lines: 80 } },
    },
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['test/**/*.test.js'],
          globalSetup: ['test/global-setup.js'],
          setupFiles: ['test/setup.js'],
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
      },
      {
        plugins: [react()],
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['src/**/*.test.{js,jsx}'],
          setupFiles: ['src/test/setup.js'],
        },
      },
    ],
  },
})
