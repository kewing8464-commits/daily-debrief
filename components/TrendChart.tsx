'use client'
import Link from 'next/link'
import { useState } from 'react'
import { scoreColor } from '@/lib/design'

type Point = { date: string; value: number; avg7: number }
type Props = { metrics: { id: string; label: string }[]; series: Record<string, Point[]> }

const W = 300
const H = 110
const TOP: Record<string, number> = { score: 10, productive: 4, focus: 4, worked_out: 1, cannabis: 1 }

/** Day-by-day dots plus a 7-day average line. Tap a dot to open that day. */
export function TrendChart({ metrics, series }: Props) {
  const [metric, setMetric] = useState(metrics[0].id)
  const points = series[metric] ?? []
  const hi = TOP[metric] ?? Math.max(1, ...points.map((p) => p.value))
  const x = (i: number) => (points.length < 2 ? W / 2 : 6 + (i * (W - 12)) / (points.length - 1))
  const y = (v: number) => H - 6 - (v / hi) * (H - 12)
  const values = points.map((p) => p.value)
  const avg = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null

  return (
    <div>
      <div className="-mx-1 mb-2 flex flex-wrap gap-1.5 text-xs">
        {metrics.map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            className={`rounded-full border px-2.5 py-1 ${metric === m.id ? 'border-accent bg-accent font-bold text-on-accent' : 'border-line'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {points.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nothing recorded for this in the period.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trend chart">
            <polyline points={points.map((p, i) => `${x(i)},${y(p.avg7)}`).join(' ')} fill="none" stroke="var(--accent2)" strokeWidth="2.5" strokeLinejoin="round" />
            {points.map((p, i) => (
              <Link key={p.date} href={`/day/${p.date}`}>
                <circle cx={x(i)} cy={y(p.value)} r="3.5" fill={metric === 'score' ? scoreColor(p.value) : 'var(--accent)'} opacity="0.9">
                  <title>{`${p.date}: ${p.value}`}</title>
                </circle>
              </Link>
            ))}
          </svg>
          <p className="mt-1 text-[11px] text-muted">
            dots = each day · green line = 7-day average · avg {avg} · low {Math.min(...values)} · high {Math.max(...values)}
          </p>
        </>
      )}
    </div>
  )
}
