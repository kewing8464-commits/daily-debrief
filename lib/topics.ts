// Karson's nightly questions, in the order a conversation naturally walks
// through a day. The AI rephrases them and skips what's already been said.

export type TopicId =
  | 'morning' | 'sleep' | 'did' | 'food' | 'meetings' | 'workout'
  | 'fun' | 'happy' | 'annoyed' | 'beers' | 'weed' | 'standout'

export type Topic = { id: TopicId; label: string; question: string; quickReplies?: string[] }

export const TOPICS: Topic[] = [
  { id: 'morning', label: 'how the day started', question: 'How did you start your day?' },
  { id: 'sleep', label: 'when they fell asleep and woke up', question: 'When did you fall asleep last night, and when did you wake up?' },
  { id: 'did', label: 'what they did today', question: 'What did you get up to today?' },
  { id: 'food', label: 'what they ate through the day', question: 'What did you eat throughout the day?' },
  { id: 'meetings', label: 'work meetings', question: 'Any work meetings today? How did they go?' },
  { id: 'workout', label: 'workout and what they did', question: 'Did you work out? What did you do?' },
  { id: 'fun', label: 'anything fun', question: 'Did you do anything fun?' },
  { id: 'happy', label: 'what made them happy', question: 'What made you happy today?' },
  { id: 'annoyed', label: 'what annoyed them', question: 'Anything piss you off today?' },
  { id: 'beers', label: 'beers', question: 'Any beers today?', quickReplies: ['None', '1-2', '3-4', '5+'] },
  { id: 'weed', label: 'weed', question: 'Any weed today?', quickReplies: ['No', 'A little', 'Yes'] },
  { id: 'standout', label: 'anything standout or cool', question: 'Anything stand out, or anything cool happen?' },
]

export const SCORE_QUESTION = "How'd today hit? 1 to 10"

export const TOPIC_IDS = new Set<string>(TOPICS.map((t) => t.id))

/** How many of the 12 progress segments to fill: each topic covered or skipped counts once. */
export function progressFilled(covered: string[], skipped: string[]): number {
  return Math.min(TOPICS.length, new Set([...covered, ...skipped].filter((id) => TOPIC_IDS.has(id))).size)
}
