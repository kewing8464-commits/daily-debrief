import { hashToken, newConnectorToken } from '@/lib/connector/token'

test('hashToken is lowercase hex sha256, matching Postgres digest', () => {
  expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('newConnectorToken is 43 url-safe characters and never repeats', () => {
  const a = newConnectorToken()
  const b = newConnectorToken()
  expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(a).not.toBe(b)
})
