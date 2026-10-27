import { createClient } from '@supabase/supabase-js'
import type { SavedDay } from '@/lib/connector/journal'

/** Where the connector reads a journal from. The real one is Supabase; tests use a fake. */
export type JournalSource = {
  profile(): Promise<{ name: string; timezone: string } | null>
  days(start: string, end: string): Promise<SavedDay[]>
}

/** Reads one person's journal through the connector link's secret. Uses only the public key:
 *  the database functions check the secret and return nothing for an unknown link. */
export function supabaseSource(token: string): JournalSource {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  return {
    async profile() {
      const { data, error } = await db.rpc('connector_profile', { p_token: token })
      if (error) throw new Error(error.message)
      return (data as { name: string; timezone: string }[])[0] ?? null
    },
    async days(start, end) {
      const { data, error } = await db.rpc('connector_days', { p_token: token, p_from: start, p_to: end })
      if (error) throw new Error(error.message)
      return (data as SavedDay[]).filter((d) => d.summary && d.score !== null)
    },
  }
}
