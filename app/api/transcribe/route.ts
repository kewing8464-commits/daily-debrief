import { AiUnavailableError } from '@/lib/ai/provider'
import { defaultTranscriber } from '@/lib/ai/transcribe'
import { getUser } from '@/lib/supabase/server'

const MAX_BYTES = 4 * 1024 * 1024 // Vercel caps request bodies at 4.5MB; 90s of speech is well under this

/** Turn one recorded answer into text. The audio is passed straight to Whisper and never stored. */
export async function POST(req: Request) {
  const { user } = await getUser()
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const form = await req.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: 'No recording received.' }, { status: 400 })
  if (audio.size > MAX_BYTES) return Response.json({ error: 'That recording is too long. Try a shorter answer.' }, { status: 413 })
  const name = audio instanceof File && audio.name ? audio.name : 'answer.webm'
  try {
    const text = await defaultTranscriber()(audio, name)
    return Response.json({ text })
  } catch (err) {
    if (err instanceof AiUnavailableError) return Response.json({ error: "Couldn't turn that into text right now. Try again or switch to Type." }, { status: 503 })
    throw err
  }
}
