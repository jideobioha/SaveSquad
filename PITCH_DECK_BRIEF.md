# SaveSquad: Pitch Deck Brief (for an AI assistant)

> **To the AI reading this:** you are building a **pitch slide deck** for SaveSquad, a working proof-of-concept app. This file has everything you need: the problem, the evidence, every feature the app actually does, and strict rules for the deck. **The pitch must be deliverable in 5 minutes or less.** That limit is not optional. If something doesn't fit in 5 minutes, cut it. Don't speed it up.
>
> Only use facts in this file. Don't invent users, revenue, metrics, testimonials or partnerships. Where something is unproven, this file says so. Keep it that way in the deck.

---

## Part 1: Your instructions

### Deliverable
Produce **all three** of the following:
1. **The slide deck:** 8–10 slides (title and close included). Give the exact on-slide text for each slide.
2. **Speaker notes for every slide:** what the presenter says, written to be spoken aloud.
3. **A timing table:** slide number, title, seconds, and running total. The total must be **≤ 5:00**, ideally **4:30**, which leaves a 30-second buffer.

If you can generate files (PowerPoint, Google Slides, Keynote, HTML, etc.), do. If you can't, output the deck as structured text: one section per slide with **Title / On-slide text / Visual / Speaker notes / Seconds**.

### The 5-minute rules (hard limits)
- **Total spoken words ≤ 650** across all speaker notes. That's about 130 words a minute, a calm pace with room for a demo and pauses. Count them and report the total.
- **No slide over 60 seconds** of talk, except the demo, which is capped at 75 seconds.
- **On-slide text ≤ 25 words per slide.** Slides are billboards; the presenter carries the detail. Each slide gets one headline and up to 3 short bullets or one big number.
- **One idea per slide.** If a slide needs "and also," split it or cut it.
- **No feature tours.** The app has many features (Part 3). Show the **one core loop** and name the rest in a single line. Picking what to leave out is part of the job.
- Do a final pass called **"cut check":** list what you left out and why it was safe to cut.

### Suggested structure (adapt it, but stay within time)
| # | Slide | Seconds | Purpose |
|---|---|---|---|
| 1 | Title + hook | 20 | "Save solo. Win together." Who's presenting. |
| 2 | The problem | 40 | Young people want to save but lack a system; every option is solo. |
| 3 | What we heard | 35 | 20 interviews: 2–3 numbers max, plus one quote. |
| 4 | The idea | 30 | Gamified savings + community capital = SaveSquad. |
| 5 | How it works: one loop | 40 | Goal → spin → win → squad bar moves. |
| 6 | Live demo / screenshots | 75 | Walk the loop in the real app (script below). |
| 7 | Consistency, not cash | 30 | Leagues, duels and freezes. Fair for every income. |
| 8 | Risks and what's next | 30 | Be honest about what's unproven; pilot plan. |
| 9 | Close / ask | 15 | Repeat the tagline and make a clear ask. |
| | **Total** | **4:35** | |

### Tone and design
- **Audience:** judges, instructors and peers at a maker or demo day. They're smart but busy. Lead with the human problem, not the tech stack.
- **Voice:** plain, warm and confident. Short sentences. No jargon ("leverage," "synergy," "revolutionize").
- **Brand:** purple `#5B3FF0` (primary), lime `#D4F25C` (accent), flame orange `#FF6B2C` (streaks only), off-white `#F4F3FB` (background). Font: **Plus Jakarta Sans** (bold for headlines). Rounded cards and big numbers. On purple backgrounds, all text is **solid white**, never faded grey.
- **Visuals:** phone-screen mockups (the app is mobile-first), one big number per evidence slide, and icons over paragraphs. Use 🔥 for streaks.
- **Tech stack:** at most one line, on the demo or close slide ("Built with Next.js + Supabase, live on Vercel"). Nobody needs a database slide.

### Honesty guardrails (these protect the presenter in Q&A)
- It is a **proof of concept**. Saves are **self-reported**: no bank is connected and no real money moves. Say so once, plainly, and frame it as deliberate ("We tested the habit before touching money").
- **Unproven:** pricing (3 of 20 interviewees pushed back on subscriptions), revenue (freemium plus bank referral fees, both untested), and the riskiest claim: *that friends will actually save together*. The pilot exists to test this.
- **No real users yet.** Don't imply traction. "Working app, ready to pilot" is the true and strong claim.

---

## Part 2: The story

### One-liner
**SaveSquad: Save solo. Win together.** A savings app where your personal streaks and daily challenges power a shared goal you're saving toward with friends, like a group trip.

### Who it's for
Students and early-career earners, **aged 18–30, who save whatever is left over**.
**The wedge:** friend groups on one campus who are planning a trip in the next few months.

