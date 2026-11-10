import { AiUnavailableError } from '@/lib/ai/provider'
import { groqTranscriber } from '@/lib/ai/transcribe'
import { cleanTranscript, extensionFor, nextSilence, pickMimeType, SILENCE } from '@/lib/voice'

test('recording format: the first one the browser supports (iPhone records mp4)', () => {
  expect(pickMimeType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus')
  expect(pickMimeType((t) => t === 'audio/mp4')).toBe('audio/mp4')
  expect(pickMimeType(() => false)).toBe('')
  expect(extensionFor('audio/webm;codecs=opus')).toBe('webm')
  expect(extensionFor('audio/mp4')).toBe('m4a')
  expect(extensionFor('')).toBe('webm')
})

test('auto-stop: about 2 seconds of quiet after some speech', () => {
  let s = SILENCE.start()
  let r = nextSilence(s, 0.001, 500) // quiet before speaking: keep listening
  expect(r.stop).toBe(false)
  r = nextSilence(r.state, 0.2, 800) // speaking
  r = nextSilence(r.state, 0.2, 1500)
  r = nextSilence(r.state, 0.001, 1600) // quiet starts
  expect(nextSilence(r.state, 0.001, 3000).stop).toBe(false)
  expect(nextSilence(r.state, 0.001, 3700).stop).toBe(true)
  s = SILENCE.start()
  expect(nextSilence(s, 0.001, 9000).stop).toBe(false) // never spoke: don't cut off someone gathering thoughts
})

test('whisper silence hallucinations become empty, real words are kept', () => {
  expect(cleanTranscript('  Thank you.  ')).toBe('')
  expect(cleanTranscript('you')).toBe('')
  expect(cleanTranscript(' Went to the gym, then work. ')).toBe('Went to the gym, then work.')
})

test('transcriber sends audio to Groq whisper and returns text', async () => {
  let seen: { url: string; model: string | null; auth: string | null } | null = null
  const fakeFetch = (async (url: string, init: RequestInit) => {
    const form = init.body as FormData
    seen = { url, model: form.get('model') as string, auth: (init.headers as Record<string, string>).authorization }
    return new Response(JSON.stringify({ text: ' Hello there ' }), { status: 200 })
  }) as unknown as typeof fetch
  const t = groqTranscriber('key123', fakeFetch)
  expect(await t(new Blob(['abc'], { type: 'audio/mp4' }), 'answer.m4a')).toBe('Hello there')
  expect(seen).toEqual({ url: 'https://api.groq.com/openai/v1/audio/transcriptions', model: 'whisper-large-v3-turbo', auth: 'Bearer key123' })
})

test('transcriber failures are AiUnavailableError so the app can fall back to typing', async () => {
  const bad = (async () => new Response('nope', { status: 429 })) as unknown as typeof fetch
  await expect(groqTranscriber('k', bad)(new Blob(['a']), 'a.webm')).rejects.toBeInstanceOf(AiUnavailableError)
  await expect(groqTranscriber('', bad)(new Blob(['a']), 'a.webm')).rejects.toBeInstanceOf(AiUnavailableError)
})
