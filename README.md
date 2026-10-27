# Daily Debrief

A five-minute nightly journal with an AI that interviews you about your day: what you ate, how you slept, workouts, beers, weed, work, people, highs and lows. Every debrief becomes a structured day with a 1 to 10 score, so over time you can see what your good days have in common.

Built as a free web app you install to your iPhone home screen.

## What works (Milestone 1)

- Sign up, pick your nightly debrief time
- Typed debrief with an AI interviewer that skips what you already covered (scripted questions keep going if the AI is down)
- Quick-tap answers, Skip, End early, 1 to 10 score, review and edit the summary, save
- Picks up where you left off if the app closes mid-debrief; reopening a saved day adds to it
- Home (tonight's status, week bars, streak, sleep average), Calendar, Day view with edit, Settings, data export

Coming next: connect your own AI (Claude, ChatGPT) to your journal, voice, notifications, nutrition estimates, monthly reports.

## Setup

1. **Supabase** (free): create a project, then in the SQL editor run `supabase/migrations/0001_init.sql`, then `0002_connector.sql`. In Authentication > Sign In / Providers > Email, turn off "Confirm email".
2. **Groq** (free): create an API key at console.groq.com. In Settings > Data Controls, turn on Zero Data Retention.
3. Copy `.env.local.example` to `.env.local` and fill in the values. Never commit `.env.local`.
4. `npm install`, then `npm run dev` and open http://localhost:3000.

Check that row-level security works: `npx tsx --env-file=.env.local scripts/check-rls.ts` should print `RLS OK`. Check the connector the same way with `scripts/check-connector.ts` (prints `CONNECTOR OK`).

## Connect your AI

In the app, open **You** (Settings) and tap **Create my connector link**. Copy the link (it is shown once), then:

- **Claude:** claude.ai > Settings > Connectors > Add custom connector. Name it Daily Debrief, paste the link, tap Add. Make a Project called My Life, paste the suggested instructions from the app, and turn on Daily Debrief in your chats.
- **ChatGPT:** Settings > Apps & Connectors > Advanced > Developer mode on. Then Create, paste the link, choose No authentication.

The link is a read-only MCP server (`app/api/mcp/[token]`) with six tools: `get_journal_overview`, `get_days`, `get_day`, `search_entries`, `get_trends`, `compare_days`. It only sees saved days. Only a hash of the link is stored; Replace or Revoke stops the old link right away.

## Install on iPhone

Open the app's URL in Safari, tap Share, then **Add to Home Screen**. Open it from the icon.

## Development

- `npm test` runs the unit tests (Vitest).
- Business logic lives in `lib/` (pure functions, tested). Pages in `app/` stay thin.
- All AI calls go through `lib/ai/provider.ts` (`ChatModel`), so the provider can be swapped.
- Design tokens come from `design/chosen-design.json`.

Design and plans: `docs/superpowers/specs/` and `docs/superpowers/plans/`.
