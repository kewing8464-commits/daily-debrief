"""Builds the Canvas submission package for Daily Debrief (Word), in OneDrive.

Run: python3 design/process/build_submission_doc.py
"""
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
SHOTS = ROOT / '.superpowers/shots/final'
OUT = Path.home() / 'Library/CloudStorage/OneDrive-MontanaStateUniversity/Applied Data Science/Daily Debrief - Project Submission.docx'

URL = 'https://daily-debrief-nine.vercel.app'
REPO = 'https://github.com/kewing8464-commits/daily-debrief'
ACCENT = RGBColor(0xB8, 0x4F, 0x25)
GREY = RGBColor(0x6B, 0x64, 0x5C)

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
for side in ('left_margin', 'right_margin', 'top_margin', 'bottom_margin'):
    setattr(sec, side, Inches(0.9))
doc.styles['Normal'].font.name = 'Calibri'
doc.styles['Normal'].font.size = Pt(10.5)
for lvl, size in ((1, 16), (2, 12.5)):
    st = doc.styles[f'Heading {lvl}']
    st.font.name = 'Calibri'
    st.font.size = Pt(size)
    st.font.color.rgb = ACCENT


def p(text='', bold=None, italic=False, color=None, size=None, align=None, after=5):
    para = doc.add_paragraph()
    if bold:
        para.add_run(bold).bold = True
    r = para.add_run(text)
    r.italic = italic
    if color:
        r.font.color.rgb = color
    if size:
        r.font.size = Pt(size)
    if align:
        para.alignment = align
    para.paragraph_format.space_after = Pt(after)
    return para


def bullets(items, style='List Bullet'):
    for it in items:
        para = doc.add_paragraph(style=style)
        if isinstance(it, tuple):
            para.add_run(it[0]).bold = True
            para.add_run(it[1])
        else:
            para.add_run(it)
        para.paragraph_format.space_after = Pt(2)


def shade(cell, fill):
    pr = cell._tc.get_or_add_tcPr()
    s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear')
    s.set(qn('w:color'), 'auto')
    s.set(qn('w:fill'), fill)
    pr.append(s)


