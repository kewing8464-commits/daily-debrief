# Daily Debrief v2: full app design

Date: 2026-10-28. Owner: Karson Ewing. Status: draft for Karson's review (builder check done; his answers folded in).

Builds on the v1 design (`2026-10-27-daily-debrief-design.md`, still binding where this document is silent) and the shipped Milestones 1 (typed debrief, calendar, day view) and 2 (Connect your AI connector).

**The screen-by-screen decisions are in `2026-10-28-app-design-decisions.md`.** That log is part of this spec and binding: every control, state, and piece of copy listed there was decided with Karson while looking at annotated mockups. This document adds the intent, scope, data, build order, and the calls Karson has not made.

## 1. Intent

v1 proved the loop: talk about your day at night, get a structured record, ask your own AI about it. v2 turns that into an app people want to open:
- It shows more at a glance without tapping into every day.
- It captures moments during the day (vibe checks), not just at night.
- It tracks food, weight, productivity and focus with no extra logging work.
- It explains what makes your good days good.
- It works as well on a computer as on a phone.
- It sounds like a chill friend, not a form.

Karson is the first user. Classmates (iPhone and Android) come next, behind invite codes. It may become a real product, so it should be built like one.

## 2. Goals, non-goals, anti-goals

**Goals**
1. Every screen in the decisions log, on phone (under 768px), tablet (768 to 1023px), and computer (1024px+) layouts.
2. Vibe checks: notes during the day that the night debrief builds on.
3. Ratings: the day score plus optional productive and focus ratings.
4. Food tracker (calories and macros estimated from what was said, drinks included) compared against maintenance; weight tracking with a reality check.
5. Insights: "Your recipe for a good day", pattern detail, trends, people, and food insights.
6. Voice debriefs (talk), reminders (web push), invite-only signup with first-time setup.
7. The new voice everywhere (chill for the fun parts, plain for practical and private parts).
8. Still $0 to run for Karson plus a small class.

**Non-goals (v2)**
- Native App Store or Play Store apps.
- Body composition estimates (parked).
- Sign in with Apple or Google, and two-factor login.
- Sharing between users or social features.
- Editing data through the AI connector.

**Anti-goals** (failure even if it works)
- A normal night takes more than about 5 minutes, or vibe checks feel like logging chores.
- It nags: more than two notifications a night, or anything that guilts the user.
- It claims causes. Patterns are always labeled as patterns.
- It leaks: private details on the lock screen, one user seeing another's data, or a revoked connector link that still works.
- Fake precision: food and weight numbers without "about" and a confidence level.

## 3. Constraints

