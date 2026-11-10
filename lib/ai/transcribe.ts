import { AiUnavailableError } from '@/lib/ai/provider'
import { cleanTranscript } from '@/lib/voice'

const GROQ_AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

export type Transcriber = (audio: Blob, filename: string) => Promise<string>

/** Speech to text with Groq's free Whisper. Failures throw AiUnavailableError so the app falls back to typing. */
export function groqTranscriber(apiKey: string, fetchFn: typeof fetch = fetch, timeoutMs = 30_000): Transcriber {
  return async (audio, filename) => {
    if (!apiKey) throw new AiUnavailableError('No GROQ_API_KEY configured')
    const form = new FormData()
    form.append('file', audio, filename)
    form.append('model', 'whisper-large-v3-turbo')
    form.append('language', 'en')
    form.append('response_format', 'json')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let res: Response
    try {
      res = await fetchFn(GROQ_AUDIO_URL, { method: 'POST', signal: controller.signal, headers: { authorization: `Bearer ${apiKey}` }, body: form })
    } catch (err) {
      throw new AiUnavailableError(`Transcription failed: ${(err as Error).name}`)
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) throw new AiUnavailableError(`Transcription returned ${res.status}`)
    const data = (await res.json()) as { text?: string }
    return cleanTranscript(data.text ?? '')
  }
}

export const defaultTranscriber = () => groqTranscriber(process.env.GROQ_API_KEY ?? '')