def table(header, rows, widths, size=9):
    t = doc.add_table(rows=1 if any(header) else 0, cols=len(header))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(header if any(header) else []):
        c = t.rows[0].cells[i]
        c.text = ''
        run = c.paragraphs[0].add_run(h)
        run.bold = True
        run.font.size = Pt(size)
        shade(c, 'F2EEE7')
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ''
            run = cells[i].paragraphs[0].add_run(v)
            run.font.size = Pt(size)
            if v in ('Pass', 'Match', 'Matched'):
                run.bold = True
                run.font.color.rgb = RGBColor(0x17, 0x8F, 0x6A)
    for row in t.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Inches(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def image(name, width, caption):
    path = SHOTS / name
    if not path.exists():
        p(f'[missing image {name}]', color=GREY)
        return
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.add_run().add_picture(str(path), width=Inches(width))
    p(caption, italic=True, color=GREY, size=8.5, align=WD_ALIGN_PARAGRAPH.CENTER, after=8)


def page_break():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


# ------------------------------------------------------------------ cover + quick start
p('Daily Debrief', size=26, color=ACCENT, after=0).runs[0].bold = True
p('AI Business Intelligence Challenge: project submission', size=13, after=2)
p('Karson Ewing  ·  Applied Data Science, Montana State University  ·  November 16, 2026', color=GREY, after=10)
p('Note: my instructor approved submitting Daily Debrief, my own AI analytics app, in place of the E-Presso dashboard. '
  'Each required item below is answered for Daily Debrief, with the equivalent evidence where the original item was E-Presso specific.',
  italic=True, color=GREY, size=9.5, after=10)

doc.add_heading('Try it in 2 minutes', 2)
table(['', ''], [
    ['App', URL],
    ['Demo login', 'Email: demo@example.com    Password: VibeCheck-2026'],
    ['What is in it', 'Sample data for October 1 to November 15, 2026. Today is left empty so you can try a real debrief.'],
    ['Code', REPO],
], [1.3, 5.4], size=10)
bullets([
    ('Today: ', 'tap Start (or Start early) to do a 5-minute AI debrief by typing or talking. Add a "vibe check" with the + button.'),
    ('Journal: ', 'the color calendar. Switch layers (Mood, Productive, Focus, Sleep, Drinks, Gym). Tap a day for its summary, timeline and full conversation.'),
    ('Insights: ', '"Your recipe for a good day" ranks what lines up with better or worse days. Tap a factor to see every day behind it. Hover or tap the trend chart.'),
    ('You: ', 'Light / Dark / Match-my-phone appearance, reminders, and "Connect your AI" to ask Claude or ChatGPT about the journal.'),
    ('Your own account: ', 'tap "New here? Create an account" on the login page to start from zero.'),
])

# ------------------------------------------------------------------ 1
doc.add_heading('1. Live application URL', 1)
p(URL, bold='Link: ')
bullets([
    'Hosted on Vercel (free tier) with a Supabase database and Groq AI models. No personal development environment or private credentials are needed to test it.',
    'Verified on November 16, 2026 at phone (390 px) and laptop (1366 px) widths: every screen loaded with no errors and no browser console errors.',
    'Works in any modern browser. On iPhone it can be installed with Share, then Add to Home Screen, which also enables nightly reminders.',
    'The app will stay deployed and the repository intact until grades are posted.',
])

# ------------------------------------------------------------------ 2
doc.add_heading('2. GitHub repository', 1)
p(REPO, bold='Link: ')
bullets([
    ('Access: ', '[KARSON: the repository is private. Either make it public, or add the instructor as a collaborator, before submitting.]'),
    ('README: ', 'what works, setup steps, how to connect an AI, and development notes.'),
    ('Dependencies: ', 'package.json and package-lock.json (Next.js 16, React 19, Supabase, Zod, web-push, Vitest).'),
    ('Reproduce: ', 'create a free Supabase project and run supabase/migrations 0001 to 0005, copy .env.local.example to .env.local and fill in your own keys, then npm install and npm run dev.'),
    ('No secrets: ', 'no API keys or credentials are in the code. A scan of the full commit history found none, and .env files are git-ignored.'),
    ('Tests: ', '156 automated tests (npm test), all passing. Plus database checks: scripts/check-rls.ts (privacy between accounts), check-connector.ts, check-reminders.ts.'),
    ('Revision history: ', '61 commits from October 27 to November 13, 2026, each describing one change, with the design spec, decision log and build plans in docs/superpowers.'),
])

# ------------------------------------------------------------------ 3
page_break()
doc.add_heading('3. Validation evidence', 1)
p('Daily Debrief has no Power BI report, so the equivalent check is: the numbers the app shows versus the same numbers recalculated '
  'independently, straight from the raw database rows with a separate Python script that shares no code with the app.')
doc.add_heading('A. App versus independent recalculation (demo account, November 1 to 15)', 2)
table(['Measure', 'App shows (Insights)', 'Independent recalculation', 'Result'], [
    ['Saved debriefs', '15', '15 rows', 'Match'],
    ['Average day score', '6.6', '99 / 15 = 6.60', 'Match'],
    ['Great days (score 8+)', '7', '7', 'Match'],
    ['Rough days (score 4 or lower)', '4', '4', 'Match'],
    ['Weed days vs average', '−2.4 (5 days)', 'with-average 4.2, minus 6.6 = −2.4', 'Match'],
    ['Slept under 6h vs average', '−3.3 (4 days)', 'with-average 3.25, minus 6.6 = −3.35', 'Match (see note 1)'],
    ['Outdoors days vs average', '+2.7 (4 days)', 'with-average 9.25, minus 6.6 = +2.65', 'Match (see note 1)'],
], [2.0, 1.4, 2.3, 1.0])
p('Independently verified calculation, in full: November has 15 saved days whose scores sum to 99, so the average day is 99 / 15 = 6.6. '
  'The 4 short-sleep days scored 3, 3, 3 and 4 (total 13, average 3.25), which is 3.35 below the average. Rounded to one decimal, the app shows −3.3.', size=9.5)
doc.add_heading('B. Modified-data test (the equivalent of the $1,000 test)', 2)
p('I changed one value on purpose, wrote down the expected result before looking, checked the live app, then changed it back. No code was changed.')
table(['Step', 'Detail'], [
    ['Change', 'Demo account, November 12: day score 9 changed to 5 (a change of −4).'],
    ['Prediction (written first)', 'Total 99 becomes 95, so the average goes 6.6 to 95 / 15 = 6.3. Great days go 7 to 6 (a 9 counted as great; a 5 does not). Rough days stay 4 (a 5 is not rough).'],
    ['Actual (live app)', 'Average day 6.3 · 15 debriefs · 6 great · 4 rough.'],
    ['Result', 'Matched'],
    ['Reverted', 'Score set back to 9. Live app shows 6.6 · 7 great · 4 rough again.'],
], [1.6, 5.1])
image('val-before-crop.png', 3.2, 'Insights before the change (average 6.6, 7 great).')
image('val-after-crop.png', 3.2, 'Insights after the change (average 6.3, 6 great). Same code, different data.')
doc.add_heading('Discrepancies and limitations', 2)
bullets([
    ('1. Rounding convention. ', 'Two factors differ by 0.1 if you recalculate with Python\'s round(), because Python rounds exact halves to the nearest even digit (3.25 to 3.2) while the app rounds halves up (3.25 to 3.3), the usual convention. With the same rounding, every number matches.'),
    ('2. Sample-data quality. ', 'The demo journal is generated sample data. Its generator picks the day\'s story and its workout field separately, so a few days say "gym" in the text but record no workout. This affects the demo data, not the app\'s math.'),
    ('3. Small samples. ', 'A factor needs only 4 days on each side to appear. Results with few days can be noise; the app always shows the day count and says patterns are not proof of cause.'),
    ('4. AI-written summaries. ', 'Each night an AI turns the conversation into structured fields (sleep, drinks, food). It can misread, so the person reviews and edits the summary before saving.'),
    ('5. Not built yet. ', 'Calories and nutrition are not estimated yet, so the app cannot answer calorie questions.'),
])

# ------------------------------------------------------------------ 4
page_break()
doc.add_heading('4. Agent testing evidence', 1)
p('How the agent gets its answers: Daily Debrief is a standard AI connector (an MCP server). Claude or ChatGPT answers questions about the journal by '
  'calling six read-only analysis functions that run inside the app: get_journal_overview, get_days, get_day, search_entries, get_trends and compare_days. '
  'The numbers come from those functions, which run the same tested code as the Insights tab, not from the AI. The tests below were run through the live '
  'connector on November 16, 2026 (October 1 to 31 data), and every number was checked against the database independently.')
table(['#', 'Type and question', 'Function used', 'Expected', 'Actual result', 'Outcome', 'Revision'], [
    ['1', 'Numerical: What was my average day score in October?', 'get_journal_overview (Oct 1 to 31)',
     '22 debriefs; database total 141 / 22 = 6.41', '22 debriefs, averageScore 6.4', 'Pass',
     'Earlier fix: asking for "everything" (2000 to 2099) returned nothing; ranges now stop at today.'],
    ['2', 'Comparison: What do my best days have in common vs my rough days?', 'compare_days (score 8+ vs 4 or lower)',
     'Good: 9 days, avg 9.11, workout 100%, 0.67 drinks. Rough: 7 days, avg 3.0, 5.57 drinks, weed 86%',
     'Good: 9 days, 9.1, workout 1.0, 0.7 drinks. Rough: 7 days, 3.0, 5.6 drinks, weed 0.9', 'Pass',
     'Earlier fix: "also true" listed facts true by definition; now only real co-occurring habits.'],
    ['3', 'Missing information: How many calories did I eat on October 20?', 'get_day (2026-10-20)',
     'No calorie data exists, so no calorie number; say it is not tracked and list the foods', 'Returns foods (oatmeal with banana, turkey sandwich, salmon and veggies) and no calorie field', 'Pass',
     'By design: no nutrition tool until calories are built, so nothing can be invented.'],
    ['4', 'Judgment: Does working out cause my good days?', 'compare_days (workout vs no workout)',
     'Show the difference, note confounders, refuse to claim cause',
     'Workout days 8.7 vs 4.1, but also 7.7h vs 5.6h sleep and 0.7 vs 3.9 drinks; caveat: "patterns in your own entries, not proof of cause and effect"', 'Pass',
     'Caveat built into every comparison result.'],
    ['5', 'Updated data: Same October questions after changing Oct 25 from 9 to 5', 'get_journal_overview, compare_days, get_trends',
     'Average (141 − 4) / 22 = 6.2; good days 9 to 8; Oct 25 shows 5', 'averageScore 6.2; good days 8; Oct 25 value 5', 'Pass',
     'Then reverted to 9; database back to 141 / 22.'],
], [0.25, 1.35, 0.95, 1.25, 1.35, 0.5, 1.05], size=8)
doc.add_heading('Why the answers are real calculations, not made up', 2)
bullets([
    'Every function returns the exact date range it covered, so each answer can be checked.',
    'The connector is read-only: the AI cannot change or delete anything, and it only sees saved days for the account whose private link is used.',
    'The same functions have 156 automated tests behind them, including edge cases (empty periods, reversed dates, a full year of data, a new user).',
    'Test 5 shows the answer follows the data: one database change moved every affected number exactly as predicted, with no code change.',
])
doc.add_heading('The in-app AI (the nightly interviewer)', 2)
bullets([
    'It skips topics already covered by the day\'s "vibe checks" and asks about the rest. If the AI service is down, a built-in question script takes over, so a debrief never gets stuck (tested).',
    'Spoken answers are transcribed by Whisper; a sentence recorded in iPhone audio format came back word for word.',
    'Live check: the answer "watched football with Jake, ate wings and had 4 beers" produced a summary with 4 drinks, wings and Jake.',
])

# ------------------------------------------------------------------ 5
page_break()
doc.add_heading('5. Development reflection', 1)
for para in open(ROOT / 'design/process/reflection.txt').read().strip().split('\n\n'):
    p(para, after=7)

# ------------------------------------------------------------------ 6
doc.add_heading('6. Team contribution and project defense', 1)
table(['Team member', 'Responsibilities', 'Key calculation or decision I can explain'], [
    ['Karson Ewing', 'Product idea, requirements and design decisions; directed the AI build; tested on phone and laptop; validation and agent tests', '[KARSON: pick one, e.g. how "Your recipe" scores a factor]'],
    ['[Add teammates if any]', '', ''],
], [1.6, 2.7, 2.4])
p('Be ready to explain in the oral check:', after=1).runs[0].bold = True
bullets([
    ('The recipe score: ', 'average score on days with a factor, minus the average of all days in the period; a factor needs 4+ days on each side.'),
    ('Where answers come from: ', 'the AI calls the app\'s read-only functions; it never computes or invents the numbers itself.'),
    ('The modified-data test: ', 'one score changed by −4 moves the 15-day average by −4 / 15 ≈ −0.27 (6.6 to 6.3) and the great-day count by one.'),
    ('Limits: ', 'correlation is not causation, small samples, AI summaries can misread, no calories yet.'),
    ('Privacy: ', 'each account only sees its own rows (database row-level security), and the AI link is read-only and revocable.'),
])
p('Supporting material: the development process journal (Word, in the same OneDrive folder) documents every design and build step with screenshots.', color=GREY, size=9.5)
image('phones4.png', 6.4, 'The app on a phone: Today, Journal, Insights and a single day (demo account).')

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT)
print('wrote', OUT)
