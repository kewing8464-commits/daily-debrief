import { z } from 'zod'

const Body = z.object({
  name: z.string().max(100),
  message: z.string().max(500),
  stack: z.string().max(1500).optional(),
  digest: z.string().max(100).optional(),
  path: z.string().max(200),
})

/** Browser-side crashes land in the server log (Vercel), so they can be found and fixed. No personal data is sent. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null))
  if (body.success) console.error('[client-error]', JSON.stringify(body.data))
  return new Response(null, { status: 204 })
}