### The problem
- Young people *want* to save. They lack a system. **54% of Gen Z would save an extra $300 a month** (Bank of America, 2026 Gen Z & The Cost of Adulting; Ipsos, n=1,133, Feb 2026).
- Only **21% of 18–29s save a fixed %** (BofA).
- Every tool they use today is **solo**. A bank balance gives no feedback and no deadline. Friend groups planning a trip have no tool for saving together, so the plan dies in the group chat.

### What we heard: 20 interviews (Team 317, Sept 2026)
Interviewees were undergrads, MBA and grad students, and part-time and full-time workers. We used a 15-question guide, plus the BofA 2026 Gen Z study and the TIAA-GFLEC Personal Finance Index 2026.
- **9 of 20** named income or cost of living as their #1 blocker. *"The more I earn, the more I save."*
- **7 of 20** save whatever is left over, or have no set goal.
- **7 of 20** asked for visual progress or radical simplicity. One old tool felt *"like filing your taxes again."*
- **1 of 5** was the lowest score an auto-invest tool got. *"I just like to have full control."*
- On squads: an interviewee said it gets plans *"out of the group chat."*

**Two tensions shaped the design:**
- **Knowing vs. doing:** everyone knows they should save.
- **Help vs. control:** "Make it automatic, but let me decide." So in SaveSquad, **nothing moves without a tap**.

### The idea: two ideas, one product
| Gamified savings: *the spark to keep going* | Community capital: *save together, go together* |
|---|---|
| Streaks and levels | Shared squad goals |
| Daily challenges | Chip in anytime |
| XP, badges and rewards | Friends see the bar move |
| Visual progress | Squad votes on withdrawals |

**= SaveSquad: your streak fuels your squad's goal.**

### How it works: one loop
1. **Pick a goal.** It becomes your level.
2. **Play a challenge.** Spin to see what you save today.
3. **Get the win.** Streak, XP and badges.
4. **Rally the squad.** Your win moves the shared bar.

### Why "consistency, not cash" matters
Income is the ceiling for most people we interviewed (9 of 20). So squads are scored on **on-time saves, not dollars**. A student saving $10 a week can beat a squad saving $500 a week. That makes it fair and safe: it doesn't pressure people to overspend to keep up, and amounts can be hidden.

### Viability (from the original deck)
- **Technical: yes.** The features are standard. In production, accounts would sit at an FDIC-insured partner bank. *(The proof of concept proves the product works end to end.)*
- **Operational: yes.** Habitica already runs group challenges on self-reported progress. Each squad brings several new users, so growth is built in.
- **Financial: not yet.** The model is freemium plus bank referral fees, both untested. Benchmark: 9% of Duolingo's monthly users pay (Duolingo Q2 2026 shareholder letter). Estimated acquisition cost is about **$33 per squad (about $8.30 per user)** (sources: Superads, Facebook ad install costs for US finance apps; Liftoff 2026 Finance App Benchmark).
- **Verdict:** buildable, but revenue is unproven.

### Risks and answers
| Risk | Answer |
|---|---|
| Trust and security with people's money | FDIC-insured partner bank; nothing moves without a tap. Today the app holds no money at all. |
| Social pressure to overspend | Score consistency, not amounts; anyone can hide their amount. |
| Novelty wears off after month three | Rotate challenges and leagues; measure retention in a pilot. |

### Next steps
1. Pilot with friend groups from our interviews (students and early-career earners).
2. Measure **weekly saves** and **squad retention**.
3. Partner with a banking provider for real accounts.
4. Test pricing.

---

## Part 3: What the app actually does (all built and working)

The proof of concept is a **mobile-first web app**, live on Vercel. Every feature in the original pitch deck is built. The bottom tab bar has **Home · Challenges · Squads · Leagues · Me**.

