# Daily Debrief: design

Date: 2026-10-27. Owner: Karson Ewing. Status: approved by Karson 2026-10-27.

## 1. Intent

A once-a-day voice journal with an AI that interviews you. At the end of the day your phone pings you ("Time for your daily debrief"), you open it in bed, talk (or type) for about five minutes, and you are done until tomorrow. Over weeks, the app shows what your good days and bad days have in common (food, sleep, people, work, workouts, beers, weed) so you can do more of what makes you happy, healthy, and wealthy.

The bigger idea: your AI of choice should *know your life*. The app collects and organizes the data; a custom connector feeds it to Claude (or another AI), where you can ask questions about your life in a dedicated project.

Why once a day: calorie trackers and similar apps fail because they demand input all day. One short conversation at night is the whole commitment.

## 2. Users and rollout

- **Now:** Karson only, on his iPhone, for a while.
- **Later:** classmates (iPhone and Android) to improve it and gather data, then possibly a real product.
- Version 1 is built multi-user from the start (logins, per-user data) so adding people later means sending a link, not a rebuild.

## 3. Goals, non-goals, anti-goals

**Goals (v1)**
1. A nightly debrief that takes about 5 minutes, by voice or typing, switchable at any time.
2. A notification at the time each user picked.
3. Each debrief becomes a structured day record plus the full transcript.
4. Look back: calendar colored by how each day went, a day view, and a monthly report.
5. Macro and micronutrient estimates from what the user said they ate.
6. A custom connector so Claude (or another AI) can read the journal and answer questions about it.
7. Costs $0 to run for one user.

**Non-goals (v1)**
- App Store or Play Store apps. Paid voices. Classmate onboarding. Sharing between users. Editing entries through the connector.

**Anti-goals (would make it a failure even if it works)**
- It takes too long or feels like a chore. Anything that pushes a normal debrief past about 5 minutes is a bug.
- It nags. One notification and at most one gentle reminder per night.
- It claims causes. Insights are patterns ("your best days usually had..."), never "X causes Y".
- It leaks personal data. Entries include alcohol, cannabis, and names of real people.

## 4. Decided with Karson

