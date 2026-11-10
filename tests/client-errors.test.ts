import { isStaleBuildError, shouldAutoReload } from '@/lib/client-errors'

test('recognises errors from a tab that is older than the latest deploy', () => {
  expect(isStaleBuildError({ name: 'ChunkLoadError', message: 'Loading chunk 123 failed.' })).toBe(true)
  expect(isStaleBuildError({ name: 'TypeError', message: 'Failed to fetch dynamically imported module: /_next/static/chunks/x.js' })).toBe(true)
  expect(isStaleBuildError({ name: 'Error', message: 'Loading CSS chunk 7 failed' })).toBe(true)
  expect(isStaleBuildError({ name: 'TypeError', message: "Cannot read properties of undefined (reading 'topic')" })).toBe(false)
  expect(isStaleBuildError(null)).toBe(false)
})

test('reloads at most once a minute, so a real bug never loops', () => {
  expect(shouldAutoReload(null, 100_000)).toBe(true)
  expect(shouldAutoReload(80_000, 100_000)).toBe(false)
  expect(shouldAutoReload(30_000, 100_000)).toBe(true)
})
