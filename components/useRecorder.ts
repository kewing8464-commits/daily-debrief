'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { extensionFor, MAX_ANSWER_SECONDS, nextSilence, pickMimeType, SILENCE } from '@/lib/voice'

export type RecorderStatus = 'idle' | 'recording' | 'transcribing'
export type RecorderError = 'denied' | 'unsupported' | 'failed' | 'empty' | null

const BARS = 26

/**
 * Record one spoken answer and turn it into text. Tap start, tap stop (or it stops itself after
 * about 2 seconds of quiet). `levels` drives the waveform while recording.
 */
export function useRecorder(onText: (text: string) => void) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<RecorderError>(null)
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0))
  const rec = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const ctx = useRef<AudioContext | null>(null)
  const raf = useRef(0)
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTextRef = useRef(onText)
  useEffect(() => { onTextRef.current = onText }, [onText])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(raf.current)
    if (limit.current) clearTimeout(limit.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    ctx.current?.close().catch(() => {})
    stream.current = null
    ctx.current = null
    setLevels(Array(BARS).fill(0))
  }, [])

  useEffect(() => () => {
    if (rec.current?.state === 'recording') rec.current.stop()
    cleanup()
  }, [cleanup])

  const stop = useCallback(() => {
    if (rec.current?.state === 'recording') rec.current.stop()
  }, [])

  const start = useCallback(async () => {
    if (status !== 'idle') return
    setError(null)
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('unsupported')
      return
    }
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch (err) {
      setError((err as Error).name === 'NotAllowedError' ? 'denied' : 'failed')
      return
    }
    stream.current = media
    const mime = pickMimeType((t) => MediaRecorder.isTypeSupported(t))
    const recorder = new MediaRecorder(media, mime ? { mimeType: mime } : undefined)
    rec.current = recorder
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    recorder.onstop = async () => {
      cleanup()
      const type = recorder.mimeType || mime || 'audio/webm'
      const blob = new Blob(chunks, { type })
      if (blob.size < 1000) { setStatus('idle'); setError('empty'); return }
      setStatus('transcribing')
      try {
        const form = new FormData()
        form.append('audio', blob, `answer.${extensionFor(type)}`)
        const res = await fetch('/api/transcribe', { method: 'POST', body: form })
        if (!res.ok) throw new Error(`transcribe ${res.status}`)
        const { text } = (await res.json()) as { text: string }
        if (!text) setError('empty')
        else onTextRef.current(text)
      } catch {
        setError('failed')
      }
      setStatus('idle')
    }

    // Levels for the waveform, and auto-stop after about 2 seconds of quiet.
    const audioCtx = new AudioContext()
    ctx.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1024
    audioCtx.createMediaStreamSource(media).connect(analyser)
    const buf = new Float32Array(analyser.fftSize)
    let silence = SILENCE.start()
    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += v * v
      const rms = Math.sqrt(sum / buf.length)
      setLevels((l) => [...l.slice(1), Math.min(1, rms * 6)])
      const r = nextSilence(silence, rms, performance.now())
      silence = r.state
      if (r.stop) { stop(); return }
      raf.current = requestAnimationFrame(tick)
    }
    recorder.start()
    setStatus('recording')
    raf.current = requestAnimationFrame(tick)
    limit.current = setTimeout(stop, MAX_ANSWER_SECONDS * 1000)
  }, [status, cleanup, stop])

  return { status, error, levels, start, stop, clearError: () => setError(null) }
}

export const RECORDER_MESSAGES: Record<Exclude<RecorderError, null>, string> = {
  denied: 'The microphone is blocked. On iPhone: Settings › Safari › Microphone › Allow (or Settings › Daily Debrief). Switching to Type for now.',
  unsupported: "This browser can't record audio. Switch to Type, or use the mic on your keyboard.",
  failed: "Couldn't turn that into text. Try again, or switch to Type.",
  empty: "Didn't catch that. Tap the mic and try again.",
}
