# Daily Debrief, Milestone 3 (New shell, voice, and redesigned screens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the v2 look and feel: the 4-tab phone bar and computer sidebar, the chill voice, productive and focus ratings, the color calendar with layers, the new Today, the new day page, and an Insights tab starter.

**Architecture:** Each screen stays a thin server page that loads rows, plus one client component for interaction. Everything decidable (layer colors, month stats, today's mode, streaks, day neighbors, copy) lives in small pure `lib/` modules with tests. Responsive layout uses Tailwind's `lg` breakpoint (1024px) for the computer layout and `md` (768px) for tablet two-column spots.

**Tech Stack:** Existing (Next.js 16, React 19, Tailwind 4, Supabase, Vitest). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-daily-debrief-v2-design.md` and the binding log `docs/superpowers/specs/2026-10-28-app-design-decisions.md` (sections: Layout everywhere, Journal, Today, Debrief, Day page, Ratings, Voice).

## Global Constraints

- Copy follows the Voice section of the decisions log exactly. Plain words for settings, buttons and errors. No em dashes. At most one emoji per line.
- Tabs: Today · Journal · Insights · You. Phone (under 1024px) shows the bottom bar; computer (1024px+) shows the left sidebar with "Start debrief" pinned at the bottom.
- Productive and focus are optional integers 1-4. Labels: Productive `Not / A bit / Solid / Very`, Focus `Scattered / Distracted / Steady / Locked in`. Questions: "Get stuff done?" and "Were you locked in?".
- Score question: "How'd today hit? 1 to 10". Saved: "Locked in ✓". After the debrief: "That's a wrap 🌙". Empty day: "Nothing here. Quiet day?". Insights waiting: "Still learning you. N more days." (threshold 14 saved debriefs).
- The AI may use light, natural swearing in its replies only; never in app copy.
- Out of scope for M3 (later milestones): vibe checks and the "+ Vibe check" button (M4), the Talk mode mic (M5), reminders and new signup (M6), the Food layer, food card and calories (M7), full Insights (M8). Leave no dead buttons for them.
- Existing behavior stays: the 4am rule, drafts never shown, the 409 save conflict guard, connector read-only. All 93 existing tests keep passing.
- Colors only from `DESIGN` / CSS variables; mood colors from `scoreColor`.

## Review Focus

1. **Old days have no productive/focus:** the Productive and Focus layers show those days as "no rating" (dashed like empty), never crash or count as 0. Test in Task 4.
2. **A month with no saved days, or a brand-new user:** stats show "–", the insight card says how many debriefs are left, and the Today week card says "Your first debrief is tonight at {time}". Tests in Tasks 4 and 5.
3. **Sleep layer with no hours, and the drinks layer at 0:** neutral cell, not the darkest color. Test in Task 4.
4. **Day page "next" past today, and deleting a day:** next is disabled for future dates; delete asks once and then the Journal no longer shows the day. Tests in Task 7 plus a browser check.
5. **Width switch at 1024px:** sidebar and no bottom bar on a computer, bottom bar and no sidebar on a phone, with nothing hidden behind either. Browser check in Task 8.

---

### Task 1: Ratings in the data, API and connector

**Files:**
- Create: `supabase/migrations/0003_ratings.sql`, `lib/ratings.ts`, `tests/ratings.test.ts`
- Modify: `lib/schemas.ts` (add `DayPutSchema`, moved from `app/api/days/[date]/route.ts`), `app/api/days/[date]/route.ts`, `lib/connector/journal.ts`, `lib/connector/source.ts`

**Interfaces:**
- Produces: columns `days.productive smallint check (productive between 1 and 4)`, `days.focus smallint check (focus between 1 and 4)`, `days.from_memory boolean not null default false`, `profiles.ratings_on boolean not null default true`.
- Produces: `PRODUCTIVE_LABELS`, `FOCUS_LABELS` (readonly 4-tuples), `PRODUCTIVE_QUESTION = 'Get stuff done?'`, `FOCUS_QUESTION = 'Were you locked in?'`, `ratingLabel(kind: 'productive' | 'focus', n: number | null): string | null`.
- Produces: `DayPutSchema` = the old route body plus `productive`, `focus` (int 1-4, nullable, default null) and `fromMemory` (boolean, default false).
- Produces: `SavedDay` gains `productive: number | null; focus: number | null`; `daySummaryLine` and `dayBriefLine` include them; `METRICS` adds `'productive'`, `'focus'` (days without a rating are skipped).

- [ ] **Step 1: Write failing tests:** `ratingLabel('productive', 4) === 'Very'`, `ratingLabel('focus', 1) === 'Scattered'`, `ratingLabel('focus', null) === null`; `DayPutSchema` accepts `productive: 4`, rejects `productive: 5`, defaults both to null and `fromMemory` to false; in `tests/journal.test.ts`, a `trend(days, 'productive')` over days where one has no rating skips it; `daySummaryLine` includes `productive`.
- [ ] **Step 2:** Run `npx vitest run tests/ratings.test.ts tests/journal.test.ts`; expect FAIL.
- [ ] **Step 3:** Implement. The route writes `productive`, `focus` and `from_memory` on upsert. Write the migration; copy it to the clipboard for Karson.
- [ ] **Step 4:** Tests pass; `npx tsc --noEmit`.
- [ ] **Step 5 (Karson):** run `0003_ratings.sql` in the Supabase SQL editor. Re-run `scripts/check-rls.ts` and `scripts/check-connector.ts` (both print OK).
- [ ] **Step 6:** Commit.

### Task 2: Voice and copy

**Files:**
- Create: `lib/copy.ts`, `tests/copy.test.ts`
- Modify: `lib/topics.ts` (`SCORE_QUESTION`), `lib/greeting.ts`, `lib/conversation.ts` (system prompt), `lib/summary.ts` (nothing in the summary prompt changes), existing tests that assert old copy

**Interfaces:**
- Produces: `COPY` object with the Global Constraints strings (`scoreQuestion`, `saved`, `wrapped`, `emptyDay`, `stillLearning(n)`, `firstDebrief(time)`), `streakLabel(n: number): string | null` (`null` for 0, `'🔥 1 day'`, `'🔥 7 days straight'` for 2+), `AI_VOICE` (a system-prompt paragraph: chill friend, short, curious, mirrors the user's words, light natural swearing allowed but never aimed at the user, no lecturing about drinking or weed, no guilt).
- Produces: `greetingFor(hour: number, wrapped: boolean): string`: wrapped → `"That's a wrap 🌙"`; else 4-11 `'Morning'`, 12-16 `'Good afternoon'`, otherwise `'Evening'`.

- [ ] **Step 1: Failing tests:** `streakLabel(0) === null`, `streakLabel(7) === '🔥 7 days straight'`; `greetingFor(9, false) === 'Morning'`, `greetingFor(22, true) === "That's a wrap 🌙"`; `SCORE_QUESTION === "How'd today hit? 1 to 10"`; the conversation system prompt contains `AI_VOICE`; `COPY.stillLearning(5) === 'Still learning you. 5 more days.'`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement. Update the old greeting test to the new values.
- [ ] **Step 4:** `npx vitest run`; all pass.
- [ ] **Step 5:** Commit.

### Task 3: The shell (tabs, sidebar) and the Insights starter

**Files:**
- Create: `components/AppShell.tsx`, `app/insights/page.tsx`, `lib/insights.ts`, `tests/insights.test.ts`
- Modify: `components/TabBar.tsx` (4 tabs), every page that renders `<TabBar>` (`app/page.tsx`, `app/calendar/page.tsx`, `app/day/[date]/page.tsx`, `app/settings/page.tsx`) to render `<AppShell active=...>` around content instead

**Interfaces:**
- Produces: `type TabId = 'today' | 'journal' | 'insights' | 'you'`; `AppShell({ active, children, wide? })`.
  - Under `lg`: content plus the fixed bottom `TabBar`.
  - At `lg+`: a 200px left sidebar (app name, the 4 tabs, a "Start debrief" link to `/debrief?date=` today, passed in as `debriefHref`), no bottom bar, content in a centered column (`max-w-5xl`; `wide` lets the Journal and day page use the full width).
- Produces: `insightsProgress(saved: number): { remaining: number; pct: number }` (threshold 14; remaining is never below 0; pct is 0-100).
- Insights page content:
  - Under 14 saved: "Still learning you. N more days." with a progress bar, plus "So far" tiles (average day, average sleep).
  - At 14+: the same tiles plus "Full patterns are coming soon."
  - Always: three "Ask your AI" questions with Copy buttons ("What do my best days have in common?", "How does drinking affect my next day?", "Who do I have the best days with?"), and a link to You if no connector exists.

- [ ] **Step 1: Failing tests:** `insightsProgress(9)` → `{ remaining: 5, pct: 64 }`; `insightsProgress(20)` → `{ remaining: 0, pct: 100 }`; `insightsProgress(0).remaining === 14`.
- [ ] **Step 2:** Run; FAIL.
- [ ] **Step 3:** Implement the shell, tab bar, Insights page and lib.
- [ ] **Step 4:** Tests pass; `npm run build` passes.
- [ ] **Step 5:** Commit.

### Task 4: Journal (color calendar with layers)

**Files:**
- Create: `lib/journal-layers.ts`, `tests/journal-layers.test.ts`, `components/JournalCalendar.tsx`, `components/DayPreview.tsx`
- Modify: `app/calendar/page.tsx` (load `day_date, score, summary, productive, focus` for the month, all of that user's saved-day count, the profile; read `?month=` and `?tag=`)

**Interfaces:**
- Produces: `type Layer = 'mood' | 'productive' | 'focus' | 'sleep' | 'drinks' | 'gym'`, `LAYERS` with chip labels `😊 Mood, ⚡ Productive, 🎯 Focus, 💤 Sleep, 🍺 Drinks, 🏋️ Gym`.
- Produces: `type CalDay = { day_date: string; score: number; summary: DaySummary; productive: number | null; focus: number | null }`.
- Produces: `cellStyle(layer: Layer, d: CalDay): { background: string; empty: boolean }`:
  - mood → `scoreColor(score)`.
  - productive/focus → sage `#9fc29a` at opacity `[0.25, 0.5, 0.75, 1][n-1]`; null → `empty: true`.
  - sleep → sage at `clamp((hours-4)/5, 0.15, 1)`; no hours → `empty: true`.
  - drinks → terracotta `#e0895f` at `min(drinks,6)/6`; 0 drinks → `var(--surface)`.
  - gym → sage when worked out, else `var(--surface)`.
- Produces: `legendFor(layer): { low: string; high: string; swatches: string[] }`.
- Produces: `monthStats(days: CalDay[]): { avgScore: number | null; avgSleep: number | null; workouts: number; beers: number }`.
- Produces: `dayIcons(d: CalDay): string` (`'🏋️'` if worked out, `'🍺'` if 3+ drinks, concatenated).
- Produces: `statLayer: Record<'avgScore' | 'avgSleep' | 'workouts' | 'beers', Layer>` = mood, sleep, gym, drinks.
- Produces: `insightLine(days: SavedDay[], totalSaved: number): string | null`.
  - `null` under 14 total saved.
  - Otherwise, using `compareDays(days, { minScore: 8 }, { maxScore: 5 })`, the first true of:
    - workoutRate diff ≥ 0.3 → `"Your 8+ days had a workout {a}% of the time, vs {b}% on rough days."`
    - avgSleep diff ≥ 1 → `"You slept about {x}h more on your 8+ days."`
    - avgDrinks diff ≥ 1.5 → `"Your rough days averaged {x} more drinks."`
  - Otherwise `null`.
- `DayPreview({ day, onClose? })`: date, score circle, recap, sleep / workout / beers tiles, productive and focus labels, "Open day" link.
- `JournalCalendar` behavior:
  - Month header ‹ › (and swipe: horizontal touch move over 60px), plus a "Today" link when not on the current month.
  - Stats strip (tapping a stat switches the layer).
  - Chips: one layer at a time, remembered in localStorage `dd.layer` with try/catch. Legend under the chips.
  - Cells:
    - Saved day: score number plus `dayIcons`.
    - Empty past day: dashed.
    - Today: accent ring.
    - Future: 30% opacity, not tappable.
    - `?tag=`: days without the tag dimmed to 25%, with a "Showing days tagged {tag} ✕" chip.
  - Interaction:
    - Phone: tap opens `/day/{date}`; press-and-hold (500ms) opens `DayPreview` in a bottom sheet.
    - Computer (lg): click selects the day (outline) and shows `DayPreview` in a right panel with month stats under it.
    - Keys: ←/→ months, 1-6 layers, T today, ↑/↓ day by day, Esc clears.
  - Insight card under the calendar: `insightLine`, or `COPY.stillLearning(n)` when null and under 14. It links to `/insights`.

- [ ] **Step 1: Failing tests:**
  - `cellStyle('mood', d8).background === scoreColor(8)`.
  - `cellStyle('productive', { ...d, productive: null }).empty === true`.
  - `cellStyle('sleep', noHours).empty === true`.
  - `cellStyle('drinks', zeroDrinks).background === 'var(--surface)'`.
  - `monthStats([])` → `{ avgScore: null, avgSleep: null, workouts: 0, beers: 0 }`.
  - `monthStats` over a 3-day fixture gives the exact averages.
  - `dayIcons` for a workout day with 4 drinks returns `'🏋️🍺'`.
  - `insightLine(fixture, 10) === null`.
  - `insightLine` on the 10-day journal fixture from `tests/journal.test.ts` (with totalSaved 20) returns the workout sentence.
- [ ] **Step 2:** Run; FAIL.
- [ ] **Step 3:** Implement the lib, then the components and the page.
- [ ] **Step 4:** Tests pass; build passes.
- [ ] **Step 5:** Commit.

### Task 5: Today

**Files:**
- Create: `lib/today.ts`, `tests/today.test.ts`, `components/WeekCard.tsx`
- Modify: `app/page.tsx`, `lib/stats.ts`

**Interfaces:**
- Produces: `bestStreak(days: DayRow[]): number` (longest run of consecutive saved dates).
- Produces: `startButton(nowMin: number, debriefMin: number, saved: boolean): 'hidden' | 'normal' | 'prominent'`. Minutes since midnight in the user's zone. Saved → hidden; before 12:00 → hidden; from `debriefMin - 60` (or after midnight before 4am) → prominent; else normal.
- `WeekCard({ bars, streak, best, sleepAvg, firstTime? })`:
  - 7 bars; today ringed; gaps dashed; each bar links to its day.
  - Header: `streakLabel(streak)` · `💤 {sleepAvg}h avg`.
  - `firstTime` shows `COPY.firstDebrief(time)` instead of bars.
- Today page:
  - Not saved:
    - Date line, then `greetingFor(hour, false)`, profile name.
    - "Tonight's debrief" card: debrief time, plus the Start button per `startButton` (`prominent` = full-width accent at the top; `normal` = small "Start now"; `hidden` = no button and a quiet 🌙).
    - WeekCard. Insight card from `insightLine` (hidden under 14).
  - Saved:
    - `greetingFor(hour, true)`.
    - A card with the score circle, `COPY.saved`, the recap, and "View day" + "＋ Add something" (→ `/debrief?date=`).
    - WeekCard. A streak card with `streakLabel` and "best: {n}".
  - Computer (lg): two columns. Left: greeting and the tonight / saved card. Right: WeekCard, yesterday at a glance (score + recap, links to the day), and the insight.

- [ ] **Step 1: Failing tests:**
  - `startButton(9*60, 21*60+30, false) === 'hidden'`.
  - `startButton(13*60, 21*60+30, false) === 'normal'`.
  - `startButton(21*60, 21*60+30, false) === 'prominent'`.
  - `startButton(1*60, 21*60+30, false) === 'prominent'`.
  - `startButton(21*60, 21*60+30, true) === 'hidden'`.
  - `bestStreak` over saved dates `10-01,10-02,10-03,10-05,10-06` is `3`.
- [ ] **Step 2:** Run; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests pass; build passes.
- [ ] **Step 5:** Commit.

### Task 6: Debrief ratings, progress, and voice

**Files:**
- Create: `components/RatingPicker.tsx`, `tests/progress.test.ts`
- Modify: `components/Debrief.tsx`, `components/ScorePicker.tsx` (no change in behavior), `lib/topics.ts`

**Interfaces:**
- Consumes: `PRODUCTIVE_LABELS`, `FOCUS_LABELS`, the questions, `COPY`, `profiles.ratings_on` (the page passes `ratingsOn` to `Debrief`).
- Produces: `progressFilled(covered: string[], skipped: string[]): number`, filled segments of 12 (unique covered ∪ skipped, max 12), in `lib/topics.ts`.
- `RatingPicker({ labels, value, onPick })`: 4 equal buttons; selected is sage. Tapping the selected one clears it.
- The score phase becomes one screen:
  - The score grid with `SCORE_QUESTION` as the heading.
  - When `ratingsOn`: then "⚡ Get stuff done?" and "🎯 Were you locked in?" pickers, and a "Next: review" button (enabled once a score is picked).
  - When `ratingsOn` is false: tapping a score goes straight to summarizing, as today.
- The review and save calls include `productive` and `focus`. A day being debriefed whose date is older than yesterday sends `fromMemory: true`, and the review heading says "From memory" above "Here's your day".
- The top of the debrief shows 12 thin progress segments (`progressFilled`) instead of "Question X of about Y". The Talk notice keeps its current text until M5.
- Computer (lg): a right panel "TONIGHT SO FAR · {n} OF 12" listing `TOPICS` labels with ✓ for covered, — for skipped, ○ for open. Type mode by default on lg (only when no saved preference exists).
- Copy: the save button says "Lock it in". On success it routes to `/day/{date}?saved=1`, and the day page shows a one-time "Locked in ✓" banner.

- [ ] **Step 1: Failing tests:** `progressFilled(['food','sleep'], ['weed']) === 3`; `progressFilled` of all 12 topic ids plus a duplicate is `12`.
- [ ] **Step 2:** Run; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests pass; build passes.
- [ ] **Step 5:** Commit.

### Task 7: Day page

**Files:**
- Create: `lib/day-page.ts`, `tests/day-page.test.ts`, `components/DayMenu.tsx`
- Modify: `components/DayDetail.tsx`, `app/day/[date]/page.tsx`, `app/api/days/[date]/route.ts` (add `DELETE`)

**Interfaces:**
- Produces: `dayNeighbors(date: string, today: string): { prev: string; next: string | null }` (next is null when it would be after today).
- Produces: `filledSections(s: DaySummary): { key: string; icon: string; title: string; body: string }[]`. Order: sleep, morning, did, food, workout, drinks (`"{n} beers"` / `"No drinks"`), weed (only if used), work, people, fun, happy, annoyed, standout. Empty ones are left out.
- Produces: `aiQuestion(date: string, score: number): string` → `"Tell me about my day on {Mon D} and what made it a {score}."`.
- `DELETE /api/days/[date]`: deletes the owner's row and returns `{ deleted: true }`; 401 when signed out.
- Day page:
  - Header: ‹ Journal; ‹ date › via `dayNeighbors` (swipe too); •••.
  - Score circle (tap → edit), recap, tags (each links to `/calendar?tag={tag}&month={yyyy-mm}`), productive and focus labels.
  - Quick stats: sleep, workout, beers.
  - Segmented Summary | Chat (Timeline arrives with vibe checks in M4), remembered in localStorage `dd.dayView`.
  - Summary: the `filledSections` cards; tapping a card opens the existing `SummaryForm` editor.
  - Chat: the transcript bubbles, read-only.
- `DayMenu`: a bottom sheet (phone) or dropdown (lg).
  - Items: Edit this day; ＋ Add something to this day; Change the score; Copy a question for your AI (only when `connected`; copies `aiQuestion`); Download this day (the row as `debrief-{date}.json`); Delete this day.
  - Delete confirms inline: "Delete {Mon D}? This can't be undone." with Delete / Cancel. Then `DELETE`, then go to `/calendar?month=`.
- Empty day:
  - `COPY.emptyDay` with "Debrief this day".
  - Older than yesterday: the label "Add it from memory" and the link `/debrief?date=` (Task 6 sets `fromMemory`).
- Computer (lg): no segmented control. Sections in a 3-column grid; Chat in a right column. Keys ←/→ days, E edit, Esc back to the Journal.

- [ ] **Step 1: Failing tests:**
  - `dayNeighbors('2026-10-27','2026-10-27')` → `{ prev: '2026-10-26', next: null }`.
  - `dayNeighbors('2026-10-31','2026-11-05').next === '2026-11-01'`.
  - `filledSections(emptySummary(5))` has only the drinks entry ("No drinks").
  - A full summary returns keys in the stated order.
  - `aiQuestion('2026-10-23', 10) === 'Tell me about my day on Oct 23 and what made it a 10.'`.
- [ ] **Step 2:** Run; FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Tests pass; build passes.
- [ ] **Step 5:** Commit.

### Task 8: Settings touch-ups, browser check, ship, and process doc

**Files:**
- Modify: `app/settings/page.tsx`, `README.md`, `design/process/build_process_doc.py`, `design/process/img/`

**Interfaces:**
- Settings gets a "Productive + focus ratings" switch (`profiles.ratings_on`, saves on tap with "Saved ✓"). Inside `AppShell` at lg, the content is a centered column. (The full You redesign comes in M6.)

- [ ] **Step 1:** `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build`: all pass.
- [ ] **Step 2: Browser check** (gstack browse) with a throwaway account seeded by `scripts/seed-sample.ts` (plus ratings on some days), at 390px and 1280px:
  - Today; Journal (every layer, stat tap, ?tag filter, the side panel on desktop); a day (Summary / Chat, menu, download, delete); a debrief through the ratings, saved; Insights; You.
  - Confirm Review Focus 1-5. Screenshot each screen at both widths into `design/process/img/m3-*.png`. Delete the user.
- [ ] **Step 3:** Push `main` (commits authored as `kewing8464-commits`); confirm the Vercel deploy is Ready; spot-check production pages.
- [ ] **Step 4: Process doc.** Add section "8. Building v2, Milestone 3". Content: how the plan turned the mockups into tasks; test-first building; the browser check at phone and computer widths; real screenshots next to the matching mockups; what the final reviewer caught. Rebuild; commit.
- [ ] **Step 5:** README "What works" updated. Commit.
