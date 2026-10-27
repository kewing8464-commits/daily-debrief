import { AiUnavailableError, type ChatModel } from '@/lib/ai/provider'
import { nextScriptedQuestion, nextTurn, startConversation, type ConversationState } from '@/lib/conversation'
import { TOPICS } from '@/lib/topics'

const model = (reply: string | Error): ChatModel => ({
  complete: async () => {
    if (reply instanceof Error) throw reply
    return reply
  },
})

function afterFirstQuestion(): ConversationState {
  return startConversation()
}

test('a new conversation opens with the first topic', () => {
  const s = startConversation()
  expect(s.turns).toEqual([{ role: 'assistant', text: TOPICS[0].question, topic: TOPICS[0].id }])
})

test('the model can mark several topics covered and phrase the next question', async () => {
  const reply = JSON.stringify({ covered: ['morning', 'workout', 'food'], question: 'Nice. When did you fall asleep last night?' })
  const r = await nextTurn(afterFirstQuestion(), 'gym then a chicken bowl', model(reply))
  expect(r.usedAi).toBe(true)
  expect(r.state.covered).toEqual(expect.arrayContaining(['morning', 'workout', 'food']))
  expect(r.next.topic).toBe('sleep')
  expect(r.next.text).toBe('Nice. When did you fall asleep last night?')
  expect(r.state.turns.at(-2)).toEqual({ role: 'user', text: 'gym then a chicken bowl', topic: 'morning' })
  expect(r.state.turns.at(-1)).toMatchObject({ role: 'assistant', topic: 'sleep' })
})

test('an unavailable model falls back to the next scripted topic', async () => {
  const r = await nextTurn(afterFirstQuestion(), 'coffee and emails', model(new AiUnavailableError('429')))
  expect(r.usedAi).toBe(false)
  expect(r.state.covered).toEqual(['morning'])
  expect(r.next).toEqual(nextScriptedQuestion(r.state))
  expect(r.next.topic).toBe(TOPICS[1].id)
})

test('junk from the model falls back the same way', async () => {
  const r = await nextTurn(afterFirstQuestion(), 'coffee', model('sure! here you go'))
  expect(r.usedAi).toBe(false)
  expect(r.state.covered).toEqual(['morning'])
})

test('unknown topic ids from the model are ignored', async () => {
  const reply = JSON.stringify({ covered: ['morning', 'astrology'], question: 'When did you fall asleep?' })
  const r = await nextTurn(afterFirstQuestion(), 'coffee', model(reply))
  expect(r.state.covered).toEqual(['morning'])
})

test('the topic just asked is always marked covered even if the model forgets it', async () => {
  const reply = JSON.stringify({ covered: [], question: 'When did you fall asleep?' })
  const r = await nextTurn(afterFirstQuestion(), 'coffee', model(reply))
  expect(r.state.covered).toContain('morning')
})

test('when every topic is covered or skipped the next question is the score', () => {
  const ids = TOPICS.map((t) => t.id)
  const s: ConversationState = { turns: [], covered: ids.slice(0, 6), skipped: ids.slice(6) }
  expect(nextScriptedQuestion(s)).toEqual({ topic: 'score', text: 'How would you rate today, 1 to 10?' })
})

test('skipping moves on without covering', async () => {
  const r = await nextTurn(afterFirstQuestion(), '', model(new AiUnavailableError('x')), { skip: true })
  expect(r.state.skipped).toEqual(['morning'])
  expect(r.state.covered).toEqual([])
  expect(r.next.topic).toBe(TOPICS[1].id)
})

test('the model cannot pick a question for a topic that is already done', async () => {
  // Model claims everything but "standout" is covered: the next question must be about standout.
  const all = TOPICS.map((t) => t.id).filter((id) => id !== 'standout')
  const reply = JSON.stringify({ covered: all, question: 'Anything stand out today?' })
  const r = await nextTurn(afterFirstQuestion(), 'long answer covering everything', model(reply))
  expect(r.next.topic).toBe('standout')
})

test('quick replies come from the topic list', () => {
  const s: ConversationState = { turns: [], covered: TOPICS.slice(0, 9).map((t) => t.id), skipped: [] }
  const q = nextScriptedQuestion(s)
  expect(q.topic).toBe('beers')
  expect(q.quickReplies).toEqual(['None', '1-2', '3-4', '5+'])
})
