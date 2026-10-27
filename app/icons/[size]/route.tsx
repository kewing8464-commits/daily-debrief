import { ImageResponse } from 'next/og'
import { DESIGN } from '@/lib/design'

// Placeholder app icon (a moon on charcoal) until a generated logo replaces it.
const SIZES = new Set([180, 192, 512])

export async function GET(_req: Request, ctx: RouteContext<'/icons/[size]'>) {
  const size = Number((await ctx.params).size)
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 })
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: DESIGN.colors.bg }}>
        <div style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', background: DESIGN.colors.accent, boxShadow: `${size * 0.09}px ${-size * 0.05}px 0 0 ${DESIGN.colors.bg} inset` }} />
      </div>
    ),
    { width: size, height: size },
  )
}
