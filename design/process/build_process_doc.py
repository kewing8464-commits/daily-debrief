"""Builds Karson's development process journal (Word) from the mockups in img/.

Run:  python3 design/process/build_process_doc.py
Writes to OneDrive (Applied Data Science) so it syncs. To add a new stage, drop
screenshots in img/ and add a section to SECTIONS below, then rerun.
"""
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

HERE = Path(__file__).parent
IMG = HERE / 'img'
OUT = Path.home() / 'Library/CloudStorage/OneDrive-MontanaStateUniversity/Applied Data Science/Daily Debrief - Development Process.docx'

TERRA = RGBColor(0x9A, 0x4F, 0x2E)
GREY = RGBColor(0x6B, 0x6B, 0x6B)

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
for side in ('left_margin', 'right_margin', 'top_margin', 'bottom_margin'):
    setattr(sec, side, Inches(1))

base = doc.styles['Normal']
base.font.name = 'Calibri'
base.font.size = Pt(11)
for lvl, size in ((1, 18), (2, 14), (3, 12)):
    st = doc.styles[f'Heading {lvl}']
    st.font.name = 'Calibri'
    st.font.size = Pt(size)
    st.font.color.rgb = TERRA


def p(text, bold_lead=None, italic=False, color=None, size=None, align=None, space_after=6):
    para = doc.add_paragraph()
    if bold_lead:
        para.add_run(bold_lead).bold = True
    run = para.add_run(text)
    run.italic = italic
    if color:
        run.font.color.rgb = color
    if size:
        run.font.size = Pt(size)
    if align:
        para.alignment = align
    para.paragraph_format.space_after = Pt(space_after)
    return para


def bullets(items):
    for it in items:
        para = doc.add_paragraph(style='List Bullet')
        if isinstance(it, tuple):
            para.add_run(it[0]).bold = True
            para.add_run(it[1])
        else:
            para.add_run(it)


def image(name, width=6.5, caption=None):
    path = IMG / name
    if not path.exists():
        p(f'[missing screenshot: {name}]', color=GREY)
        return
    para = doc.add_paragraph()
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.add_run().add_picture(str(path), width=Inches(width))
    if caption:
        p(caption, italic=True, color=GREY, size=9, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)


def image_row(names, width_each, caption=None):
    table = doc.add_table(rows=1, cols=len(names))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for cell, name in zip(table.rows[0].cells, names):
        para = cell.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if (IMG / name).exists():
            para.add_run().add_picture(str(IMG / name), width=Inches(width_each))
    if caption:
        p(caption, italic=True, color=GREY, size=9, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12)


def shade(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), hex_color)
    tc_pr.append(shd)


