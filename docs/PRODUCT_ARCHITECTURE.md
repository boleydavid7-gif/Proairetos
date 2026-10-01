# Proairetos Product Architecture

## Identity

Proairetos is a personal operating system for intentional living.

It combines organization, calendar awareness, Stoic reflection, mindfulness practices, and ADHD-friendly design principles without turning life into a score, streak, or optimization problem.

Core principle:

> The system records life. It does not interpret life.

The person remains responsible for deciding what matters and what to change.

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

Capture types:
- Do
- Remember
- Make time for
- Thinking about
- Decision
- Reflection

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

# Design Rules

Never add:
- productivity scores
- streaks
- failure states
- overdue judgment
- shame language
- automatic life recommendations

The product should help someone say:

> I stopped losing sight of what matters, and it never made me feel behind.
