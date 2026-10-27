# Daily Debrief: app design decisions (running log)

Started 2026-10-28 in a design session with Karson. Mockups live in `.superpowers/brainstorm/` (local only). This log becomes the full design spec when the session ends.

## Layout everywhere
- Phone (under 768px): bottom tab bar, one column, thumb-reachable, buttons at least 44px.
- Tablet (768 to 1023px): phone layout, wider, two columns where it helps.
- Computer (1024px+): left sidebar instead of tabs, side panels instead of new pages, keyboard shortcuts, hover details.
- Tabs: Today · Journal · Insights (new, holds monthly report and patterns) · You.
- Same look everywhere: chosen-design colors, serif titles, rounded body, 6px corners, 4/8 spacing, quick non-bouncy motion (150 to 250ms).
- Color is never the only signal (numbers or icons alongside).

## Journal (Part 1): option A, color calendar with layers
- Month stats strip (avg day, sleep, workouts, beers); tapping a stat switches the layer.
- Layer chips: Mood, Sleep, Food, Drinks, Gym. One at a time, remembered. Legend changes with the layer.
- Day square: score + small icons (workout, 3+ beers). Tap opens the day; press-and-hold peeks.
- Today has an orange ring; future days faded and not tappable.
- Insight card at the bottom, links to Insights.
- Computer: bigger squares with food emojis and a one-line recap, day side panel instead of navigation, keys 1-5 layers, arrows months, up/down days, T today, Esc.
- Loading skeleton, offline saved copy, Sunday-first weeks.

## Check-ins (Karson's idea)
- Note something any time during the day by talking or typing, about 20 seconds. Time auto-filled, optional tags (Food, Workout, People, Happy, Annoyed, Work, Drinks).
- The night debrief starts from the check-ins and skips what is covered.
- Check-ins are editable or deletable before and after the debrief. The 4am rule applies.
- A day with check-ins but no debrief shows a dot on the calendar and offers "Wrap up" later.
- No extra notifications for check-ins.
- Computer: sidebar button and shortcut N, small corner box; on Today, an inline "What just happened?" box (Enter saves).

## Today (Part 2)
- Changes through the day:
  - Morning: "Wrap up yesterday" card, only if yesterday has check-ins and no debrief, until noon.
  - Afternoon: "Start now" from noon, which grows and moves to the top an hour before debrief time, plus a check-in timeline.
  - After saving: score, recap, View day, Add something.
- This week bars (today ringed, gaps dashed, tap opens the day), streak and best, average sleep.
- "From your journal" pattern card after 14 debriefs.
- Floating "+ Check in" button (hidden after the debrief is saved).
- Greeting follows the time of day; a brand-new user sees "Your first debrief is tonight at ...".

## Food tracker (Part 2b), a side feature
- Estimates come from what is said in check-ins and the debrief; there is no manual logging screen.
- Food card on Today:
  - Ring of calories against maintenance.
  - Protein, carbs and fat bars.
  - A rough/fair/good confidence label.
  - Can be turned off.
- Food page, Day tab:
  - Items grouped by meal and time, each with calories, protein and confidence.
  - "~X left to maintain" with a range; mentioned workouts add calories burned.
  - Tap an item to fix the amount; "+ Add food".
  - Micronutrients one tap deeper.
- Food page, Week tab:
  - Bars against a dashed maintenance line. Colors: sand = under, green = about even, orange = over. Never red.
  - Average per day, the week against maintenance (with rough pounds), protein, days logged.
  - A pattern linking food to scores.
- Days with no food mentioned are left out of averages.
- **Drinks count as calories.** Any beer or other drink mentioned is a food item under a "Drinks" group, with calories by type when stated (light ~100, regular ~150, IPA ~200).
- Settings (You → Food):
  - Maintenance worked out from age, sex, height, weight and activity, or entered directly.
  - Optional goal: lose a little, maintain, or gain a little (about 300 to 500 a day, no aggressive cuts).
- The debrief asks about missing meals, and asks for an amount at most once a night.
- The Journal Food layer colors days by under / even / over.
- Connector tool for calories and protein by day.

## Weight
- A Weight tab on the Food page. Latest weigh-in and the 2-week change from the trend.
- Weigh-in dots plus a 7-day average trend line.
- Reality check after 2 weeks: compares the scale with the food estimates and offers a corrected maintenance. The user chooses; it never changes the number on its own.
- Log weight on the page or by saying it in a check-in. Optional Monday reminder, off by default.