def table(header, rows, widths):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = 'Table Grid'
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]
        c.text = ''
        c.paragraphs[0].add_run(h).bold = True
        shade(c, 'F3E8DE')
    for r in rows:
        cells = t.add_row().cells
        for i, v in enumerate(r):
            cells[i].text = v
    for row in t.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Inches(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def page_break():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def decisions(items, title='Decisions I made'):
    p(title, bold_lead=None, space_after=2).runs[0].bold = True
    bullets(items)


# ---------------------------------------------------------------- title page
for _ in range(6):
    doc.add_paragraph()
p('Daily Debrief', size=32, color=TERRA, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4).runs[0].bold = True
p('Development process journal', size=16, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=18)
p('How I designed and built an AI-powered life journal by directing an AI coding agent, '
  'from first idea to a working app.', italic=True, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=30)
p('Karson Ewing', size=13, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2).runs[0].bold = True
p('Montana State University · Applied Data Science', align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
p(f'Last updated {date.today():%B %-d, %Y}', color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER)
page_break()

# ---------------------------------------------------------------- 1. idea
doc.add_heading('1. The idea', 1)
p('Most tracking apps fail because they ask for input all day. Daily Debrief asks for one short '
  'conversation at night. An AI interviews you about your day (food, sleep, workouts, work, people, '
  'drinks, what made you happy and what annoyed you), then turns it into structured data.')
p('Over weeks, the app shows what your good days have in common so you can do more of what makes you '
  'happy, healthy and productive. The bigger idea: your own AI assistant (Claude, ChatGPT) can read your '
  'journal through a private connector, so you can ask it questions about your life using real data.')
table(['Goal', 'What it means'], [
    ['Takes about 5 minutes', 'One nightly debrief by voice or typing. Anything longer is a bug.'],
    ['Learns what makes good days', 'Compares great days and rough days across everything you mention.'],
    ['Works with any AI', 'A standard connector (MCP) so Claude or ChatGPT can analyze the journal.'],
    ['Free to run', 'Built entirely on free tiers: Vercel, Supabase, Groq.'],
], [2.0, 4.5])

# ---------------------------------------------------------------- 2. workflow
doc.add_heading('2. How I work: directing an AI to build software', 1)
p('I build by describing what I want to Claude Code, an AI coding agent, and making the product '
  'decisions while it writes the code. People call this "vibe coding." I added structure to it so the '
  'result is reliable, not just fast:')
table(['Step', 'What happens', 'My role'], [
    ['1. Brainstorm', 'The AI asks one question at a time about what I want and why.', 'Explain the idea and the real use case'],
    ['2. Visual mockups', 'It shows options side by side in a browser tab.', 'Pick, mix and redirect'],
    ['3. Written spec', 'Everything decided goes into a design document.', 'Approve or correct it'],
    ['4. Build plan', 'The spec becomes small tasks, each with tests.', 'Review scope'],
    ['5. Build with tests', 'Each feature is written test-first, then checked in a real browser.', 'Use it, give feedback'],
    ['6. Independent review', 'A second AI reviewer reads the finished code fresh, looking for bugs.', 'Decide what to fix now vs later'],
    ['7. Ship and use it', 'Deployed live and used on my iPhone every night.', 'Real-world testing'],
], [1.4, 3.2, 1.9])
p('Tools: Claude Code (AI agent), Next.js and React (web app), Supabase (database and login), '
  'Groq (free AI model for the conversation), Vercel (hosting), GitHub (version control), '
  'and the Model Context Protocol (MCP) for the AI connector.', color=GREY, size=10)

# ---------------------------------------------------------------- 3. timeline
doc.add_heading('3. Timeline', 1)
table(['When', 'Milestone'], [
    ['Oct 26, 2026', 'Idea, questions, and three visual directions explored'],
    ['Oct 26, 2026', 'Picked a direction and fine-tuned it in an interactive design playground'],
    ['Oct 27, 2026', 'Milestone 1 live: typed nightly debrief, calendar, day view (64 automated tests)'],
    ['Oct 27, 2026', 'Milestone 2 live: "Connect your AI" connector for Claude and ChatGPT (93 tests)'],
    ['Oct 27 to 28, 2026', 'Full design spec, screen by screen, for phone and computer'],
    ['Next', 'Build the redesigned screens, voice debriefs, reminders, food and weight tracking'],
], [1.7, 4.8])
page_break()

# ---------------------------------------------------------------- 4. design
doc.add_heading('4. Finding the look', 1)
doc.add_heading('4.1 Three directions', 2)
p('Before writing any code I asked for full app mockups in very different styles: techie, soft and '
  'personal, and bold. Seeing them side by side made it obvious what I did and did not want.')
image('styles2.png', 4.4, 'Three style directions, each shown as a full set of app screens.')
doc.add_heading('4.2 Tuning it myself', 2)
p('I liked parts of two directions, so I asked for a playground where I could switch colors, fonts, '
  'corner shapes and chart styles myself. I adjusted the background color twice before locking it in: '
  'warm charcoal, terracotta orange, and sage green, with serif headings.')
image('pg4.png', 6.5, 'The design playground with my final settings.')
page_break()

doc.add_heading('5. Version 1: the first working app', 1)
p('Milestone 1 was the smallest version I could use every night: sign up, pick a debrief time, have '
  'a typed conversation with the AI, review the summary it writes, and look back on a calendar.')
image_row(['dd-setup.png', 'dd-home.png', 'dd-debrief1.png'], 1.25,
          'Setup, home, and the nightly conversation (live app).')
image_row(['dd-review.png', 'dd-cal.png', 'dd-day.png'], 1.25,
          'Reviewing the AI summary, the calendar, and a saved day (live app).')
decisions([
    ('Score every day 1 to 10. ', 'Simple, and it powers every comparison later.'),
    ('The AI skips what you already said. ', 'It feels like a conversation, not a form.'),
    ('It never gets stuck. ', 'If the AI service is down, a built-in script finishes the debrief.'),
])
page_break()

doc.add_heading('6. Connect your AI', 1)
p('This is the core idea. Each user can create a private link and add it to Claude or ChatGPT as a '
  'custom connector. The AI can then read the journal (read-only) and answer questions like "What do my '
  'best days have in common?" I built it as a standard MCP server so it works with any AI app.')
image_row(['m2-settings-2.png', 'm2-settings-3.png'], 1.9,
          'Creating a private connector link, and the step-by-step setup guide for Claude.')
decisions([
    ('Only saved days are visible, never drafts. ', 'Privacy by default.'),
    ('The link is stored scrambled (hashed). ', 'Even a database leak would not expose working links.'),
    ('Replace or revoke any time. ', 'The old link stops working instantly.'),
])
p('An independent AI code review caught four real problems before launch, including a case where asking '
  'for "everything" returned nothing. Each fix got its own test.', color=GREY, size=10)
page_break()

doc.add_heading('7. Redesigning every screen', 1)
p('After using the first version, I wanted the app to show more without tapping into every day, and to '
  'work well on both a phone and a computer. I ran a full design session, screen by screen, with '
  'annotated mockups that note what every button does. The pink numbered dots match notes explaining each control.')

doc.add_heading('7.1 Journal: four options', 2)
image('journal-options.png', 6.5, 'Color calendar, day-by-day feed, habit grid, weekly cards.')
p('I chose the color calendar with layers: every day shows its score and icons, and one tap recolors '
  'the whole month by sleep, food, drinks or workouts.')
doc.add_heading('7.2 Journal, finished design', 2)
image_row(['spec-part1-0.png'], 2.4, 'Phone.')
image('spec-part1-1.png', 6.5, 'Computer: sidebar, bigger day squares, and a side panel so you can click through days fast.')
page_break()

doc.add_heading('7.3 Check-ins during the day (my idea)', 2)
p('Halfway through, I realized I wanted to note things the moment they happen. Check-ins take about 20 '
  'seconds, and the night debrief already knows them, so it gets shorter.')
image('checkins-0.png', 6.5, 'The check-in button, the quick check-in panel, and a debrief that picks up from the notes.')

doc.add_heading('7.4 Today', 2)
image('spec-today-0.png', 6.5, 'Today changes with the time of day: morning catch-up, afternoon timeline, done for the night.')
image('spec-today-1.png', 6.5, 'Computer version with an inline check-in box.')
page_break()

doc.add_heading('7.5 Food and weight tracking', 2)
p('I added a food tracker that fills itself from what you say, so there is no logging. It compares each '
  'day to your maintenance calories, and beers count too. Weight tracking keeps the estimates honest by '
  'checking them against the scale.')
image('spec-food-0.png', 6.0, 'Food card, the day breakdown, the week against maintenance, and one-time setup.')
page_break()
p('Weight tracking: the trend line smooths out daily water swings, and after two weeks the app compares the scale with the food estimates and offers a corrected maintenance number.')
image_row(['spec-debrief-0.png'], 2.6, 'Weight trend and the "reality check" that corrects maintenance.')
page_break()

doc.add_heading('7.6 The nightly debrief', 2)
p('Designed for bed with the lights off: big buttons, the darkest screen in the app, and nothing that '
  'feels like a test. At the end, three quick ratings: the day score, how productive I was, and my focus.')
image('spec-debrief-1.png', 6.5, 'Talking, typing with quick answers, the score, and the review before saving.')
image('spec-debrief-2.png', 6.5, 'Computer version with a live checklist of topics.')
page_break()

doc.add_heading('7.7 A single day', 2)
image('spec-day-0.png', 6.0, 'Summary, timeline of check-ins, the full conversation, the menu, and an empty day.')
image('spec-day-1.png', 6.5, 'Computer version.')
page_break()

doc.add_heading('7.8 Insights', 2)
p('The payoff of tracking. Insights show what moves my days, as plus or minus points against my '
  'average, and always with the reminder that these are patterns, not proof of cause.')
image('spec-insights-0.png', 6.0, 'The month at a glance, a pattern with its proof, trends, and the new-user state.')
image('spec-insights-1.png', 6.5, 'Computer dashboard.')
page_break()

doc.add_heading('7.9 Food insights', 2)
p('What I usually eat on my most productive days, my calorie "sweet spot," and how food shows up in how '
  'I feel the next day.')
image('spec-food-insights-0.png', 6.0, 'Productive-day plate, calories against day score, and food by food.')

doc.add_heading('7.10 Settings', 2)
image('spec-you-0.png', 6.0, 'Ratings, settings, turning on reminders, and deleting an account.')
image('spec-you-1.png', 6.5, 'Computer version.')
page_break()

# ---------------------------------------------------------------- judgment + reflections
doc.add_heading('8. Ideas I parked on purpose', 1)
bullets([
    ('Body composition (fat vs muscle). ', 'Weight, food and workouts alone cannot reliably separate fat '
     'from muscle. Rather than ship a misleading number, I saved it for later with better inputs '
     '(waist measurements, smart scale).'),
    ('App Store apps. ', 'A home-screen web app is free and good enough to start; native apps can come later.'),
])

doc.add_heading('9. What I am learning', 1)
bullets([
    ('Seeing beats describing. ', 'Side-by-side mockups got me to clear decisions faster than any description.'),
    ('Decisions need a paper trail. ', 'Every choice goes into a running decision log, so nothing gets lost between sessions.'),
    ('Tests and a second reviewer matter. ', 'The AI writes code fast, but automated tests and an independent '
     'review are what made it trustworthy.'),
    ('Honest data beats impressive data. ', 'Estimates are labeled with how confident they are, and patterns '
     'are never presented as causes.'),
])

doc.add_heading('10. What is next', 1)
bullets([
    'Build the redesigned screens for phone and computer',
    'Voice debriefs (talk instead of type)',
    'Nightly reminders on iPhone',
    'Food and weight tracking, then food insights',
    'Invite classmates to test it',
])

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT)
print('wrote', OUT)
