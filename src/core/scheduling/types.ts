/**
 * Schedules are described as a repeating cycle of runs: "7 days of these
 * hours, then 1 day off, ...". A weekly job is a 7-day cycle starting on a
 * Monday; a rotation is any longer cycle. The person defines every part.
 */

/** COMMITTED: work and other obligations. PROTECTED: time the person guards. */
export type ScheduleKind = 'COMMITTED' | 'PROTECTED';

/** Hours on one day, as local "HH:MM". An end at or before the start runs past midnight. */
export interface TimeBlock {
  start: string;
  end: string;
  label?: string;
}

/** A run of identical days. No blocks means days off. */
export interface ScheduleSegment {
  days: number;
  blocks: TimeBlock[];
}

export interface SchedulePattern {
  id: string;
  userId: string;
  name: string;
  kind: ScheduleKind;
  /**
   * How the person edits it. WEEKLY patterns are seven one-day runs
   * anchored on a Monday; CYCLE patterns are any runs of days.
   */
  layout: 'WEEKLY' | 'CYCLE';
  /** Local date ("YYYY-MM-DD") the first segment begins. */
  anchorDate: string;
  segments: ScheduleSegment[];
  /** Optional last local date the pattern applies. */
  endDate?: string;
  /** Offer a one-minute pause when a block of this pattern ends. Off unless chosen. */
  pauseWhenEnds?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A one-day change to a pattern: different hours, or nothing that day. */
export interface ScheduleException {
  id: string;
  userId: string;
  patternId: string;
  /** The cycle day being changed, local "YYYY-MM-DD". */
  date: string;
  blocks: TimeBlock[];
  createdAt: string;
}

/** One concrete stretch of time produced by a pattern. */
export interface ScheduleOccurrence {
  patternId: string;
  patternName: string;
  kind: ScheduleKind;
  label?: string;
  /** The cycle day this belongs to (a night shift belongs to the day it starts). */
  date: string;
  start: Date;
  end: Date;
  changed: boolean;
}

export const MAX_SEGMENT_DAYS = 366;
export const MAX_CYCLE_DAYS = 366;
