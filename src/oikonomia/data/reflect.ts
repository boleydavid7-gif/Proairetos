import { collection } from '../../app/family/shell';

/**
 * User-authored financial context that may be shared with Reflect.
 * Oikonomia never projects bills, balances, statement lines or transactions.
 */
export type FinancialMilestone = {
  id: string;
  title: string;
  body?: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Explicit user opt-in; new entries default to true in the editor. */
  inReflect: boolean;
  createdAt: string;
  updatedAt: string;
};

export const reflectMilestones = collection<FinancialMilestone>('oikonomia:reflect-milestone:');