- **Platform:** free. A web app installed to the iPhone home screen ("Add to Home Screen"), not an App Store app. Real native apps can come later.
- **Input:** talk out loud by default, typing always available. A Talk/Type switch above one Start button on Home, and a Talk/Type switch at the top of the debrief screen.
- **Questions to cover each night (Karson's list):** what you ate through the day; what you did; roughly when you fell asleep and woke up; how you started your day; work meetings; anything fun; what made you happy; what annoyed you ("pissed you off"); beers; weed; workout and what you did; anything standout or cool.
- **Smart, not a form:** skip what the user already covered; keep it conversational.
- **Notification time:** each user picks it during signup and can change it in settings.
- **Look-back screens:** calendar with each day colored by how it went, tap a day for its summary, monthly report showing what consistently came with better days, and the option to ask questions.
- **Nutrition:** macros and micros estimated, only as detailed as what the user said. Vague input gives a rough estimate, labeled as such.
- **AI of choice via connector:** a custom connector (like the one Karson already uses for his realty dashboard) exposes the journal; Karson creates a Claude project and asks about his life there.
- **Design:** the "blend" direction, saved in `design/chosen-design.json`, with a working reference in `design/playground.html`:
  - Dark mode. Background `#2a2828` (charcoal), cards `#2a201b`, text `#f3e8de`, soft text `#a8968a`, accent `#e0895f` (terracotta), accent 2 `#9fc29a` (sage).
  - Serif headlines, rounded sans body, text at 90%, 6px corners, outlined cards, solid buttons.
  - Warm pastel good-day/bad-day colors, rounded-square calendar days, bars for the week chart.
  - Debrief screen: waveform plus chat bubbles. Monthly report headline: a ring.
  - Friendly wording, emoji on.

## 5. Builder's calls (made in conversation, not by Karson; flag if wrong)

1. **Day score:** each debrief ends with "How would you rate today, 1 to 10?" It drives the calendar colors and the good/bad day comparisons. (Confirmed by Karson 2026-10-27.)
2. **Logins from day one,** email and password (magic links open Safari instead of the home-screen app on iPhone, which breaks sign-in).
3. **Free stack:** Next.js web app on Vercel's free plan; Supabase free tier for the database, login, and the scheduled job that sends notifications; free AI provider for the in-app conversation.
4. **In-app AI:** a free provider whose free tier does not train on user data (Groq is the first candidate; verify its current terms and limits before relying on it). Gemini's free tier is the fallback only if its terms are acceptable. Built behind one small interface so the provider can be swapped.
5. **Voice:** recorded in the browser and transcribed by a free speech-to-text service (Groq's Whisper is the first candidate) because the browser's built-in speech recognition is unreliable in iPhone home-screen apps. The AI's questions are read aloud with the phone's built-in voice. If voice fails, the app falls back to typing, where the iPhone keyboard mic still works.
6. **Conversation:** a script of the topics above, with the AI deciding after each answer which topics are already covered and phrasing the next question naturally. If the AI is unavailable, the script continues on its own so a debrief always finishes.
7. **Summary:** after the conversation, one AI call turns the transcript into the structured day record (section 6). The user sees it and can correct anything before it is saved.
8. **Insights:** the monthly report is computed with plain math first (for example, share of 8+ days with a morning workout vs share of 5-or-lower days), then the AI writes it in plain sentences. Needs about 14 debriefs before it shows patterns; before that it says how many more days it needs.
9. **Connector:** read-only, per user, protected by a long secret in the connector URL for v1 (custom connectors accept a URL). Proper OAuth sign-in for the connector comes later. Built as a standard MCP server so any MCP-capable AI app can use it, not just Claude.
10. **Notifications:** iPhone web-app push (works only after Add to Home Screen, iOS 16.4+). A scheduled job runs every 15 minutes and sends to users whose time has come in their time zone. If the debrief is not done 60 minutes later, one reminder; nothing after that. iPhone does not let a web app pin a notification as "important", so the reminder stands in for that.
11. **Privacy:** each user can only read their own rows (enforced in the database). Export all data and delete account are in settings. No analytics on entry content.
12. **Which day a debrief belongs to:** a debrief started before 4:00 am counts toward the previous day (late nights). One debrief per day; opening it again the same day adds to it instead of starting over.
13. **Missed days and edits:** a missed day stays blank (outlined on the calendar). The user can debrief yesterday the next morning. Any saved day can be edited from the day view.
14. **Hosting address:** the free `*.vercel.app` address for v1; a custom domain later if wanted.
15. **Accounts Karson will need to create (free):** Supabase, and the AI provider (for an API key). Vercel and GitHub already exist (use the `kewing8464-commits` GitHub account; the repo is private because it is a personal app).

## 6. What a saved day contains

- Date, time of debrief, talk or type, length in minutes.
- Day score 1 to 10.
- Sleep: bedtime and wake time as stated (approximate is fine), hours.
- Morning: how the day started (text).
- Food: list of items with whatever amounts were given; per item and daily estimated calories, protein, carbs, fat, fiber, sugar, sodium, and the micronutrients that can reasonably be estimated; a confidence level (rough / fair / good) based on how specific the user was.
- Workout: yes/no, type, duration.
- Alcohol: count of drinks and type. Cannabis: yes/no and amount as stated.
- Work: meetings count, what went well, what did not; work tasks enjoyed and not enjoyed.
- People: who they spent time with, tagged as positive, negative, or neutral interactions.
- Fun, happy moments, annoyances, standout moments (short texts).
- Tags the AI extracts for pattern finding (for example "outdoors", "hunting", "showing").
- Full transcript.

## 7. Screens (v1)

1. **Sign up / log in**, then a short setup: name, debrief time, time zone (auto-detected), allow notifications, add to home screen instructions.
2. **Home:** greeting, tonight's debrief status with the Talk/Type switch and Start button, this week's bars, streak and sleep average, one insight.
3. **Debrief:** progress ("question 4 of about 8"), chat bubbles, waveform and mic in Talk mode, text box plus quick-tap answers in Type mode (for example None / 1-2 beers / 3+ beers / Some weed), Skip, End. Ends with the day score, then the summary to review and save.
4. **Calendar:** month view with days colored by score; tap a day.
5. **Day view:** score, summary rows, nutrition card with estimate labels, people, highs and lows, full transcript.
6. **Monthly report:** ring with average score and great-day count, "what lifts you up", "what weighs you down", one idea for next month, and a box to ask a question.
7. **Settings:** debrief time, voice on/off, connector (show and regenerate the secret URL, with setup steps for Claude), export data, delete account, log out.

## 8. Connector: talk to your LLM of choice about your life (read-only tools)

This is the core of the product, not an extra. Every user can connect **the AI they already use** to their Daily Debrief data and ask it questions about their own life. The connector is a standard MCP server (the open "custom connector" format), so it works with any AI app that accepts custom connectors: Claude (claude.ai, the Claude apps, Claude Code), ChatGPT (developer mode connectors), and other MCP-capable tools. Settings shows each user their own connector address plus short setup steps for Claude and ChatGPT, and a one-click way to revoke and replace it. The app never needs the user's AI subscription or key for this; their AI app does the talking and reads the journal through the connector.

- `get_day(date)`: one day's record and transcript.
- `get_days(start, end)`: day records in a range.
- `search_entries(text, start?, end?)`: days whose transcript or fields mention something (a person, a food, "hunting").
- `get_trends(metric, start, end)`: daily values of a metric (score, sleep hours, drinks, protein, workout minutes).
- `compare_days(filter_a, filter_b)`: how two groups of days differ (for example score 8+ vs 5-or-lower).
- `get_nutrition_summary(start, end)`: averages and totals of the nutrition estimates.

Every result says the date range it covers and labels nutrition as estimates. Karson then creates a Claude project ("My Life") with this connector and asks questions there.

## 9. Build order (each step usable before the next)

1. Login, setup, and a **typed** debrief that saves a day. Karson can start journaling.
2. Calendar and day view.
3. **The connector** (LLM of choice), with setup steps for Claude and ChatGPT. Moved up because talking to your own AI about your data is the core idea, and it gets more useful with every saved day.
4. Voice: talk mode with transcription and read-aloud.
5. Notifications at the user's time plus one reminder.
6. Nutrition estimates.
7. Monthly report and insights.

## 10. Left to the builder

Exact prompts, database tables, component structure, how the waveform animates, wording of individual questions, icons and app name/logo (Karson prefers generated logos over hand-drawn SVG), and the exact free providers after checking current terms.

## 11. Risks to check early

- Recording audio and push notifications inside an iPhone home-screen app (test both on Karson's iPhone in step 1 or 3).
- Free AI and speech-to-text limits and data-use terms (verify before step 1).
- Vercel and Supabase free plans: scheduled jobs every 15 minutes may need to run in Supabase rather than Vercel.
