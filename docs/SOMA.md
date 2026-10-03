# SOMA by Proairetos (planned, not started)

## Purpose

SOMA is a guide for understanding your body, not a tracker that judges your
health. It creates no scores, punishes no missed goals, and never tells
someone how healthy they are. It helps people learn, build awareness, and
notice patterns in their own lives.

Its core loop is **Learn → Practice → Notice → Reflect**. Instead of asking
"Did you succeed?", it asks "What did you notice?" Hydration, nutrition and
daily habits are chances to reflect, not obligations.

People record by hand what they drink, what they eat, how they feel, and
what influenced their energy, then look back over time to find their own
patterns. The app teaches about hydration, nutrition, recovery and caring
for the body, and leaves every choice with the person.

Progress is awareness, not improvement scores: "I noticed I feel better when
I prepare meals." "I have more energy when I stay hydrated."

SOMA sits beneath the other two: Proairetos is intentional living, Askesis is
physical discipline, SOMA is caring for the body that carries you through
life.

## The loop, as screens

- **Learn**: short articles with sources (as in Askesis `core/learn.ts`):
  hydration, food and energy, sleep and recovery, caring for the body around
  work of any hours. Each ends with one small thing to try, never a rule.
- **Practice**: an experiment the person picks for a while ("a glass of water
  before coffee", "make tomorrow's lunch tonight"). Not a goal; nothing can
  be missed, nothing piles up.
- **Notice**: one-tap records: a drink (amount chips), a meal (words, optional
  photo, "same as yesterday", optional "How did you feel after?"), how I feel
  (energy, body, mind; the person's own words, never inferred), and "what
  influenced my energy today" from their own list or free text.
- **Reflect**: looking back lays records side by side (days with prepared
  meals beside the energy marked those days). The app shows the facts; the
  person writes the pattern ("I noticed…"), kept as theirs in "Things
  you've noticed".

## Decisions already made

- No goal rings, no "2 of 3 meals", no percentages: show what was recorded
  ("56 oz today"). Any amount to aim for is optional and the person's own.
- Patterns are written by the person. The app may place things together; it
  never states what they mean ("Whole foods support your energy" is out).
- No calories, no weight, no "good" or "bad" foods: safe for anyone with a
  hard history with food. The Proairetos Support screen is reachable from
  SOMA too.
- Charts, if any, are plain counts per day or week: no averages, trends or
  arrows.
- Never a chore: every record under a minute, everything optional, nothing
  asked twice.

## How it fits the family

- Built like Askesis: served at `/soma/` from this repository (its own
  manifest, icon and service worker), same sign-in and sealed sync, data in
  the shared Proairetos database (new stores and a migration), same motion,
  appearance and language rules (the banned-words test covers it).
- Links: water and meals around runs in Askesis; how I feel beside inner
  weather in Proairetos Reflect; a practice can sit under a Compass value;
  noticed patterns show in Reflect; meals and drinks can appear in Done
  today, the way runs do.
- Owner's mockup: Welcome, Home (Today), Hydration, Nutrition (Today,
  History, Learn), Log meal, Learn, Today's reflection, Progress, Insights
  (person-written observations), Settings. Warm light theme with landscape
  photos, matching Proairetos and Askesis.

## Before starting

- Check the name "Soma" for conflicts, as was done for Askesis.
- Decide units (oz or ml) and default drink sizes.
- Choose which Learn articles come first and their sources.
