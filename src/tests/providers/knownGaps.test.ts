import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * The owner's field decisions (docs/PHASE3_PLAN.md, D4) are in the manifest. Universal search still indexes a few
 * fields that decision excludes, because Slice 1 moves only Oikonomia and Hydros. This register names each one so it
 * is not forgotten: moving that app's search to a provider (Slice 2) removes the field and deletes its line here.
 */
const source = readFileSync('src/features/search/SearchSheet.tsx', 'utf8');

describe('fields search still indexes that the manifest excludes (closed in Slice 2)', () => {
  const gaps: [string, string][] = [
    ['Therapeia medication dose', "{ name: 'Dose'"],
    ['Therapeia medicine note', "{ name: 'Note', text: medicine.note }"],
    ['Therapeia visit notes and questions', "{ name: 'To ask'"],
    ['Ktema serial number', "{ name: 'Serial'"],
    ['Poreia confirmation code', "{ name: 'Confirmation'"],
    ['Ergon chore note', "{ name: 'Note', text: chore.note }"],
  ];
  for (const [label, marker] of gaps) it(label, () => expect(source).toContain(marker));

  it('apps indexed today without a classification in the manifest: Phyton, Meletē, Mneme (classify before Slice 2 moves them)', () => {
    for (const label of ['Plant in Phyton', 'Subject in Meletē', 'Note in Mneme']) expect(source).toContain(label);
  });
});