- Stack stays as shipped: Next.js 16 (proxy.ts, async params; read `node_modules/next/dist/docs/` first), React 19, Tailwind 4, Supabase (auth, Postgres with row-level security), Groq free tier (`openai/gpt-oss-120b`, max_tokens ≥ 1000; Whisper for speech), Vercel Hobby, a PWA installed to the iPhone home screen.
- Vercel Hobby only deploys commits authored by GitHub user `kewing8464-commits` (the repo's local git identity is set for this).
- The Supabase service-role key is never added to Vercel.
- Free tier limits: Groq requests per day and minute, Supabase 500MB database, Vercel function limits. The invite codes keep usage bounded.
- iPhone web push needs iOS 16.4+ and the home-screen app. iPhone may not honor badges or exact delivery times; designs must degrade gracefully.
- The design tokens in `design/chosen-design.json` stay the visual source of truth.
- The existing tests and the connector's six tools keep working. Connector changes are additive.

## 4. Decided with Karson (summary; the log has the details)

- **Journal:** option A, a color calendar with layer chips (Mood, Productive, Focus, Sleep, Food, Drinks, Gym), month stats, an insight card, and a day side panel on computers.
- **Vibe checks:** his idea. Talk or type about 20 seconds; the debrief skips what is covered; editable; "Wrap up" for days with vibe checks but no debrief. Any older empty day can be debriefed from memory, labeled.
- **Today:** changes through the day (morning catch-up, afternoon timeline, after-debrief wrap), this week's bars, streak, one pattern, and a floating "+ Vibe check" button.
- **Food:**
  - Fills itself from speech.
  - Day and Week views against maintenance, with a confidence label.
  - Drinks count as calories.
  - Maintenance comes from a calculator or a typed number; an optional mild goal.
  - The food card can be hidden.
- **Weight:** a trend line plus a reality check that offers a corrected maintenance (the user decides).
- **Debrief:** big mic, auto-stop, live words, Skip, "I'm done", mute, quick answers; then the score, productive and focus ratings; then review and "Locked in ✓". On a computer, typing first with a live topic checklist.
- **Day page:** Summary / Timeline / Chat; a ••• menu (edit, add, change score, copy a question for your AI, download, delete).
- **Insights:** Week / Month / 3 months / Year; ring headline; "Your recipe for a good day" (at least 4 days behind each factor); pattern proof with "Also true" and one "Worth trying"; trends; highlights; people; a 14-debrief threshold; Ask your AI prompts.
- **Food insights:** productive-day plate, calorie sweet spot, next-day effects, food by food (3+ days).
- **You:** grouped settings that save on tap; per-device reminders with Test it; Pause; download everything; delete account by typing DELETE; Send feedback to Karson.
- **Login and setup:** welcome with four promises; email and password; **invite code required while testing**; 5 setup steps (name, time, talk or type, what to track, reminders); "You're in" plus a first vibe check.
- **Notifications:** nightly reminder plus at most one follow-up an hour later; an app badge until the debrief is saved; optional Monday weigh-in; pause. Nothing else is ever sent. No private details on the lock screen unless "Detailed previews" is on.
- **Voice:**
  - Chill friend for the fun parts, plain for practical and private parts.
  - "Vibe check", "How'd today hit?", "Locked in ✓", "That's a wrap 🌙", "Your recipe for a good day".
  - **Light, natural swearing allowed in the AI's replies only.**
  - No guilt, ever.
- **Parked:** body composition.

## 4b. Settled after the builder check (2026-10-28)

**Karson decided:**
- **AI budget:** a smaller, faster Groq model asks the turn-by-turn debrief questions (for example `llama-3.1-8b-instant` or `openai/gpt-oss-20b`; pick by the current free limits). The big model (`openai/gpt-oss-120b`) only writes the night summary and food estimates. Target: $0 for about 20 nightly users. Free gpt-oss-120b is about 1,000 requests and 200K tokens a day per organization, and a debrief is about 30-40K tokens, so the big model alone covers only about 5 users. Check console.groq.com/settings/limits before M3. When a limit is hit, the conversation falls back to the built-in script (already how v1 behaves) and estimates are retried later; the user never sees a dead end.
- **Forgot password:** no reset emails in v2. "Forgot password?" says to message Karson, and Karson resets with a script (`scripts/reset-password.ts`). Real reset emails come later with a custom domain.
- **Food card timing:** fills in during the day. Each vibe check gets one small-model call that tags it and, if it mentions food or drink, estimates it. Estimates are stored on the vibe check and summed into Today's card. The night summary reconciles them into the day's food list, so nothing is counted twice.

**Builder's calls from the check (flag if wrong):**
- **"Live words" in Talk mode** means each answer's words appear right after the auto-stop pause (one Whisper call per answer), not word by word while speaking.
- **The connector sees vibe checks,** including days with vibe checks but no debrief (marked "unwrapped"). Adds `get_vibe_checks(start, end)` and includes unwrapped days in `get_day` and search. Still read-only, still owner-only.

## 5. Data additions (builder's calls, flag if wrong)

All tables use row-level security, owner-only, like `days`.

- `vibe_checks`: id, user_id, day_date (4am rule), created_at, text, mode (talk/type), tags text[], food jsonb (estimated items, nullable), status (active/deleted).
- `days`: add `productive` (1-4, nullable), `focus` (1-4, nullable), `from_memory` boolean.
- The food and drink items live in `days.summary.food` (extended per item: meal, time, kcal, protein, carbs, fat, micronutrients, confidence, is_drink). Plus `days.nutrition` jsonb holding day totals, range, confidence and burned kcal, so the Journal and Insights don't re-sum.
- `weights`: id, user_id, measured_on, lb, source (manual/vibe_check).
- `profiles`:
  - Add first-run fields: setup_completed_at, default_mode, voice_on, ratings_on.
  - Add tracking flags: food_on, weight_on.
  - Add body fields: maintenance_kcal, maintenance_source, goal, age, sex, height_in, activity.
  - Add reminder fields: reminders_paused_until, units, detailed_previews.
- `push_subscriptions`: id, user_id, endpoint, keys, device_label, last_seen_at, reminder_on, followup_on, weighin_on.
- `invite_codes`: code, max_uses, uses, created_by, expires_at. Signup checks and consumes a code in one transaction.
- `feedback`: id, user_id, text, created_at.
- The connector gains `get_nutrition_summary(start, end)`, `get_weights(start, end)`, and productive/focus in the existing tools and metrics.

## 6. Build order (builder's call: each milestone usable before the next)

- **M3: New shell and voice.**
  - Phone tab bar with 4 tabs; computer sidebar.
  - The voice and copy pass.
  - Ratings (productive, focus).
  - Day page redesign.
  - Journal layers (Mood, Productive, Focus, Sleep, Drinks, Gym).
  - Today redesign without the food card.
- **M4: Vibe checks.** Table, panel and inline box; the timeline on Today and the day page; the debrief building on them; Wrap up; calendar dots.
- **M5: Voice debriefs.** Talk mode with Whisper, auto-stop, live words, mute, keep-awake, and the Type fallback.
- **M6: Invite codes, new signup and setup, reminders.** Web push, the 15-minute scheduler, follow-up, badge, pause, Test it.
- **M7: Food, drinks and weight.** Estimates from speech, the Food page, maintenance setup, the Food Journal layer, weight and the reality check, and the connector nutrition tools.
- **M8: Insights.** Recipe factors, pattern detail, trends, people, food insights, the month report card on Today, the PDF download.

## 7. Builder's calls (not made by Karson; flag if wrong)

1. **Build order as in section 6.** The shell and voice come first because every later milestone reuses them.
2. **Productive and focus are stored as 1-4**, with the labels as display text. Both are optional.
3. **Factor math for "Your recipe":** for each candidate factor (boolean or thresholded), the average score of days with it minus the average score of all saved days in the period. Shown if each side has at least 4 days. Rank by absolute difference and show the top 5. "Also true" lists other factors whose rate differs by 30+ points between the two groups. "Worth trying" uses one fixed template per factor family.
4. **Calorie sweet spot:** bin days into 250-kcal bands; the best contiguous 2-band window with 3+ days each.
5. **Food estimates** come from the same Groq model at summary time (and per vibe check tagged Food), using a prompt with standard portion assumptions. Confidence comes from how specific the amounts were.
6. **Maintenance calculator:** Mifflin-St Jeor times an activity factor. Mentioned workouts add an estimate from type and minutes (MET table).
7. **Weight reality check:** after 14+ days with 4+ weigh-ins, compare the 7-day-average trend change to the estimated energy balance (3,500 kcal per lb). Offer a corrected maintenance if they differ by 150+ kcal a day.
8. **Reminder delivery:** a Supabase scheduled function (pg_cron calling an Edge Function) every 15 minutes sends web push with VAPID keys stored as Supabase secrets. "Most recently used device" means the latest last_seen_at.
9. **Invite codes:** Karson creates them with a small script (no admin UI in v2). The same goes for password resets (`scripts/reset-password.ts`).
10. **Send feedback** stores to the `feedback` table, and Karson reads it with a script or the Supabase dashboard.
11. **PDF month download:** browser print to PDF of a print-styled Insights page, not a server PDF.
12. **Tablet:** the phone layout widened; the Journal and the day page get two columns at 768px+.

## 8. Left to the builder

The exact component structure, animation details within the motion rules, the empty, loading and offline states the log doesn't cover (following the patterns it does), the prompt wording for the AI voice (following the voice section), and test strategy per milestone (TDD on all logic, a browser check of each screen at phone and computer widths).

## 9. Risks to check early

- Whisper on Groq: free limits for nightly audio, and the latency on cellular.
- iOS web push reliability and badge support on Karson's iOS version.
- Groq daily request limits with food estimates added. Batch estimates into the summary call where possible.
- Supabase pg_cron and Edge Functions on the free tier.
