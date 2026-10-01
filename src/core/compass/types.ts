export type CompassStatementType = 'REMEMBER' | 'PUSHED_ASIDE';

export interface CompassStatement {
  id: string;
  userId: string;
  type: CompassStatementType;
  body: string;
  createdAt: string;
}

export const MAX_STATEMENT_LENGTH = 280;
