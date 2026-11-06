import type { ReactNode } from 'react';
import type { HomeRow } from '../../core/providers';
import { markHomeRow } from '../../app/providers/home';
import { ChevronRightIcon, ListIcon } from '../../components/icons/Icons';
import { PersonIcon, SuitcaseIcon } from '../../app/family/icons';
import { FamilyMark } from '../../app/family/marks';
import NotForMe from './NotForMe';
import SwipeLine from './SwipeLine';
import type { TodayPart } from '../../data/storage/preferences';

/*
 * The lines the apps' providers put on Today, drawn as the family's quiet rows. The look is the one Today already had:
 * a practice is one line with an optional bar, an attention line is a title and a detail that pulls both ways.
 */

/** A practice: one small, current signal from an app, with a bar when it has a measure. */
export function PracticeLine({ row }: { row: HomeRow }) {
  const progress = row.progress;
  return (
    <a className="quiet-row today-practice-link" href={row.open}>
      <span className="quiet-row__icon" aria-hidden="true" />
      <span className="quiet-row__text">
        <span>{row.detail}</span>
        {progress && (
          <span className="today-practice-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.value * 100)} aria-valuetext={progress.label}>
            <span style={{ width: `${Math.round(progress.value * 100)}%` }} />
          </span>
        )}
      </span>
      <ChevronRightIcon size={18} className="quiet-row__chevron" />
    </a>
  );
}

const GLYPH = { list: <ListIcon size={20} />, person: <PersonIcon size={20} />, suitcase: <SuitcaseIcon size={20} /> } as const;

function Body({ row }: { row: HomeRow }) {
  return (
    <>
      <span className="quiet-row__text">
        <span>{row.title}</span>
        <span className="quiet-row__detail">{row.detail}</span>
      </span>
      <ChevronRightIcon size={18} className="quiet-row__chevron" />
    </>
  );
}

/** An attention line: pull left to mark it (in its own app when it can be), pull right for Not today. */
export function AttentionLine({ row, today }: { row: HomeRow; today: string }): ReactNode {
  const swipe = row.swipe;
  if (!swipe) return null;
  const title = swipe.label ?? row.title ?? row.detail;
  const mark = swipe.marks ? () => markHomeRow(row, today) : undefined;
  if (!row.icon) {
    return (
      <SwipeLine id={swipe.id} title={title} doneWord={swipe.word} mark={mark}>
        <a className="quiet-row" href={row.open} draggable={false}>
          <span className="quiet-row__icon" aria-hidden="true">
            <FamilyMark app={row.ref.app} size={20} />
          </span>
          <Body row={row} />
        </a>
      </SwipeLine>
    );
  }
  return (
    <SwipeLine id={swipe.id} title={title} doneWord={swipe.word} mark={mark}>
      <a className="quiet-row" href={row.open}>
        <span className="quiet-row__icon" aria-hidden="true">{GLYPH[row.icon]}</span>
        <Body row={row} />
      </a>
      {row.notForMe && <NotForMe part={row.notForMe as TodayPart} />}
    </SwipeLine>
  );
}
