import { AI_VOICE, COPY, streakLabel } from '@/lib/copy'
import { CONVERSATION_SYSTEM } from '@/lib/conversation'
import { SCORE_QUESTION } from '@/lib/topics'

test('the new voice', () => {
  expect(SCORE_QUESTION).toBe("How'd today hit? 1 to 10")
  expect(COPY.saved).toBe('Locked in ✓')
  expect(COPY.wrapped).toBe("That's a wrap 🌙")
  expect(COPY.emptyDay).toBe('Nothing here. Quiet day?')
  expect(COPY.stillLearning(5)).toBe('Still learning you. 5 more days.')
  expect(COPY.stillLearning(1)).toBe('Still learning you. 1 more day.')
  expect(COPY.firstDebrief('9:30 pm')).toBe('Your first vibe check is tonight at 9:30 pm.')
})

test('streak labels never guilt', () => {
  expect(streakLabel(0)).toBeNull()
  expect(streakLabel(1)).toBe('🔥 1 day')
  expect(streakLabel(7)).toBe('🔥 7 days straight')
})

test('the AI talks in the chill-friend voice', () => {
  expect(CONVERSATION_SYSTEM).toContain(AI_VOICE)
  expect(AI_VOICE).toMatch(/swear/i)
})
