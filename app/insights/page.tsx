import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Card } from '@/components/Card'
import { CopyText } from '@/components/CopyText'
import { COPY } from '@/lib/copy'
import { ASK_YOUR_AI, insightsProgress } from '@/lib/insights'
import type { DaySummary } from '@/lib/summary'
import { getUser } from '@/lib/supabase/server'

export default async function InsightsPage() {
  const { supabase, user } = await getUser()
  if (!user) redirect('/login')
  const [{ data: rows }, { data: connector }] = await Promise.all([
    supabase.from('days').select('score, summary').eq('user_id', user.id).eq('status', 'saved'),
    supabase.from('connector_tokens').select('user_id').eq('user_id', user.id).maybeSingle(),
  ])
  const days = (rows ?? []) as { score: number; summary: DaySummary | null }[]
  const progress = insightsProgress(days.length)
  const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '–')
  const sleep = days.map((d) => d.summary?.sleep?.hours).filter((h): h is number => typeof h === 'number')

  return (
    <AppShell active="insights">
      <h1 className="mt-1 mb-4 font-serif text-[1.7rem] lg:text-3xl">Insights</h1>
      {progress.remaining > 0 ? (
        <Card className="mb-3 text-center">
          <p className="text-3xl">🌱</p>
          <p className="mt-1 font-serif text-xl">{COPY.stillLearning(progress.remaining)}</p>
          <p className="mt-1 text-sm text-muted">{days.length} of 14 debriefs. Your recipe for a good day shows up once there&apos;s enough to go on.</p>
          <div className="mt-3 h-2 rounded-full bg-[color-mix(in_srgb,var(--text)_12%,transparent)]">
            <div className="h-2 rounded-full bg-accent2" style={{ width: `${progress.pct}%` }} />
          </div>
        </Card>
      ) : (
        <Card className="mb-3">
          <p className="font-serif text-xl">Your recipe for a good day</p>
          <p className="mt-1 text-sm text-muted">Full patterns are coming soon. For now, the Journal&apos;s &quot;This month&quot; card and your connected AI can dig in.</p>
        </Card>
      )}
      <p className="mb-2 text-xs tracking-wide text-muted">SO FAR</p>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card><p className="font-serif text-2xl">{avg(days.map((d) => d.score))}</p><p className="text-xs text-muted">avg day</p></Card>
        <Card><p className="font-serif text-2xl">{sleep.length ? `${avg(sleep)}h` : '–'}</p><p className="text-xs text-muted">avg sleep</p></Card>
        <Card><p className="font-serif text-2xl">{days.length}</p><p className="text-xs text-muted">debriefs</p></Card>
      </div>
      <p className="mb-2 text-xs tracking-wide text-muted">ASK YOUR AI</p>
      {ASK_YOUR_AI.map((q) => (
        <Card key={q} className="mb-2 flex items-center justify-between gap-3">
          <span>{q}</span>
          <CopyText text={q} />
        </Card>
      ))}
      <p className="mt-2 text-center text-xs text-muted">
        {connector ? 'Paste into Claude or ChatGPT with your Daily Debrief connector on.' : <>Connect your AI first in <Link href="/settings" className="text-accent">You</Link>, then paste these in.</>}
      </p>
    </AppShell>
  )
}
