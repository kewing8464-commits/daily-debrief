# Daily Debrief, Milestone 2 (Connect your AI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each user can create a private connector link in Settings, add it to Claude (or ChatGPT, or any MCP-capable AI app), and ask that AI questions answered from their own saved debriefs.

**Architecture:** A read-only MCP server at `/api/mcp/[token]` built with `mcp-handler` 2.x (MCP SDK v2, stateless Streamable HTTP). The token in the URL is the credential: it is shown to the user once, stored only as a SHA-256 hash, and resolved inside Postgres by `security definer` functions that the server calls with the public anon key, so the Supabase service-role key never goes to Vercel. All analysis (search, trends, comparisons) runs in pure, tested TypeScript over the user's saved days.

**Tech Stack:** Existing Milestone 1 stack plus `mcp-handler@^2`, `@modelcontextprotocol/server@^2`, Postgres `pgcrypto` (Supabase `extensions` schema).

**Spec:** `docs/superpowers/specs/2026-10-27-daily-debrief-design.md`, section 8 (Connector), section 5 call 9, build-order step 3.

## Global Constraints

- Read-only: no tool can create, edit, or delete anything.
- One connector link per user. Creating a new one replaces the old one immediately; Revoke disables it.
- The raw token is shown once and never stored; only `sha256(token)` (hex) is stored.
- The Supabase service-role key is not added to Vercel. Token lookups happen in `security definer` SQL functions.
- Only `status = 'saved'` days are visible to the connector. Drafts never are.
- Every tool result states the date range it covers. Analysis results say they are patterns, not causes.
- Ranges are capped at 366 days; default range is the last 30 days ending today in the user's time zone.
- Nutrition is not built yet; no nutrition tool in this milestone (spec's `get_nutrition_summary` moves to the nutrition milestone).
- User-facing copy: plain, friendly, no em dashes.
- Costs stay $0.

## Review Focus

1. **Leaked or old link:** after Revoke or after creating a new link, the old URL must stop working at once (404, no data). Test in Task 1 (SQL check script) and Task 3 (route returns 404 for an unknown token).
2. **Brand-new user with no saved days:** every tool returns a friendly "no debriefs in this range yet" answer, never an error. Test in Task 2.
3. **Huge or odd ranges from the AI** (`2000-01-01` to `2099-12-31`, end before start, malformed dates): clamp to 366 days, swap reversed ranges, reject malformed dates with a clear message. Test in Task 2.
4. **The connector seeing someone else's journal:** a valid token for user A can never return user B's days. Test in Task 1 (SQL check script with two users).
5. **Large journals:** `get_days` over a full year must stay small enough for an AI context window: summaries only, no transcripts, transcripts only via `get_day`. Test in Task 2.

---

### Task 1: Connector tokens in the database

**Files:**
- Create: `supabase/migrations/0002_connector.sql`, `lib/connector/token.ts`, `scripts/check-connector.ts`
- Test: `tests/connector-token.test.ts`

**Interfaces:**
- Produces: table `connector_tokens(user_id uuid primary key references auth.users on delete cascade, token_hash text not null unique, created_at timestamptz default now(), last_used_at timestamptz)`, RLS on, policies: owner can `select` and `delete` own row, owner can `insert`/`update` own row (`with check auth.uid() = user_id`).
- Produces SQL functions (both `security definer`, `set search_path = public, extensions`, `grant execute ... to anon, authenticated`):
  - `connector_profile(p_token text) returns table(name text, timezone text)`: hashes `p_token`, returns the owner's profile, updates `last_used_at`; returns zero rows for an unknown token.
  - `connector_days(p_token text, p_from date, p_to date) returns setof days` (columns of `days`): the owner's `saved` days with `day_date between p_from and p_to`, ordered by date; zero rows for an unknown token.
- Produces: `newConnectorToken(): string` (32 random bytes, base64url, 43 chars), `hashToken(token: string): string` (lowercase hex SHA-256, must equal Postgres `encode(extensions.digest(token, 'sha256'), 'hex')`).

- [ ] **Step 1: Write the failing test:** `hashToken('abc')` equals `'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'`; two `newConnectorToken()` calls differ and match `/^[A-Za-z0-9_-]{43}$/`.
- [ ] **Step 2:** Run; expect FAIL (module missing).
- [ ] **Step 3:** Implement `lib/connector/token.ts` with `node:crypto`; write the migration.
- [ ] **Step 4:** Tests pass.
- [ ] **Step 5 (Karson):** run `0002_connector.sql` in the Supabase SQL editor (copy to clipboard for him).
- [ ] **Step 6: Verify** with `npx tsx --env-file=.env.local scripts/check-connector.ts`: creates users A and B, saves one day each, inserts a token hash for A, then with the anon key asserts: `connector_days(tokenA)` returns only A's saved day (not A's draft, not B's day); an unknown token returns 0 rows; after deleting A's token row, `tokenA` returns 0 rows. Prints `CONNECTOR OK`; deletes both users.
- [ ] **Step 7:** Commit.

### Task 2: Journal analysis functions

**Files:**
- Create: `lib/connector/journal.ts`
- Test: `tests/journal.test.ts`

**Interfaces:**
- Consumes: `DaySummary`, `debriefDateFor` (Milestone 1).
- Produces: `type SavedDay = { day_date: string; score: number; summary: DaySummary; transcript: Turn[] }`.
- Produces: `resolveRange(input: { start?: string; end?: string }, today: string): { start: string; end: string; note?: string } | { error: string }` (defaults: last 30 days ending `today`; swaps reversed; clamps to 366 days ending at `end` with a `note`; malformed dates return `error`).
- Produces: `overview(days: SavedDay[], range)`: `{ range, debriefs, averageScore, best: {date, score, oneLine}[] (top 3), worst: (bottom 3), currentStreak, topTags: {tag, days}[] (top 10), people: {name, positive, negative, neutral}[] }`.
- Produces: `daySummaryLine(d: SavedDay)`: compact object `{ date, score, oneLine, sleepHours, workout, drinks, cannabis, tags }` (no transcript).
- Produces: `searchEntries(days, text: string)`: days whose transcript text or summary fields contain `text` (case-insensitive), each with up to 2 matching snippets (≤ 160 chars), max 30 results.
- Produces: `METRICS = ['score','sleep_hours','drinks','workout_minutes','worked_out','cannabis'] as const`; `trend(days, metric)`: `{ metric, points: {date, value}[], average, min, max, daysWithValue }` (missing values skipped, `worked_out` and `cannabis` as 0/1).
- Produces: `type DayFilter = { minScore?: number; maxScore?: number; tag?: string; workedOut?: boolean; minDrinks?: number; cannabis?: boolean; weekday?: 0|1|2|3|4|5|6 }`; `compareDays(days, a: DayFilter, b: DayFilter)`: for each group `{ days, averageScore, averageSleep, averageDrinks, workoutRate, cannabisRate, topTags, topFoods, topPeople }` plus `caveat: 'These are patterns in your own entries, not proof of cause and effect.'` and a `note` when either group has fewer than 5 days.

- [ ] **Step 1: Write the failing tests** with a hand-built 10-day fixture: default range is 30 days ending today; `{start:'2026-12-01', end:'2026-11-01'}` is swapped; `{start:'2020-01-01', end:'2026-10-27'}` is clamped to 366 days with a note; `{start:'yesterday'}` returns an error naming the field; overview counts, average, best/worst order, streak; overview on `[]` says 0 debriefs without throwing; `searchEntries` finds "Jake" in a transcript case-insensitively and returns snippets ≤ 160 chars; trend of `drinks` skips nothing (drinks default 0) and trend of `sleep_hours` skips days without hours; `worked_out` is 0/1; `compareDays({minScore:8},{maxScore:5})` returns the expected averages and the caveat, plus the small-group note; `daySummaryLine` has no `transcript` key.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests pass. Commit.

### Task 3: The MCP route

**Files:**
- Create: `lib/connector/source.ts`, `lib/connector/tools.ts`, `app/api/mcp/[token]/route.ts`
- Modify: `lib/supabase/proxy.ts` (let `/api/mcp/` through without a session)
- Test: `tests/connector-tools.test.ts`

**Interfaces:**
- Consumes: Task 1 SQL functions, Task 2 functions.
- Produces: `type JournalSource = { profile(): Promise<{ name: string; timezone: string } | null>; days(start: string, end: string): Promise<SavedDay[]> }`; `supabaseSource(token: string): JournalSource` (anon client, `rpc('connector_profile')`, `rpc('connector_days')`).
- Produces: `registerJournalTools(server: McpServer, source: JournalSource, now: () => Date)`, registering read-only tools (each with a clear description written for an AI reader, and `annotations: { readOnlyHint: true }`):
  - `get_journal_overview({ start?, end? })`
  - `get_days({ start?, end? })`: list of `daySummaryLine`
  - `get_day({ date })`: full summary plus transcript
  - `search_entries({ text, start?, end? })`
  - `get_trends({ metric, start?, end? })`
  - `compare_days({ group_a: DayFilter, group_b: DayFilter, start?, end? })`
  - Every result is JSON text with `range` and, where relevant, `caveat`; empty ranges return `{ range, debriefs: 0, message: 'No saved debriefs in this range yet.' }`.
- Route: `POST`/`GET` resolve `params.token`; if `profile()` is null return `404` JSON `{ error: 'Unknown connector link' }`; otherwise build `createMcpHandler((s) => registerJournalTools(s, source, () => new Date()), { serverInfo: { name: 'daily-debrief', version: '1.0.0' } })` and return `handler(request)`.

- [ ] **Step 1: Write the failing tests** using a fake `JournalSource` and calling the registered tool handlers through a tiny fake `McpServer` (records `registerTool` calls): all six tool names are registered and marked read-only; `get_days` over the fixture returns lines without transcripts; `get_day` for a missing date returns the "no debrief on this date" message; `compare_days` returns the caveat; a reversed range is swapped.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** `npm i mcp-handler@^2 @modelcontextprotocol/server@^2`; implement source, tools, route; exempt `/api/mcp/` in the proxy.
- [ ] **Step 4:** Tests pass; `npm run build` passes.
- [ ] **Step 5: Verify locally** with a real token for a throwaway user and curl JSON-RPC against `npm run dev`: `initialize`, `tools/list` (6 tools), `tools/call get_journal_overview`; an unknown token returns 404.
- [ ] **Step 6:** Commit.

### Task 4: "Connect your AI" in Settings

**Files:**
- Create: `app/api/connector/route.ts`, `components/ConnectAi.tsx`
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: `newConnectorToken`, `hashToken`, `connector_tokens` table (via the user's own session and RLS).
- Produces: `GET /api/connector` → `{ connected: boolean, createdAt?, lastUsedAt? }`; `POST /api/connector` → creates or replaces the row and returns `{ url }` (`${origin}/api/mcp/${token}`) once; `DELETE /api/connector` → removes the row.
- `ConnectAi` card: status line ("Not connected" / "Connected, last used 2 hours ago"); "Create my connector link" (or "Replace link" with a warning that the old one stops working); after creating, shows the link once with a Copy button and "You won't see this again"; Revoke button. Two expandable setup guides:
  - **Claude:** claude.ai → Settings → Connectors → Add custom connector → name "Daily Debrief", paste the link → Add. Then create a Project named "My Life", turn the connector on in chats, and paste the suggested project instructions (provided in a copyable box): "You have my Daily Debrief journal through the Daily Debrief connector. When I ask about my life, habits, moods, sleep, food, drinking, workouts, people, or work, look it up with the connector tools before answering, use real dates and numbers, and say when a pattern is only a correlation."
  - **ChatGPT:** Settings → Apps & Connectors → Advanced → turn on Developer mode → Create → name "Daily Debrief", paste the link, no authentication → Create; then pick it in a chat via the + menu.
- Copy reminder in the card: "Anyone with this link can read your journal. Don't share it. Revoke it any time."

- [ ] **Step 1:** Implement the route (session required, upsert on `user_id`) and the card; no new pure logic beyond Task 1 (covered there).
- [ ] **Step 2:** `npx tsc --noEmit`, `npx eslint .`, `npm test` all pass.
- [ ] **Step 3: Verify in a phone-size browser** with a throwaway user: create link, copy, replace (old link 404s via curl), revoke (link 404s).
- [ ] **Step 4:** Commit.

### Task 5: Ship and connect Claude

- [ ] **Step 1:** Push `main`; confirm the Vercel production deploy is Ready.
- [ ] **Step 2: Verify on production** with curl and a throwaway user's link: `tools/list` returns 6 tools; delete the user.
- [ ] **Step 3 (Karson):** create his link in Settings on his phone or laptop, add it to Claude as a custom connector, create the "My Life" project, and ask "What did I do on my best day this week?".
- [ ] **Step 4:** Update README (Connect your AI section) and commit.
