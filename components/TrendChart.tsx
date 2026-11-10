'use client'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

type Point = { date: string; value: number; avg7: number }
type Props = { metrics: { id: string; label: string }[]; series: Record<string, Point[]> }

const W = 320
const H = 150
const PAD = { l: 26, r: 8, t: 10, b: 22 }
const TOP: Record<string, number> = { score: 10, productive: 4, focus: 4, worked_out: 1, cannabis: 1 }
const UNIT: Record<string, string> = { sleep_hours: 'h', drinks: '', score: '', productive: '/4', focus: '/4' }

const short = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmt = (v: number, metric: string) => (metric === 'worked_out' ? (v >= 0.5 ? 'Yes' : 'No') : `${Math.round(v * 10) / 10}${UNIT[metric] ?? ''}`)

/**
 * Day-by-day dots (faint) with the 7-day average as the line that carries the story.
 * Hover or tap anywhere on the plot: a crosshair shows that day's value and the average; tap the
 * same day again to open it.
 */
export function TrendChart({ metrics, series }: Props) {
  const router = useRouter()
  const [metric, setMetric] = useState(metrics[0].id)
  const [hover, setHover] = useState<number | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const points = series[metric] ?? []
  const max = TOP[metric] ?? Math.max(1, Math.ceil(Math.max(...points.map((p) => p.value), 1)))
  const plotW = W - PAD.l - PAD.r
  const plotH = H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (points.length < 2 ? plotW / 2 : (i * plotW) / (points.length - 1))
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH
  const ticks = max === 1 ? [0, 1] : [0, Math.round((max / 2) * 10) / 10, max]
  const labelIdx = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : points.map((_, i) => i)

  function nearest(clientX: number) {
    const box = svg.current?.getBoundingClientRect()
    if (!box || !points.length) return null
    const px = ((clientX - box.left) / box.width) * W
    let best = 0
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i })
    return best
  }

  const h = hover !== null ? points[hover] : null

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
        {metrics.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMetric(m.id); setHover(null) }}
            className={`rounded-full border px-2.5 py-1 ${metric === m.id ? 'border-accent bg-accent font-semibold text-on-accent' : 'border-line text-muted'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {points.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nothing recorded for this in the period.</p>
      ) : (
        <>
          <div className="mb-1 flex h-5 items-baseline justify-between text-xs">
            {h ? (
              <>
                <span className="text-muted">{short(h.date)}</span>
                <span className="tabular"><b className="text-ink">{fmt(h.value, metric)}</b><span className="text-muted"> · 7-day avg {fmt(h.avg7, metric)}</span></span>
              </>
            ) : (
              <span className="text-muted">Tap or hover the chart for a day&apos;s numbers</span>
            )}
          </div>
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-pan-y select-none"
            role="img"
            aria-label={`${metrics.find((m) => m.id === metric)?.label} by day with a 7-day average`}
            onPointerMove={(e) => setHover(nearest(e.clientX))}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null) }}
            onClick={(e) => {
              const i = nearest(e.clientX)
              if (i !== null && i === hover) router.push(`/day/${points[i].date}`)
              else setHover(i)
            }}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--text)" strokeOpacity={t === 0 ? 0.18 : 0.08} />
                <text x={PAD.l - 6} y={y(t) + 3} fontSize="9" textAnchor="end" fill="var(--muted)">{max === 1 ? (t ? 'Yes' : 'No') : t}</text>
              </g>
            ))}
            {labelIdx.map((i) => (
              <text key={i} x={x(i)} y={H - 6} fontSize="9" fill="var(--muted)" textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
                {short(points[i].date)}
              </text>
            ))}
            {points.map((p, i) => (
              <circle key={p.date} cx={x(i)} cy={y(p.value)} r={2.4} fill="var(--muted)" fillOpacity={0.45} />
            ))}
            <polyline points={points.map((p, i) => `${x(i)},${y(p.avg7)}`).join(' ')} fill="none" stroke="var(--accent2)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && h && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + plotH} stroke="var(--text)" strokeOpacity="0.25" />
                <circle cx={x(hover)} cy={y(h.value)} r={4.5} fill="var(--text)" stroke="var(--surface)" strokeWidth="2" />
                <circle cx={x(hover)} cy={y(h.avg7)} r={4} fill="var(--accent2)" stroke="var(--surface)" strokeWidth="2" />
              </g>
            )}
          </svg>
          <p className="mt-1 flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-muted/50" />each day</span>
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 rounded bg-accent2" />7-day average</span>
          </p>
        </>
      )}
    </div>
  )
}
