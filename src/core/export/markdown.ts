import { itemKinds, kindOf } from '../life-items/kinds';
import type { LifeItem } from '../life-items/types';
import type { CompassStatement } from '../compass/types';
import type { Decision } from '../decisions/types';
import { confidenceLabels, outcomeLabels, processLabels } from '../decisions/types';
import type { InnerWeather, Reflection } from '../reflections/types';
import type { ChosenValue } from '../values/types';
import { toLocalDate } from '../scheduling/dates';

/** What a readable copy is made from: the person's own records. */
export type ReadableData = {
  lifeItems: LifeItem[];
  reflections: Reflection[];
  values: ChosenValue[];
  statements: CompassStatement[];
  decisions: Decision[];
};

type Options = {
  now: Date;
  /** The words of the prompt a reflection answered, if it answered one. */
  promptLabel?: (key: string | undefined) => string | undefined;
};

const innerWeather: Record<InnerWeather, string> = {
  CLEAR: 'Clear',
  PARTLY: 'Partly cloudy',
  CLOUDY: 'Cloudy',
  RAIN: 'Rain',
  STORM: 'Storm',
};

const day = (iso: string) => toLocalDate(new Date(iso));

/** Lines of the person's text, kept as a quote so its own line breaks stay. */
const quote = (text: string) =>
  text
    .trim()
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

function reflectionsSection(items: Reflection[], values: ChosenValue[], promptLabel: Options['promptLabel']): string[] {
  const written = items.filter((r) => r.body.trim()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!written.length) return [];
  const valueName = new Map(values.map((v) => [v.id, v.name]));
  const out = ['## Reflections', ''];
  let current = '';
  for (const r of written) {
    const when = day(r.createdAt);
    if (when !== current) {
      current = when;
      out.push(`### ${when}`, '');
    }
    const label = promptLabel?.(r.promptKey) ?? (r.kind === 'INTENTION' ? 'Intention' : undefined);
    if (label) out.push(`**${label}**`, '');
    out.push(quote(r.body), '');
    const facts = [
      r.weather ? `Inner weather: ${innerWeather[r.weather]}` : '',
      r.valueIds?.length ? `Values: ${r.valueIds.map((id) => valueName.get(id) ?? '').filter(Boolean).join(', ')}` : '',
    ].filter((fact) => fact && !fact.endsWith(': '));
    if (facts.length) out.push(`*${facts.join(' · ')}*`, '');
  }
  return out;
}

function decisionsSection(decisions: Decision[]): string[] {
  if (!decisions.length) return [];
  const out = ['## Decisions', ''];
  for (const d of [...decisions].sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))) {
    out.push(`### ${d.question}`, '', `Decided ${day(d.decidedAt)}.`, '');
    if (d.options.length) out.push(`Options: ${d.options.join('; ')}`, '');
    out.push(`**Chose:** ${d.choice}`, '');
    if (d.reasons?.trim()) out.push(`Why: ${d.reasons.trim()}`, '');
    if (d.expected?.trim()) out.push(`Expected: ${d.expected.trim()}`, '');
    if (d.confidence) out.push(`How sure: ${confidenceLabels[d.confidence]}`, '');
    if (d.lookBack) {
      out.push(`Looking back (${day(d.lookBack.at)}): ${processLabels[d.lookBack.process]}; ${outcomeLabels[d.lookBack.outcome]}.`, '');
    }
  }
  return out;
}

function compassSection(values: ChosenValue[], statements: CompassStatement[]): string[] {
  const ofType = (type: CompassStatement['type']) => statements.filter((s) => s.type === type);
  const goals = ofType('GOAL');
  const people = ofType('PERSON');
  const remember = ofType('REMEMBER');
  const aside = ofType('PUSHED_ASIDE');
  if (!values.length && !statements.length) return [];
  const out = ['## Compass', ''];
  if (values.length) out.push('### Values', '', ...values.map((v) => `- ${v.name}`), '');
  if (goals.length) {
    out.push(
      '### Working toward',
      '',
      ...goals.map((g) => `- ${g.body}${g.reachedAt ? ` (reached ${day(g.reachedAt)})` : ''}`),
      '',
    );
  }
  if (people.length) {
    out.push('### People who matter', '', ...people.map((p) => `- ${p.body}${p.note?.trim() ? `: ${p.note.trim()}` : ''}`), '');
  }
  if (remember.length) out.push('### Remember', '', ...remember.map((s) => `- ${s.body}`), '');
  if (aside.length) out.push('### Set aside', '', ...aside.map((s) => `- ${s.body}`), '');
  return out;
}

const statusWord: Record<LifeItem['status'], string> = {
  OPEN: 'Open',
  WAITING: 'Waiting',
  DONE: 'Done',
  LET_GO: 'Let go',
};

function itemsSection(items: LifeItem[]): string[] {
  const mine = items.filter((item) => !item.app && item.title.trim());
  if (!mine.length) return [];
  const out = ['## Captured and planned', ''];
  const groups = [...itemKinds.map((k) => ({ id: k.id as string | undefined, label: k.label })), { id: undefined, label: 'Not sorted yet' }];
  for (const group of groups) {
    const rows = mine
      .filter((item) => kindOf(item) === group.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!rows.length) continue;
    out.push(`### ${group.label}`, '');
    for (const item of rows) {
      const when = item.scheduledAt ? ` · ${item.scheduledAt.slice(0, 16).replace('T', ' ')}` : item.plannedFor ? ` · ${item.plannedFor}` : '';
      out.push(`- ${item.title.trim()} (${statusWord[item.status]}${when})`);
      if (item.notes?.trim()) out.push(...item.notes.trim().split('\n').map((line) => `  ${line}`));
    }
    out.push('');
  }
  return out;
}

/** A plain Markdown copy of the person's own words, readable anywhere without the app. */
export function readableExport(data: ReadableData, { now, promptLabel }: Options): string {
  const body = [
    ...reflectionsSection(data.reflections, data.values, promptLabel),
    ...decisionsSection(data.decisions),
    ...compassSection(data.values, data.statements),
    ...itemsSection(data.lifeItems),
  ];
  const header = ['# Proairetos', '', `A readable copy, made ${toLocalDate(now)}. Everything here is what you wrote or chose.`, ''];
  return [...header, ...(body.length ? body : ['Nothing has been written yet.', '']) ].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
