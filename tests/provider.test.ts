import { AiUnavailableError, groqModel } from '@/lib/ai/provider'

const msgs = { system: 's', messages: [{ role: 'user' as const, content: 'hi' }] }

test('200 returns the first choice content', async () => {
  const fetchFn = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'hello' } }] }), { status: 200 })
  expect(await groqModel('k', 'm', fetchFn as typeof fetch).complete(msgs)).toBe('hello')
})

test('sends JSON mode and the bearer key', async () => {
  let seen: { headers: Headers; body: Record<string, unknown> } | undefined
  const fetchFn = async (_url: string, init: RequestInit) => {
    seen = { headers: new Headers(init.headers), body: JSON.parse(String(init.body)) }
    return new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 })
  }
  await groqModel('secret', 'model-x', fetchFn as unknown as typeof fetch).complete({ ...msgs, json: true })
  expect(seen!.headers.get('authorization')).toBe('Bearer secret')
  expect(seen!.body.model).toBe('model-x')
  expect(seen!.body.response_format).toEqual({ type: 'json_object' })
})

test('429 throws AiUnavailableError', async () => {
  const fetchFn = async () => new Response('rate limited', { status: 429 })
  await expect(groqModel('k', 'm', fetchFn as typeof fetch).complete(msgs)).rejects.toBeInstanceOf(AiUnavailableError)
})

test('500 throws AiUnavailableError', async () => {
  const fetchFn = async () => new Response('oops', { status: 500 })
  await expect(groqModel('k', 'm', fetchFn as typeof fetch).complete(msgs)).rejects.toBeInstanceOf(AiUnavailableError)
})

test('network failure throws AiUnavailableError', async () => {
  const fetchFn = async () => { throw new TypeError('fetch failed') }
  await expect(groqModel('k', 'm', fetchFn as typeof fetch).complete(msgs)).rejects.toBeInstanceOf(AiUnavailableError)
})

test('timeout throws AiUnavailableError', async () => {
  const fetchFn = (_u: string, init: RequestInit) =>
    new Promise<Response>((_res, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
  await expect(groqModel('k', 'm', fetchFn as unknown as typeof fetch, 20).complete(msgs)).rejects.toBeInstanceOf(AiUnavailableError)
})

test('missing key throws AiUnavailableError', async () => {
  await expect(groqModel('', 'm').complete(msgs)).rejects.toBeInstanceOf(AiUnavailableError)
})