### Getting started
- **Sign in** with an email magic link (there's also password sign-in for test accounts).
- **Onboarding: "Pick a goal."** Choose Trip ✈️, Emergency fund, Down payment or Something else. Set a name, target and date, and the app **suggests a weekly amount** automatically. That weekly amount is your streak target.
- A signed-out visitor sees a branded landing page.

### Home dashboard
- **Goal card:** amount saved vs. target, % there, your **level** and the XP needed for the next one.
- **Streak row:** the last 8 weeks as dots (hit 🔥, missed, or frozen ❄️) and your current streak.
- **Today's challenge:** a lime card for the daily spin.
- **Squad preview:** your squads and how they're doing.

### Spin the Save (daily challenge)
- One spin a day lands on a small amount between **$3 and $25**.
- The amount is picked **on the server, once a day**, so refreshing can't reroll it.
- Then you either move that amount to your goal or squad, or edit it first. **Nothing moves without a tap.**

### The win: "Streak saved!"
- When a save completes your week, or earns a badge, you get a full-screen celebration with **confetti**. It shows your streak in weeks, XP earned and % to goal.
- **"Share with my squad"** posts the win to the squad's activity feed.

### XP and levels
- **+10 XP** per save, **+20 XP** for a spin save, and **+100 XP** for completing your week.
- Each level is **250 XP**. Titles run Starter → Saver → Steady Saver → Streaker → Squad Star → Money Mover → Legend.

### Squads (community capital)
- **Create a squad goal:** name, target and deadline. Then pick the rules:
  - **Contribution mode:** chip in anytime, equal split, or weekly (a weekly reminder to log a save).
  - Withdrawals need a squad vote (on/off).
  - Show amounts (on/off).
  - Join the Squad League (on/off).
- **Invite by link:** friends open the link, see a preview (goal, target, date, who's in), and join in one tap.
- **One shared progress bar** with a colored segment for each member. It **updates live for everyone** when anyone chips in, with no refresh.
- **Who's in:** each member's streak and contribution.
- **Chip in:** log any amount.
- **Activity feed:** "Maya chipped in $20," streak wins, and nudges.
- **Cheer 👏** a friend's save, or **Nudge** a friend who hasn't saved this week.
- **Hide my amount:** your dollars stay private, but your progress still counts toward the bar.
- **Withdrawals need a squad vote:** any member can request money out, and the **majority** decides.
- **Squad settings:** rules can be changed later.

### Competition: consistency, not cash
- **Weekly squad leagues:** squads are ranked by the **% of members on time this week** (hit their weekly target or used a freeze). The page shows a top-3 podium and a live hint such as *"2 more on-time saves from your squad moves you to #3."* Dollar amounts never enter the score.
- **1-on-1 friend duels:** challenge a squadmate to a week-long habit, like a "No-delivery week."
  - Set a stake (default $5).
  - They accept or decline.
  - Each of you checks in on every day you kept the habit, and most days by Sunday wins.
  - **The loser funds the winner's goal**, marked as paid in the app.
- **Streak freezes for tight weeks:** you start with 1 freeze. You earn another every 4 straight weeks, up to 3. A frozen week keeps your streak alive.

### Rewards and profile (Me tab)
- **Stats:** total saved, best streak, number of squads, level path.
- **"Saved this month"** progress chart.
- **Freezes** left (you can use one here) and an editable weekly target.
- **8 badges:**
  - 🌱 First Save
  - 💯 First $100
  - 👥 Squad Starter
  - 🔥 On a Roll (4-week streak)
  - 🏅 Quarter Streaker (13 straight weeks)
  - 🎡 Lucky Spinner (7 spin saves)
  - 👏 Team Player (cheer 5 saves)
  - 🎯 Goal Getter (reach your goal)

### Multiple solo goals
- Have several personal goals alongside your squads. Choose a **main goal**: it drives the Home card and where spins go.

### Trust built into the design
- Streaks, XP, spins, badges, votes and league scores are all **calculated on the server**. They can't be faked from the browser.
- Each person can only see the squads they belong to (database row-level security).

### Built with
**Next.js** (mobile-first web app) · **Supabase** (database, sign-in, live updates) · **Vercel** (hosting, free tier). It works on any phone browser, with no app store needed.

---

## Part 4: Demo script (for slide 6, 75 seconds max)

Use the live app if Wi-Fi is reliable. **Always also have screenshots** in the deck as a fallback. Before presenting, load a demo squad with a few weeks of history so streaks and the league look real.

1. **Home (15s):** "This is Maya's dashboard. Her Tokyo trip goal is her level, and she's on a 6-week streak 🔥."
2. **Spin (20s):** Tap Spin the Save → lands on $12 → "Move $12." "One tap. Nothing moves without her say."
3. **Win (15s):** The "Streak saved!" confetti screen → "Share with my squad."
4. **Squad (20s):** Show the squad page on a **second phone or browser**. The shared bar moves live and the feed shows Maya's win. "Her streak just fueled the whole squad."
5. **Leagues (5s):** "And squads compete on consistency, not cash."

---

## Part 5: Lines worth keeping (use them verbatim)
- "Save solo. Win together."
- "Your streak fuels your squad's goal."
- "Compete on consistency, not cash."
- "Nothing moves without a tap."
- "It gets plans out of the group chat." *(interviewee)*
- "Young people want to save. They just lack a system."

## Team
**Team 317, Maker Day 2:** Tenzin Sherap, Keer Hu, Jidechukwu Obioha.
