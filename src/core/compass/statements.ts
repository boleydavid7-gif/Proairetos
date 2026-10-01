import type { DomainContext } from '../context';
import { MAX_STATEMENT_LENGTH, type CompassStatement, type CompassStatementType } from './types';

export function writeStatement(
  ctx: DomainContext,
  userId: string,
  type: CompassStatementType,
  body: string,
): CompassStatement {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('A statement needs some words.');
  if (trimmed.length > MAX_STATEMENT_LENGTH) {
    throw new Error(`Keep a statement to ${MAX_STATEMENT_LENGTH} characters.`);
  }
  return { id: ctx.newId(), userId, type, body: trimmed, createdAt: ctx.now().toISOString() };
}
