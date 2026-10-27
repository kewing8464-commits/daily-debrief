/**
 * Fills an account with a month of made-up debriefs so the calendar, reports and the
 * AI connector have something to show. Never touches days that already exist.
 * Seeded days carry summary.seed = true so they can be removed later.
 *
 * Seed:   npx tsx --env-file=.env.local scripts/seed-sample.ts you@example.com 2026-10-01 2026-10-26
 * Remove: npx tsx --env-file=.env.local scripts/seed-sample.ts you@example.com --remove
 */
import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

// Small seeded random so the same command always makes the same month.
let seed = 42
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]

type Kind = 'great' | 'good' | 'meh' | 'rough'

const WORKOUTS = [
  { type: 'lift, push day', minutes: 60 }, { type: 'lift, legs', minutes: 55 }, { type: 'run, 3 miles', minutes: 30 },
  { type: 'lift, pull day', minutes: 50 }, { type: 'hike', minutes: 90 },
]
const GOOD_FOOD = [
  [{ item: 'eggs and toast', amount: '3 eggs' }, { item: 'chicken and rice bowl' }, { item: 'steak and potatoes', amount: '8 oz steak' }],
  [{ item: 'oatmeal with banana' }, { item: 'turkey sandwich' }, { item: 'salmon and veggies' }],
  [{ item: 'protein shake' }, { item: 'burrito bowl' }, { item: 'elk burger', amount: '2 patties' }],
]
const BAD_FOOD = [
  [{ item: 'gas station breakfast burrito' }, { item: 'skipped lunch' }, { item: 'pizza', amount: '4 slices' }],
  [{ item: 'coffee only' }, { item: 'fast food burger and fries' }, { item: 'chips' }],
  [{ item: 'donut' }, { item: 'leftover pizza' }, { item: 'wings', amount: '12' }],
]

const STORIES: Record<Kind, { did: string; fun?: string; happy: string; annoyed?: string; standout?: string; tags: string[]; people: { name: string; feeling: 'positive' | 'negative' | 'neutral' }[]; work: { meetings: number; good?: string; bad?: string } }[]> = {
  great: [
    { did: 'Showed a ranch property in the morning, then went elk hunting with Jake in the afternoon.', fun: 'Glassing for elk with Jake at last light', happy: 'Saw a big bull at first light and just watched it', standout: 'Bull elk at 40 yards', tags: ['hunting', 'outdoors', 'friends'], people: [{ name: 'Jake', feeling: 'positive' }], work: { meetings: 1, good: 'Showing went great, buyers loved the creek' } },
    { did: 'Got a lot done on SteedChain, then rode horses with family.', fun: 'Riding with my sister', happy: 'Family time on the horses', standout: 'Sunset ride', tags: ['family', 'horses', 'steedchain', 'outdoors'], people: [{ name: 'Mom', feeling: 'positive' }, { name: 'Kenzie', feeling: 'positive' }], work: { meetings: 2, good: 'Dev partner finished the scanning fix' } },
    { did: 'Morning gym, closed out paperwork on a listing, fished the river after.', fun: 'Fishing the North Platte', happy: 'Caught a couple nice browns', tags: ['fishing', 'outdoors', 'real estate'], people: [{ name: 'Jake', feeling: 'positive' }], work: { meetings: 1, good: 'Listing paperwork signed' } },
  ],
  good: [
    { did: 'Class in the morning, worked on the BI project, gym in the evening.', happy: 'Finished the class project early', tags: ['school', 'gym'], people: [{ name: 'Tyler', feeling: 'positive' }], work: { meetings: 1, good: 'Productive study group' } },
    { did: 'Called leads all morning, lunch with Galen about the move to Stoneland.', happy: 'Good talk with Galen about the new brokerage', tags: ['real estate', 'work'], people: [{ name: 'Galen', feeling: 'positive' }], work: { meetings: 2, good: 'Lunch with Galen', bad: 'Two leads ghosted' } },
    { did: 'Worked on the CRM in the morning and helped Dad fix fence in the afternoon.', happy: 'Getting the fence done with Dad', tags: ['family', 'ranch work', 'work'], people: [{ name: 'Dad', feeling: 'positive' }], work: { meetings: 1, good: 'CRM leads page works' } },
  ],
  meh: [
    { did: 'Lots of computer work, catching up on emails and listings.', happy: 'Got my inbox to zero', annoyed: 'Felt stuck inside all day', tags: ['work'], people: [], work: { meetings: 3, bad: 'Back to back calls' } },
    { did: 'Class, then errands, then watched football.', happy: 'Broncos won', annoyed: 'Traffic in Casper', tags: ['school', 'football'], people: [{ name: 'Tyler', feeling: 'neutral' }], work: { meetings: 0 } },
  ],
  rough: [
    { did: 'Long day of calls that went nowhere, then drinks at the bar with the guys.', happy: 'Laughing with the guys at the bar', annoyed: 'A deal fell through after a month of work', tags: ['work', 'bar', 'stress'], people: [{ name: 'Jake', feeling: 'positive' }, { name: 'Buyer agent', feeling: 'negative' }], work: { meetings: 4, bad: 'Deal fell through' } },
    { did: 'Slept in, felt rough, barely got anything done.', happy: 'Not much honestly', annoyed: 'Wasted the whole day', tags: ['hungover', 'stress'], people: [], work: { meetings: 1, bad: 'Missed a call with a seller' } },
    { did: 'Stressful meeting about the brokerage switch, then beers at home.', happy: 'Dinner was good', annoyed: 'The meeting about leaving Chase Brothers got tense', tags: ['work', 'stress'], people: [{ name: 'Boss', feeling: 'negative' }], work: { meetings: 3, bad: 'Tense conversation about leaving' } },
  ],
}

