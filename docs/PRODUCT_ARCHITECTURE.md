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

---

## 6. Pause Engine

Purpose: Provide mindfulness moments inside daily life.

Examples:
- morning orientation
- transition moments
- evening reflection

This is not a meditation replacement. It supports awareness.

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
