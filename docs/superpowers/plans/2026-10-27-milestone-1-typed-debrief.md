# Daily Debrief, Milestone 1 (typed debrief, calendar, day view) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Karson can sign up, pick his debrief time, do a typed nightly debrief with an AI interviewer on his iPhone home screen, save the day with a 1 to 10 score, and browse past days on a calendar.

**Architecture:** A Next.js App Router web app (installable to the iPhone home screen) on Vercel's free plan. Supabase provides email/password login and a Postgres database with row-level security. All AI calls happen in server route handlers through one small `ChatModel` interface backed by Groq's OpenAI-compatible API, so the provider can be swapped. Conversation logic, date logic, and stats are pure functions with unit tests; pages are thin.

**Tech Stack:** Node 24, Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, `@supabase/supabase-js` 2 + `@supabase/ssr`, Zod 4, Vitest 4, Groq chat completions API (`https://api.groq.com/openai/v1/chat/completions`).

**Spec:** `docs/superpowers/specs/2026-10-27-daily-debrief-design.md` (build-order steps 1 and 2). Design tokens: `design/chosen-design.json`; visual reference: `design/playground.html` ("★ Your pick" is close; the chosen file wins).

## Global Constraints

- Costs $0 for one user: Vercel Hobby, Supabase Free, Groq free tier. No paid service, no credit card required.
- Every AI call is server-side; the Groq key is never sent to the browser. Keys live in `.env.local` (git-ignored) and Vercel environment variables.
- Each user can read and write only their own rows, enforced by Postgres row-level security, not just app code.
- Colors (from `design/chosen-design.json`): background `#2a2828`, cards `#2a201b`, text `#f3e8de`, soft text `#a8968a`, accent `#e0895f`, accent 2 `#9fc29a`. Dark mode only in Milestone 1.
- Type and shape: serif headlines, rounded sans body, base text at 90% scale, 6px corners, outlined cards, solid buttons, emoji on, friendly wording.
- Score colors (warm pastel, builder's mapping): 1–2 `#e89f88`, 3–4 `#f2c9b4`, 5–6 `#f0e2c4`, 7–8 `#c7dcb9`, 9–10 `#9fc29a`; no debrief = dashed outline.
- A debrief started before 04:00 local time belongs to the previous date. One day record per user per date; reopening a saved date adds to it.
- Every debrief ends with "How would you rate today, 1 to 10?" A day cannot be saved without a score.
- A normal debrief should finish in about 5 minutes: at most 12 topic questions plus the score, and fewer when topics are already covered.
- If the AI fails at any point, the debrief still finishes (scripted questions) and the transcript still saves.
- User-facing copy: plain, friendly, no em dashes (Karson's rule for all published copy).
- GitHub: private repo `kewing8464-commits/daily-debrief`; push with that account's token (the machine's default `gh` account is a work account; do not switch it).

## Review Focus

1. **iPhone closes the app mid-debrief** (screen lock, switching apps): reopening must resume the same conversation, not start over. Test in Task 6 (`restoreDraft`).
2. **AI unavailable or out of quota** (Groq 429/5xx/timeout) mid-debrief or at summary time: scripted questions continue and the day saves with the transcript. Tests in Tasks 4 and 5.
3. **Debriefing after midnight** (00:00–03:59): the entry lands on the previous date. Test in Task 3.
4. **Daylight saving change and time zone travel:** the date uses the time zone stored on the debrief, so 2026-11-01 (US DST ends) still maps correctly. Test in Task 3.
5. **Opening tonight's debrief after it was already saved:** the new answers append to the saved day and the score can be updated, never wiping the earlier transcript. Test in Task 6 (`appendSession`).

---

## File Structure

```
daily-debrief/
  app/
    layout.tsx                 root layout, fonts, theme, manifest link
    globals.css                Tailwind + CSS variables from the design
    manifest.ts                PWA manifest (name, icons, theme colors)
    page.tsx                   Home
    login/page.tsx             log in / sign up
    setup/page.tsx             name, debrief time, time zone
    debrief/page.tsx           the debrief (client component inside)
    calendar/page.tsx          month view
    day/[date]/page.tsx        day view + edit
    settings/page.tsx          debrief time, export, log out
    api/debrief/turn/route.ts       POST: next question
    api/debrief/summarize/route.ts  POST: transcript -> DaySummary
    api/days/[date]/route.ts        GET / PUT a day
    api/export/route.ts             GET: all of the user's data as JSON
  components/                  TabBar, Card, ScoreChip, Bubble, QuickReplies, ScorePicker, SummaryForm
  lib/
    design.ts                  design tokens + scoreColor()
    dates.ts                   debriefDateFor(), monthGrid()
    topics.ts                  TOPICS, TopicId
    conversation.ts            ConversationState, nextScriptedQuestion(), nextTurn()
    draft.ts                   restoreDraft(), appendSession()
    summary.ts                 DaySummarySchema, summarizeTranscript()
    stats.ts                   weekStats()
    ai/provider.ts             ChatModel, groqModel(), AiUnavailableError
    supabase/server.ts, client.ts, middleware.ts
    validation.ts              SetupInputSchema
  middleware.ts                session refresh + auth redirects
  supabase/migrations/0001_init.sql
  scripts/check-rls.ts
  tests/                       *.test.ts mirroring lib/
  public/icons/                app icons (placeholder until a generated logo exists)
```

---

### Task 1: Project scaffold, design tokens, installable shell

**Files:**
- Create: the Next.js project in `~/Dev/daily-debrief` (keep existing `design/`, `docs/`, `.superpowers/`), `lib/design.ts`, `app/globals.css`, `app/manifest.ts`, `app/layout.tsx`, `components/TabBar.tsx`, `components/Card.tsx`, `vitest.config.ts`, `.gitignore` (add `.superpowers/`, `.env*.local`)
- Test: `tests/design.test.ts`

**Interfaces:**
- Produces: `DESIGN` (object with `colors.{bg,surface,text,muted,accent,accent2}`, `radius: 6`, `scale: 0.9`), `scoreColor(score: number | null): string` (returns the hex from Global Constraints; `null` returns `'transparent'`), `<Card>`, `<TabBar active="home"|"calendar"|"settings">`.

- [ ] **Step 1:** `npx create-next-app@16 . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"` (answer yes to installing into a non-empty folder), then `npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths` and add `"test": "vitest run"`.
- [ ] **Step 2: Write the failing test** `tests/design.test.ts`:

```ts
import { DESIGN, scoreColor } from '@/lib/design'
import chosen from '@/design/chosen-design.json'
test('tokens come from the chosen design', () => {
  expect(DESIGN.colors).toEqual(chosen.colors)
  expect(DESIGN.radius).toBe(chosen.radius)
})
test('score colors', () => {
  expect(scoreColor(1)).toBe('#e89f88'); expect(scoreColor(4)).toBe('#f2c9b4')
  expect(scoreColor(6)).toBe('#f0e2c4'); expect(scoreColor(8)).toBe('#c7dcb9')
  expect(scoreColor(10)).toBe('#9fc29a'); expect(scoreColor(null)).toBe('transparent')
})
```

- [ ] **Step 3:** Run `npm test`; expect FAIL (module not found).
- [ ] **Step 4:** Implement `lib/design.ts` by importing `design/chosen-design.json`; write `globals.css` CSS variables `--bg --surface --text --muted --accent --accent2 --radius` from `DESIGN`; serif headlines via `next/font` (Source Serif 4) and rounded body (Nunito); `app/manifest.ts` with `name: 'Daily Debrief'`, `display: 'standalone'`, `background_color` and `theme_color` `#2a2828`, 192 and 512 placeholder icons; layout adds `apple-mobile-web-app-capable` and the apple touch icon.
- [ ] **Step 5:** `npm test` passes; `npm run build` succeeds.
- [ ] **Step 6:** `git init`, commit, create the private repo `kewing8464-commits/daily-debrief` (ask Karson to run the create command if the permission classifier blocks it), push.

### Task 2: Database, login, setup

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `lib/supabase/{server,client,middleware}.ts`, `middleware.ts`, `lib/validation.ts`, `app/login/page.tsx`, `app/setup/page.tsx`, `scripts/check-rls.ts`, `.env.local.example`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Produces: tables `profiles(id uuid pk = auth.users.id, name text not null, debrief_time time not null, timezone text not null, created_at timestamptz default now())` and `days(id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, day_date date not null, score int check (score between 1 and 10), mode text check (mode in ('type','talk')), duration_sec int, summary jsonb, transcript jsonb not null default '[]', status text not null default 'draft' check (status in ('draft','saved')), timezone text not null, created_at, updated_at, unique(user_id, day_date))`; RLS enabled on both with `auth.uid() = id` / `auth.uid() = user_id` for select, insert, update, delete.
- Produces: `SetupInputSchema` (zod: `name` 1–40 chars trimmed, `debriefTime` `HH:MM` 24h, `timezone` a valid IANA zone checked with `Intl.DateTimeFormat`), `createServerSupabase()`, `createBrowserSupabase()`.
- Middleware rule: no session → `/login`; session but no profile → `/setup`; otherwise continue.

- [ ] **Step 1: Write the failing test** `tests/validation.test.ts`: `'21:30'` and `'America/Denver'` pass; `'9:30pm'`, `'25:00'`, `''` name, and `'Mars/Olympus'` fail with a message naming the field.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `lib/validation.ts`, the Supabase helpers (per `@supabase/ssr` docs for Next.js App Router), the middleware, the login page (email + password, sign up and log in on one screen), and the setup page (time picker defaulting to 21:30, time zone auto-filled from `Intl.DateTimeFormat().resolvedOptions().timeZone`, inserts into `profiles`).
- [ ] **Step 4:** `npm test` passes.
- [ ] **Step 5 (needs Karson):** He creates a free Supabase project (sign in with GitHub) and pastes the URL and anon key into `.env.local` himself (keys never go in chat). Apply `0001_init.sql` in the Supabase SQL editor. In Auth settings, turn off "Confirm email" for Milestone 1 so sign-up works on the phone without opening Safari.
- [ ] **Step 6: Verify RLS** with `npx tsx scripts/check-rls.ts`: it signs up two throwaway users, writes a day as user A, and asserts user B's select returns 0 rows and B's update affects 0 rows. Expected output: `RLS OK`. Delete the throwaway users afterward.
- [ ] **Step 7:** Commit.

### Task 3: Which date a debrief belongs to, and the month grid

**Files:**
- Create: `lib/dates.ts`
- Test: `tests/dates.test.ts`

**Interfaces:**
- Produces: `debriefDateFor(now: Date, timeZone: string): string` (`YYYY-MM-DD`, previous date when local time is before 04:00); `monthGrid(year: number, month: number /* 1-12 */): (string | null)[]` (Sunday-first, leading `null`s, then each `YYYY-MM-DD`).

- [ ] **Step 1: Write the failing tests:**

```ts
const at = (iso: string) => new Date(iso)
test('before 4am counts as yesterday', () => {
  expect(debriefDateFor(at('2026-10-28T08:30:00Z'), 'America/Denver')).toBe('2026-10-27') // 02:30 MDT
  expect(debriefDateFor(at('2026-10-28T10:00:00Z'), 'America/Denver')).toBe('2026-10-28') // 04:00 MDT
  expect(debriefDateFor(at('2026-10-28T05:59:00Z'), 'America/Denver')).toBe('2026-10-27') // 23:59 MDT
})
test('DST end night', () => {
  expect(debriefDateFor(at('2026-11-01T09:30:00Z'), 'America/Denver')).toBe('2026-10-31') // 02:30 MST
})
test('time zone of the debrief, not the server', () => {
  expect(debriefDateFor(at('2026-10-28T03:00:00Z'), 'America/New_York')).toBe('2026-10-27') // 23:00 EDT
})
test('October 2026 starts on Thursday', () => {
  const g = monthGrid(2026, 10)
  expect(g.slice(0, 4)).toEqual([null, null, null, null]); expect(g[4]).toBe('2026-10-01'); expect(g.at(-1)).toBe('2026-10-31')
})
```

- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement with `Intl.DateTimeFormat(..., { timeZone, hourCycle: 'h23' }).formatToParts`; no date library.
- [ ] **Step 4:** Tests pass. Commit.

### Task 4: Topics, AI provider, and the conversation engine

**Files:**
- Create: `lib/topics.ts`, `lib/ai/provider.ts`, `lib/conversation.ts`, `app/api/debrief/turn/route.ts`
- Test: `tests/conversation.test.ts`, `tests/provider.test.ts`

**Interfaces:**
- Produces: `TopicId` = `'food' | 'did' | 'sleep' | 'morning' | 'meetings' | 'fun' | 'happy' | 'annoyed' | 'beers' | 'weed' | 'workout' | 'standout'`; `TOPICS: { id: TopicId; question: string; quickReplies?: string[] }[]` in that order. Default questions (friendly, no em dashes): "How did you start your day?", "When did you fall asleep last night, and when did you wake up?", "What did you get up to today?", "What did you eat throughout the day?", "Any work meetings today? How did they go?", "Did you work out? What did you do?", "Did you do anything fun?", "What made you happy today?", "Anything piss you off today?", "Any beers today?" (quick replies `None`, `1-2`, `3-4`, `5+`), "Any weed today?" (`No`, `A little`, `Yes`), "Anything stand out or anything cool happen?". Score question: "How would you rate today, 1 to 10?"
- Produces: `interface ChatModel { complete(input: { system: string; messages: { role: 'user' | 'assistant'; content: string }[]; json?: boolean; maxTokens?: number }): Promise<string> }`; `groqModel(apiKey: string, model: string, fetchFn = fetch): ChatModel` (15 s timeout; throws `AiUnavailableError` on network error, timeout, 429, or 5xx); `class AiUnavailableError extends Error`.
- Produces: `type Turn = { role: 'assistant' | 'user'; text: string; topic?: TopicId | 'score' }`; `type ConversationState = { turns: Turn[]; covered: TopicId[]; skipped: TopicId[] }`; `nextScriptedQuestion(state): { topic: TopicId | 'score'; text: string; quickReplies?: string[] }` (first topic not in `covered` or `skipped`, else the score question); `nextTurn(state, answer: string, model: ChatModel): Promise<{ state: ConversationState; next: ReturnType<typeof nextScriptedQuestion>; usedAi: boolean }>`.
- `nextTurn` asks the model, in JSON mode, for `{ "covered": TopicId[], "question": string }`: which topics the whole conversation so far has answered, and a natural, short (under 25 words) phrasing of the next uncovered topic that may briefly react to the last answer. Unknown topic ids are dropped. On `AiUnavailableError` or invalid JSON, mark only the current topic covered and use `nextScriptedQuestion`.
- Route `POST /api/debrief/turn` body `{ state, answer }` returns `{ state, next, usedAi }`; requires a session; uses env `GROQ_API_KEY` and `GROQ_MODEL`.

- [ ] **Step 1: Write the failing tests** with a fake `ChatModel`:
  - `answering "gym then a chicken bowl" with model returning {"covered":["morning","workout","food"],"question":"Nice. When did you fall asleep last night?"} marks all three covered and asks that question` (`usedAi === true`).
  - `model throwing AiUnavailableError falls back to the next scripted topic` (`usedAi === false`, only the asked topic added to `covered`).
  - `model returning junk text falls back the same way`.
  - `unknown topic ids from the model are ignored`.
  - `when every topic is covered or skipped the next question is the score`.
  - `"skip" via skipped list moves on without covering`.
  - provider: `429 response throws AiUnavailableError`; `timeout throws AiUnavailableError`; `200 returns choices[0].message.content` (mock `fetchFn`).
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement. Before choosing `GROQ_MODEL`, list current models with `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"` and pick a current general model that supports JSON mode; record the choice in `.env.local.example`.
- [ ] **Step 4:** Tests pass. Commit.

### Task 5: Summary extraction

**Files:**
- Create: `lib/summary.ts`, `app/api/debrief/summarize/route.ts`
- Test: `tests/summary.test.ts`

**Interfaces:**
- Produces: `DaySummarySchema` (zod) with every field optional except `score`: `score: 1..10`, `sleep: { bedtime?: string; wake?: string; hours?: number }`, `morning?: string`, `did?: string`, `food: { item: string; amount?: string }[]` (nutrition estimates come in a later milestone), `workout: { did: boolean; type?: string; minutes?: number }`, `alcohol: { drinks: number; kind?: string }`, `cannabis: { used: boolean; amount?: string }`, `work: { meetings?: number; good?: string; bad?: string; enjoyed?: string[]; disliked?: string[] }`, `people: { name: string; feeling: 'positive' | 'negative' | 'neutral' }[]`, `fun?: string`, `happy?: string`, `annoyed?: string`, `standout?: string`, `tags: string[]`, `oneLine: string` (a one-sentence recap in the user's voice). Type `DaySummary`.
- Produces: `summarizeTranscript(turns: Turn[], score: number, model: ChatModel): Promise<{ summary: DaySummary; usedAi: boolean }>`: JSON-mode call, validate with the schema, one retry on invalid output, then fall back to `{ score, food: [], workout: { did: false }, alcohol: { drinks: 0 }, cannabis: { used: false }, work: {}, people: [], tags: [], oneLine: '' }` with `usedAi: false`. The prompt must say: only record what the user said; never guess a number that was not said; amounts stay as the user phrased them.

- [ ] **Step 1: Write the failing tests:** valid model JSON parses and keeps the given score even if the model returns a different one; invalid JSON then valid JSON uses the retry; two invalid outputs return the fallback with `usedAi === false`; `AiUnavailableError` returns the fallback.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement summary and the route (`POST { turns, score }` → `{ summary, usedAi }`).
- [ ] **Step 4:** Tests pass. Commit.

### Task 6: The typed debrief screen and saving a day

**Files:**
- Create: `lib/draft.ts`, `app/debrief/page.tsx` (+ client component `components/Debrief.tsx`), `components/{Bubble,QuickReplies,ScorePicker,SummaryForm}.tsx`, `app/api/days/[date]/route.ts`
- Test: `tests/draft.test.ts`

**Interfaces:**
- Consumes: `nextTurn` (via `/api/debrief/turn`), `summarizeTranscript` (via `/api/debrief/summarize`), `debriefDateFor`, `TOPICS`.
- Produces: `restoreDraft(stored: string | null, today: string): ConversationState | null` (returns the stored state only if it is for `today` and parses; otherwise null); `appendSession(saved: { transcript: Turn[]; summary: DaySummary | null }, session: Turn[]): Turn[]` (old turns, a `{ role: 'assistant', text: 'Added later' }` divider, then new turns); `GET /api/days/[date]` → the day or 404; `PUT /api/days/[date]` body `{ transcript, summary, score, mode, durationSec, timezone, status }` upserts on `(user_id, day_date)`.
- Screen flow: Talk/Type switch at top (Talk shows "Voice is coming in the next update. Use the keyboard mic for now." and stays in Type), progress text "Question N of about M" where M = 12 minus covered/skipped plus score, chat bubbles, text box with send, quick-tap replies when the topic has them, Skip, End early (goes straight to the score). Then the 1 to 10 score picker, then the editable summary (`SummaryForm`), then Save. The draft is saved to `localStorage` key `debrief-draft` after every turn and to the server as `status: 'draft'` after every 3 turns.
- If `GET /api/days/[today]` returns a saved day, the screen opens with "You already debriefed today. Want to add anything?" and saving uses `appendSession` and re-summarizes the full transcript.

- [ ] **Step 1: Write the failing tests:** `restoreDraft` returns state for the same date, null for yesterday's draft, null for corrupt JSON; `appendSession` keeps all earlier turns in order and inserts the divider once.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `lib/draft.ts`, the route, and the screen.
- [ ] **Step 4:** Tests pass.
- [ ] **Step 5: Verify in a browser** (`npm run dev`, phone-size viewport 390x844): complete a debrief end to end with real Groq; reload mid-debrief and confirm it resumes; set `GROQ_API_KEY=bad` and confirm the scripted questions continue and the day saves; reopen and add to the saved day.
- [ ] **Step 6:** Commit.

### Task 7: Home, calendar, day view, settings

**Files:**
- Create: `lib/stats.ts`, `app/page.tsx`, `app/calendar/page.tsx`, `app/day/[date]/page.tsx`, `app/settings/page.tsx`, `app/api/export/route.ts`, `components/ScoreChip.tsx`
- Test: `tests/stats.test.ts`

**Interfaces:**
- Consumes: `monthGrid`, `scoreColor`, `debriefDateFor`, `SummaryForm`, the days API.
- Produces: `weekStats(days: { day_date: string; score: number | null; summary: DaySummary | null }[], today: string): { bars: { date: string; score: number | null }[]; streak: number; sleepAvg: number | null }` (bars = the 7 dates ending today, oldest first; streak = consecutive saved days ending today, or ending yesterday if today is not done yet; sleepAvg = mean of `summary.sleep.hours` over those 7 days, one decimal).
- Home: greeting with first name and time of day, tonight's status ("Ready when you are" or "Done for today ✓" with the score), Talk/Type switch and Start button, week bars colored with `scoreColor`, streak, sleep average.
- Calendar: month grid with prev/next, each day cell colored by score, dashed outline when no debrief, tap → `/day/[date]`.
- Day view: score, `oneLine`, summary rows (sleep, morning, food, workout, beers / weed, work, people, fun, happy, annoyed, standout), full transcript (collapsible), Edit (reuses `SummaryForm`, saves via PUT), and "Debrief this day" for a missed yesterday.
- Settings: change debrief time (saves to `profiles`), "Download my data" (`/api/export` returns profile + all days as JSON), log out, and a "Connect your AI" section that says it arrives in the next update (Milestone 2 builds the connector so Claude, ChatGPT, or another AI app can read your journal).

- [ ] **Step 1: Write the failing tests** for `weekStats`: streak 3 when the last 3 dates are saved; streak counts through yesterday when today is empty; a gap resets the streak; sleepAvg ignores days without hours; 7 bars oldest first including empty dates.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement the function and the pages.
- [ ] **Step 4:** Tests pass. Browser check at 390x844 of all four screens against `design/playground.html`.
- [ ] **Step 5:** Commit.

### Task 8: Deploy and install on Karson's iPhone

**Files:**
- Modify: `README.md` (what it is, setup steps, env vars, how to install on iPhone)

- [ ] **Step 1:** Create the Vercel project from the GitHub repo (Karson's existing Vercel account), set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `GROQ_MODEL` in Vercel (Karson pastes the secret values himself). Deploy.
- [ ] **Step 2:** In Groq's console, turn on Zero Data Retention (Data Controls).
- [ ] **Step 3: Verify** on the production URL in a phone-size browser: sign up, setup, debrief, save, calendar, day view, export.
- [ ] **Step 4:** Karson opens the URL in Safari on his iPhone, Share → Add to Home Screen, opens it from the icon, and does his first real debrief. Confirm it opens full screen with the dark theme and stays logged in after closing.
- [ ] **Step 5:** Commit README, push.