function dayFor(date: string, kind: Kind) {
  const weekend = [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())
  const great = kind === 'great', good = kind === 'good', rough = kind === 'rough'
  const story = pick(STORIES[kind])
  const score = great ? pick([9, 9, 10]) : good ? pick([7, 8]) : rough ? pick([2, 3, 4]) : pick([5, 6])
  const hours = great ? pick([7.5, 8, 8.5]) : good ? pick([7, 7.5]) : rough ? pick([4.5, 5, 5.5]) : pick([6, 6.5, 7])
  const wake = great || good ? pick(['5:45am', '6:00am', '6:15am']) : rough ? pick(['8:30am', '9:00am']) : '7:00am'
  const workout = great || (good && rand() < 0.8) ? pick(WORKOUTS) : null
  const drinks = rough ? pick([4, 5, 6, 7]) : great ? pick([0, 0, 1, 2]) : weekend ? pick([1, 2, 3]) : pick([0, 0, 1])
  const cannabis = rough ? rand() < 0.5 : rand() < 0.12
  const food = rough ? pick(BAD_FOOD) : kind === 'meh' ? pick([...GOOD_FOOD, ...BAD_FOOD]) : pick(GOOD_FOOD)
  const morning = great || good ? pick(['Up early, coffee and a few minutes outside', 'Gym first thing', 'Coffee on the porch, planned the day']) : rough ? 'Hit snooze a bunch, phone in bed' : 'Coffee and straight to email'
  const oneLine = `${story.did.split(',')[0].replace(/\.$/, '')}.`
  const summary = {
    seed: true,
    score,
    sleep: { bedtime: rough ? '1:30am' : great || good ? '10:15pm' : '11:30pm', wake, hours },
    morning,
    did: story.did,
    food,
    workout: workout ? { did: true, ...workout } : { did: false },
    alcohol: { drinks, ...(drinks ? { kind: 'beer' } : {}) },
    cannabis: { used: cannabis, ...(cannabis ? { amount: 'a little' } : {}) },
    work: story.work,
    people: story.people,
    ...(story.fun ? { fun: story.fun } : {}),
    happy: story.happy,
    ...(story.annoyed ? { annoyed: story.annoyed } : {}),
    ...(story.standout ? { standout: story.standout } : {}),
    tags: [...story.tags, ...(workout ? ['gym'] : [])].filter((t, i, a) => a.indexOf(t) === i),
    oneLine,
  }
  const said = (q: string, a: string, topic: string) => [{ role: 'assistant', text: q, topic }, { role: 'user', text: a, topic }]
  const transcript = [
    ...said('How did you start your day?', `${morning}. Woke up around ${wake}.`, 'morning'),
    ...said('What did you get up to today?', story.did, 'did'),
    ...said('What did you eat throughout the day?', food.map((f) => ('amount' in f && f.amount ? `${f.amount} ${f.item}` : f.item)).join(', '), 'food'),
    ...said('Did you work out?', workout ? `Yeah, ${workout.type}, about ${workout.minutes} minutes.` : 'No, skipped it today.', 'workout'),
    ...said('What made you happy today?', story.happy, 'happy'),
    ...(story.annoyed ? said('Anything piss you off today?', story.annoyed, 'annoyed') : []),
    ...said('Any beers today?', drinks ? `${drinks}` : 'None', 'beers'),
    { role: 'assistant', text: 'How would you rate today, 1 to 10?', topic: 'score' },
    { role: 'user', text: String(score), topic: 'score' },
  ]
  return { score, summary, transcript, duration_sec: 180 + Math.floor(rand() * 240) }
}

function* dates(from: string, to: string) {
  for (let d = new Date(`${from}T12:00:00Z`); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    yield d.toISOString().slice(0, 10)
  }
}

async function main() {
  const [email, from, to] = process.argv.slice(2)
  const { data } = await admin.auth.admin.listUsers()
  const user = data.users.find((u) => u.email === email)
  if (!user) throw new Error(`No account for ${email}`)
  const profile = await admin.from('profiles').select('timezone').eq('id', user.id).single()
  if (profile.error) throw new Error('That account has not finished setup')

  if (from === '--remove') {
    const del = await admin.from('days').delete().eq('user_id', user.id).eq('summary->>seed', 'true').select('day_date')
    if (del.error) throw del.error
    return console.log(`Removed ${del.data.length} sample days`)
  }

  const existing = new Set(((await admin.from('days').select('day_date').eq('user_id', user.id)).data ?? []).map((d) => d.day_date))
  const rows = []
  for (const date of dates(from, to)) {
    if (existing.has(date) || rand() < 0.1) continue // keep real days; leave a few gaps like a real month
    const r = rand()
    const kind: Kind = r < 0.25 ? 'great' : r < 0.55 ? 'good' : r < 0.78 ? 'meh' : 'rough'
    rows.push({ user_id: user.id, day_date: date, status: 'saved', mode: 'type', timezone: profile.data.timezone, ...dayFor(date, kind) })
  }
  const ins = await admin.from('days').insert(rows)
  if (ins.error) throw ins.error
  console.log(`Seeded ${rows.length} sample days (${from} to ${to}), skipped ${existing.size ? 'existing days and ' : ''}a few gaps`)
}

main().catch((e) => {
  console.error('SEED FAILED:', e.message)
  process.exit(1)
})