## Debrief (Part 3)
- Talk/Type switch at any time (remembered).
- 12-segment topic progress, with no timer or percentages.
- "From today" check-ins strip.
- Big mic: tap to start and stop, auto-stop after about 2s of silence, live transcript. Skip, I'm done, and a speaker mute (remembered).
- Quick answers for beers and weed; type box; the keyboard mic works.
- Score 1-10 grid in the calendar colors (or say the number).
- Review: recap (tap to rewrite) and editable sections, with empty ones hidden; "Save my day". Offline saves are queued.
- Computer:
  - Conversation in the center, with a live checklist of topics on the right (click to revisit).
  - Type mode by default. Enter sends, Shift+Enter adds a new line, Esc closes and keeps the draft.
- Darkest screen in the app; keep-awake on; answers saved as you go and resumable.
- If the mic is blocked, a hint appears and it switches to Type. If the AI is down, the script continues.
- Long-press your own bubble to edit it. "Writing up your day..." under 5 seconds.

## Day page (Part 4)
- Header:
  - Back, previous/next day (swipe), ••• menu.
  - Score (tap to change), recap, tags (tap to filter the Journal).
  - Quick stats: sleep, workout, calories (opens the day's food), beers.
- Summary / Timeline / Chat views (remembered):
  - Summary shows filled sections only, editable in place.
  - Timeline shows check-ins (orange) and the debrief (green).
  - Chat is read-only.
- ••• menu: Edit, Add something, Change score, Copy a question for your AI (only if connected), Download this day, Delete (confirm once; deletes check-ins too).
- Empty day: calm. Offers "Wrap up" when there are check-ins. Any older empty day can be debriefed "from memory" (labeled). This replaces the earlier yesterday-only rule.
- Computer: sections grid plus a Timeline/Chat column; arrow keys, E to edit, Esc.

## Ratings at the end of the debrief
- Day score 1-10 (required), then two optional one-tap ratings on the same screen:
  - **Productive:** Not / A bit / Solid / Very
  - **Focus:** Scattered / Distracted / Steady / Locked in
- Both can be said out loud too. They add only a few seconds.
- Both appear as Journal layers (chips scroll sideways: Mood, Productive, Focus, Sleep, Food, Drinks, Gym), as Insights comparison targets, and in the connector.

## Insights (Part 5)
- Period: Week / Month (default) / 3 months / Year; month arrows or swipe.
- Headline ring: average day score, a one-line verdict, counts, and the change vs the last period.
- "What moves your days":
  - The top 5 factors as + or − points against your average, each needing at least 4 days.
  - Factors come from the data (workouts, sleep, drinks, weed, people, food, work, tags); nothing is hard-coded.
  - Always shown with the honesty line: patterns, not proof.
- Pattern detail:
  - Averages with vs without, and every day in each group as a colored square (tap to open).
  - "Also true" (things that tend to come together) and at most one gentle "Worth trying".
- Trends: chips for score, sleep, drinks, calories, workouts, weight (and productive, focus); a dot per day plus a 7-day average line. Tap a dot to open the day.
- Highlights: best day, toughest day, best week, longest streak.
- People: average score on days each person comes up.
- Fewer than 14 debriefs: a progress bar instead of patterns.
- Ask your AI: ready-made questions to copy (or a setup link if no connector).
- Computer: a 3-column dashboard; pattern detail in a side panel.
- The 1st of the month shows "Your October report is ready" on Today (no notification).
- No judgment words about weed or drinking.
- Month PDF download.

## Food insights (inside Insights)
- Compare by Great days / Productive days / Focused days.
- "Your plate": what usually shows up on your best days, with counts and timing; the flip side for your slowest days (including the night before).
- Protein compare.
- Calories against score chart, with a personal "sweet spot" range in plain words.
- Next-day effects: late eating, fast food dinner, high protein, and so on.
- Food by food: foods eaten 3+ times, ranked by average score. Tap one to see its days; foods that usually come together are noted.
- Needs about 3 weeks of food mentions.

## You / settings (Part 6)
- Profile (name, email, debrief count, streak).
- Debrief: time, one follow-up reminder (on), start in Talk/Type, AI voice, productive + focus ratings.
- Reminders per device, with Test it. Connect your AI card.
- Food & body: maintenance, goal, food card on Today, weigh-in reminder.
- Your data: download everything; delete account (offers a download, then type DELETE; also revokes the connector).
- More: Install (browser only), time zone, units, help, Send feedback (to Karson), privacy, log out.
- Saves on tap with "Saved ✓". Computer: section list on the left, details on the right.

## Login, signup and setup (Part 7)
- Welcome: name, one sentence, a day-color strip, four promises, Create an account / I already have one. No carousel.
- Sign up:
  - Email and password (8+, show/hide, no symbol rules).
  - **Invite code required while testing (Karson confirmed)**. Codes are made by Karson, each with a use limit.
  - Logs in right away with no email confirmation.
- Log in with plain-language errors. Forgot password emails a link that opens Safari, with a note to come back to the app.
- Setup, 5 steps with progress dots:
  1. Name
  2. Debrief time (8:30 / 9:00 / 9:30 / 10:00 / Other; time zone from the phone)
  3. Talk or type (explain the mic before the iOS prompt; fall back to Type)
  4. What to track (food on, weight off, ratings on; maintenance asked after the first week)
  5. Reminders (Add to Home Screen steps on iPhone, then Allow; "Not now")
- Ready screen: "Your first debrief is tonight at ..." plus "Try a quick check-in".
- Computer: split screen, promise left, form right.
- Later: Sign in with Apple/Google, two-factor.

## Notifications (Part 8)
- At most two a night:
  - The nightly reminder at debrief time: personal and short, skipped if already debriefed.
  - One follow-up 60 minutes later, only if not started. If started but unfinished, it says how far you got.
- Tapping opens straight into the debrief.
- App icon badge "1" until tonight's debrief is saved; clears at 4am.
- Optional Monday 8am weigh-in, off by default.
- Never sent: streak warnings, "you missed a day", the monthly report, marketing, tips.
- Pause reminders: tonight / 3 days / a week / a date. Today shows a Resume button.
- Per device; if several devices are on, only the most recently used one gets the reminder.
- Wording: friendly, short, no guilt, at most one emoji, rotates. Lock-screen text never includes drinks, weed or people's names unless "Detailed previews" is on.
- Checked every 15 minutes in the user's time zone. iOS 16.4+ home-screen app required on iPhone. iOS Focus/Sleep modes are respected.

## Voice (Karson picked A + D)
- Chill-friend voice for the fun parts (reminders, the AI in the debrief, wins); plain words for settings, buttons, errors, privacy and deleting.
- Tone ladder, most playful to most plain: reminders/invites → AI in debrief → wins/streaks → Insights → settings → errors → privacy.
- Names:
  - Check-in → **Vibe check** (button, timeline, how the AI refers to them).
  - Debrief stays Debrief.
  - Tabs stay Today · Journal · Insights · You.
  - "What moves your days" → "Your recipe for a good day".
- Copy:
  - Reminder: "Vibe check 🌙 How'd today hit, Karson?"
  - Score: "How'd today hit? 1 to 10"
  - Productive / focus: "Get stuff done?" / "Were you locked in?"
  - Saved: "Locked in ✓". After the debrief: "That's a wrap 🌙".
  - Follow-up: "Still up? Give me 2 minutes on today."
  - Empty day: "Nothing here. Quiet day?"
  - Yesterday open: "Yesterday's still open. 2 minutes?"
  - Patterns waiting: "Still learning you. 5 more days."
  - Ready screen: "You're in, Karson. First vibe check is tonight at 9:30."
- Say: vibe check, how'd it hit, locked in, that's a wrap, straight, let's hear it, solid, rough one.
- Avoid: journal entry, log your data, user, submit, failed, missed, you forgot, "great job!!".
- Never: guilt, shame, lecturing about drinking or weed, fake hype, more than one emoji per line, piled-up exclamation marks.
- **Light swearing is fine in the AI's replies, kept natural** ("damn, that's a rough one"). Occasional, never aimed at the user, never in notifications, settings or errors.

## Parked for later
- Body composition (fat vs muscle) estimate, with optional waist, smart-scale and photo inputs.

## Still to design
- Nothing. All screens are designed; next comes the full written spec and the build plan.
