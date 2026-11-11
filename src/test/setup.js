// Shared setup for the web tests: DOM matchers like toBeInTheDocument(),
// a clean DOM and storage between tests, and fetch restored after mocks.
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})
