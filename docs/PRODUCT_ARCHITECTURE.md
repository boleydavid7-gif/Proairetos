# Proairetos Product Architecture

## Identity

Proairetos is a personal operating system for intentional living.

It combines organization, calendar awareness, Stoic reflection, mindfulness practices, and ADHD-friendly design principles without turning life into a score, streak, or optimization problem.

Core principle:

> The system records life. It does not interpret life.

The person remains responsible for deciding what matters and what to change.

---

# Navigation

```
Today · Reflect · Capture · Compass
```

- Today: what the person chose to see now (Attention Engine), and later the
  day's schedule (Life Context Engine).
- Reflect: the person's own reflections by day, week, and month, plus
  observations without interpretation (Reflection Engine).
- Capture: quick capture, sorting, and every open life item (Capture Engine).
- Compass: values and statements (Compass Engine).

The capture bar also appears on Today, so capturing never requires navigating.

---

# Core Loop

```
Capture → Organize → Act → Reflect → Choose → Repeat
```

The system helps a person see their life clearly. It does not make decisions for them.

---

# Engines

## 1. Compass Engine

Purpose: Keep sight of what matters.

Contains:
- chosen values
- personal statements
- what the person wants to remember
- what they want to put aside

Rules:
- values are user-selected
- custom values supported
- maximum five values
- app never determines values

In the product:
- Presets are offered alphabetically so none is favoured (the Stoic
  cardinal virtues are among them); people can also write their own.
- Any item can be connected to a value, only by the person. Connecting and
  disconnecting are recorded in the item's history.
- The look-ahead on Today shows the person's own values, the words they
  chose to remember, and what they scheduled for the day. It appears once
  a day until set aside, so it fits any schedule, including shifts. It
  adds nothing of its own.
- Thinking about items can hold an optional split: what is in my control,
  and what is not.

---

## 2. Capture Engine

Purpose: Externalize thoughts and obligations.

Life item types (a capture can also stay unsorted):
- Do
- Remember
- Make time for
- Thinking about

Decisions and reflections are not item types. They are their own records:
a Decision can link to a Thinking about item, and a Reflection can link to
an item, a decision, or a period of time.

Rules:
- capture first
- organization optional
- no forced value connection

---

## 3. Life Context Engine

Purpose: Understand the person's real constraints.

Contains:
- schedules
- rotating shifts
- protected time
- commitments
- calendar context

Rules:
- never assumes a standard schedule
- never decides availability
- schedule patterns are user-defined

In the product:
- Every schedule is a repeating cycle of runs ("7 days of these hours,
  then 1 day off, ..."). A weekly job is a 7-day cycle anchored on a
  Monday; a rotation is any longer cycle, up to 366 days.
- Hours ending at or before they start run past midnight. A night shift
  belongs to the day it starts and also shows on the morning it ends.
- One day can be changed without touching the pattern: different hours,
  not working, or extra hours on a day off.
- Patterns are either work and commitments, or protected time.
- Templates are starting points only (weekly, days/evenings/nights,
  4 on 4 off, 2-2-3, protected time, blank).
- Today shows what is under way and what starts next, with plain
  countdowns, and a timeline for any day.

---

## 4. Attention Engine

Purpose: Present what the person has chosen to see.

Used by Now.

Can surface:
- time-bound items
- important items
- waiting items with user-set check dates
- upcoming commitments

Cannot:
- rank importance automatically
- decide priorities
- create urgency labels

---

## 5. Reflection Engine

Purpose: Show patterns without interpretation.

Examples:
- items connected to values
- decisions made
- protected time used
- reschedules

Rules:
- no sentiment analysis
- no mood inference
- no generated reflections
- observations only

In the product, "What happened" lists plain facts for today, the week, or
the month, in a fixed order: things captured; done and let go; focused
minutes; items connected to each value; items moved more than once;
waiting longest (7+ days); decisions made; scheduled work and protected
time. Any kind can be hidden. A test checks the wording never uses
judgment language.

---

## 6. Pause Engine

Purpose: Provide mindfulness moments inside daily life.

Examples:
- morning orientation
- transition moments
- evening reflection

This is not a meditation replacement. It supports awareness.

In the product: a one-minute arrival moment (a slow breathing circle and
a few quiet cues) can be started any time from Today. Schedule patterns can
opt in to offering it when a block ends; the offer appears for 45 minutes
and is asked once.

---

# ADHD Support

Built within the design rules (no rewards, streaks, or pressure):
- Next small step: one concrete action on a Do item, in the person's words.
- Focus timer: 10, 25, 45 minutes or any length, started from an item or
  on its own. It survives reloads and records plain focused minutes in the
  item's history. Nothing is counted against anyone.
- Check-back nudges: a waiting item returns to Today on the day the person
  chose, with Heard back, Check again later, or Let go.
- Guilt-free return: after three or more days away, a welcome card says
  nothing is late. Items with times on earlier days are gathered into one
  quiet group, never shown as a pile, with an option to clear their times.
- Relief instead of praise: closing an item eases it away, with undo.

---

## 7. Decision Engine

Purpose: Preserve choices and learning.

Tracks:
- options considered
- chosen action
- date decided
- revisit date
- later notes

Flow:

```
Thinking about → Decision → Reflection
```

In the product: a Thinking about item offers "Make a decision". The person
writes the question, options, choice, and optional reasons, and can pick a
look-back date. The item's history records "Decided" and it can be marked
done. On the look-back date the decision returns on Today; notes written
then are kept as reflections linked to the decision.

---

# AI Boundary

AI may assist with:
- parsing free text
- sorting captured information
- proposing structure

AI must:
- ask for confirmation
- remain optional

AI never:
- decides what matters
- assigns values automatically
- interprets emotions
- gives life advice without request

---

# Domain Layer

Every change to a life item goes through a command in
`src/core/life-items/commands.ts`. A command returns the updated item and the
events that record what happened (created, sorted, scheduled or rescheduled,
waiting, completed, let go, reopened, carried). Services persist the item and
its events together. Reflection reads this history; it never infers from it.

Marking an item important is the person's own mark and is not logged as
history.

---

# Storage and Offline

Data lives on the person's device in IndexedDB and never leaves it yet.
The app installs to the home screen and opens without a connection. If
storage is blocked, data is kept in memory for that visit and the app says
so plainly.

Undo removes a change and its events entirely: an undone change did not
happen, so it does not appear in history.

---

# Design Rules

Language the system never uses about a person's life is enforced in
`src/core/rules/languageRules.ts`, and a test scans every source file for it.

Never add:
- productivity scores
- streaks
- failure states
- overdue judgment
- shame language
- automatic life recommendations

The product should help someone say:

> I stopped losing sight of what matters, and it never made me feel behind.
