// One small interface for every AI call, so the provider can be swapped
// (Groq today; anything OpenAI-compatible tomorrow).

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export interface ChatModel {
  complete(input: { system: string; messages: ChatMessage[]; json?: boolean; maxTokens?: number }): Promise<string>
}

/** The AI could not answer (no key, network, timeout, rate limit, server error). Callers fall back. */
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiUnavailableError'
  }
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export function groqModel(apiKey: string, model: string, fetchFn: typeof fetch = fetch, timeoutMs = 15_000): ChatModel {
  return {
    async complete({ system, messages, json, maxTokens = 600 }) {
      if (!apiKey) throw new AiUnavailableError('No GROQ_API_KEY configured')
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      let res: Response
      try {
        res = await fetchFn(GROQ_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            max_tokens: maxTokens,
            messages: [{ role: 'system', content: system }, ...messages],
            ...(json ? { response_format: { type: 'json_object' } } : {}),
          }),
        })
      } catch (err) {
        throw new AiUnavailableError(`AI request failed: ${(err as Error).name}`)
      } finally {
        clearTimeout(timer)
      }
      if (!res.ok) throw new AiUnavailableError(`AI returned ${res.status}`)
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content
      if (typeof content !== 'string') throw new AiUnavailableError('AI returned no content')
      return content
    },
  }
}

/** The app's configured model, from environment variables (server only). */
export function defaultModel(): ChatModel {
  return groqModel(process.env.GROQ_API_KEY ?? '', process.env.GROQ_MODEL ?? '')
}
