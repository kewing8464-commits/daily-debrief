// Talk mode helpers. The browser records an answer, Groq Whisper turns it into text.

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']

/** The first recording format the browser supports. iPhone Safari records audio/mp4. '' means "browser default". */
export function pickMimeType(isSupported: (type: string) => boolean): string {
  return MIME_TYPES.find((t) => isSupported(t)) ?? ''
}

export function extensionFor(mime: string): string {
  if (mime.startsWith('audio/mp4')) return 'm4a'
  if (mime.startsWith('audio/ogg')) return 'ogg'
  return 'webm'
}

/** Longest single answer we record, in seconds (keeps uploads small and free limits safe). */
export const MAX_ANSWER_SECONDS = 90

type SilenceState = { firstLoud: number | null; lastLoud: number | null }

export const SILENCE = {
  threshold: 0.04, // RMS level that counts as speaking
  quietMs: 2000, // stop after this much quiet...
  minSpeechMs: 300, // ...once they've actually said something
  start: (): SilenceState => ({ firstLoud: null, lastLoud: null }),
}

/** Feed one audio level reading; says when the answer is over (about 2s of quiet after some speech). */
export function nextSilence(state: SilenceState, rms: number, now: number): { state: SilenceState; stop: boolean } {
  const s = rms > SILENCE.threshold ? { firstLoud: state.firstLoud ?? now, lastLoud: now } : state
  const spoke = s.firstLoud !== null && s.lastLoud !== null && s.lastLoud - s.firstLoud >= SILENCE.minSpeechMs
  return { state: s, stop: spoke && now - s.lastLoud! >= SILENCE.quietMs }
}

// Whisper sometimes "hears" these in near-silence. Alone, they mean nothing was said.
const PHANTOMS = new Set(['thank you', 'thanks for watching', 'you', 'bye', 'thank you for watching', '.'])

export function cleanTranscript(text: string): string {
  const t = text.trim()
  const bare = t.toLowerCase().replace(/[.!?,\s]+$/g, '').replace(/^[.!?,\s]+/g, '')
  return PHANTOMS.has(bare) || !bare ? '' : t
}
