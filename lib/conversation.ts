import { AiUnavailableError, type ChatModel } from '@/lib/ai/provider'
import { SCORE_QUESTION, TOPICS, TOPIC_IDS, type TopicId } from '@/lib/topics'

export type Turn = { role: 'assistant' | 'user'; text: string; topic?: TopicId | 'score' }
export type ConversationState = { turns: Turn[]; covered: TopicId[]; skipped: TopicId[] }
export type NextQuestion = { topic: TopicId | 'score'; text: string; quickReplies?: string[] }

export function startConversation(): ConversationState {
  const first = TOPICS[0]
  return { turns: [{ role: 'assistant', text: first.question, topic: first.id }], covered: [], skipped: [] }
}

/** The first topic not yet covered or skipped, in script order; the score question once all are done. */
export function nextScriptedQuestion(state: ConversationState): NextQuestion {
  const done = new Set<TopicId>([...state.covered, ...state.skipped])
  const topic = TOPICS.find((t) => !done.has(t.id))
  if (!topic) return { topic: 'score', text: SCORE_QUESTION }
  return topic.quickReplies
    ? { topic: topic.id, text: topic.question, quickReplies: topic.quickReplies }
    : { topic: topic.id, text: topic.question }
}

function currentTopic(state: ConversationState): TopicId | undefined {
  const last = [...state.turns].reverse().find((t) => t.role === 'assistant')
  return last?.topic && last.topic !== 'score' ? last.topic : undefined
}

const SYSTEM = `You are a warm, brief interviewer running someone's 5-minute nightly debrief about their day.
You get the conversation so far and the list of topics still to cover, in order.
Reply with JSON only: {"covered": string[], "nextTopic": string, "question": string}
- "covered": ids of every topic the user has already answered anywhere in the conversation, even in passing.
- "nextTopic": the FIRST id in the remaining list that is not in "covered".
- "question": one short question (under 25 words) about nextTopic. You may react to their last answer in a few words first. Casual and friendly. Never ask about a covered topic. No em dashes.`

/**
 * Record the user's answer and work out the next question. The AI decides which
 * topics are covered and phrases the question; if it fails, the script carries on.
 */
export async function nextTurn(
  state: ConversationState,
  answer: string,
  model: ChatModel,
  opts: { skip?: boolean } = {},
): Promise<{ state: ConversationState; next: NextQuestion; usedAi: boolean }> {
  const asked = currentTopic(state)
  const turns: Turn[] = opts.skip ? [...state.turns] : [...state.turns, { role: 'user', text: answer, topic: asked }]
  const covered = new Set(state.covered)
  const skipped = new Set(state.skipped)
  if (asked) (opts.skip ? skipped : covered).add(asked)

  let usedAi = false
  let aiQuestion: { topic?: string; text: string } | undefined
  if (!opts.skip) {
    try {
      const remaining = TOPICS.filter((t) => !covered.has(t.id) && !skipped.has(t.id))
      const raw = await model.complete({
        system: SYSTEM,
        json: true,
        maxTokens: 1000, // reasoning models spend tokens thinking before the JSON
        messages: [{
          role: 'user',
          content: JSON.stringify({
            conversation: turns.map((t) => `${t.role === 'assistant' ? 'Q' : 'A'}: ${t.text}`),
            remaining: remaining.map((t) => ({ id: t.id, about: t.label })),
          }),
        }],
      })
      const parsed = JSON.parse(raw) as { covered?: unknown; nextTopic?: unknown; question?: unknown }
      if (!Array.isArray(parsed.covered) || typeof parsed.question !== 'string' || !parsed.question.trim()) {
        throw new Error('bad shape')
      }
      for (const id of parsed.covered) if (typeof id === 'string' && TOPIC_IDS.has(id)) covered.add(id as TopicId)
      aiQuestion = { topic: typeof parsed.nextTopic === 'string' ? parsed.nextTopic : undefined, text: parsed.question.trim() }
      usedAi = true
    } catch (err) {
      if (!(err instanceof AiUnavailableError) && !(err instanceof SyntaxError) && (err as Error).message !== 'bad shape') throw err
    }
  }

  const nextState: ConversationState = { turns, covered: [...covered], skipped: [...skipped] }
  const scripted = nextScriptedQuestion(nextState)
  // Only use the AI's wording when it is about the topic the script says comes next.
  const useAiText = usedAi && scripted.topic !== 'score' && (!aiQuestion!.topic || aiQuestion!.topic === scripted.topic)
  const next: NextQuestion = useAiText ? { ...scripted, text: aiQuestion!.text } : scripted
  if (!useAiText) usedAi = false
  nextState.turns = [...turns, { role: 'assistant', text: next.text, topic: next.topic }]
  return { state: nextState, next, usedAi }
}
