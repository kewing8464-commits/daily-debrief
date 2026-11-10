'use client'
import { useCallback, useEffect, useState } from 'react'

const KEY = 'dd.voiceOn'

/** Reads the AI's questions out loud with the phone's built-in voice. Mute is remembered. */
export function useSpeaker() {
  const [on, setOn] = useState(true)

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved choice after mount
      if (localStorage.getItem(KEY) === 'off') setOn(false)
    } catch {}
    return () => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel() }
  }, [])

  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v
      try { localStorage.setItem(KEY, next ? 'on' : 'off') } catch {}
      if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel()
      return next
    })
  }, [])

  const speak = useCallback((text: string) => {
    if (!on || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const voice = synth.getVoices().find((v) => v.lang.startsWith('en') && /samantha|aaron|natural|google us/i.test(v.name)) ?? synth.getVoices().find((v) => v.lang.startsWith('en'))
    if (voice) u.voice = voice
    u.rate = 1.02
    synth.speak(u)
  }, [on])

  return { on, toggle, speak }
}
