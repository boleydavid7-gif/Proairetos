export interface Decision {
  id: string;
  userId: string;
  lifeItemId?: string;
  options?: string;
  choice?: string;
  decidedAt?: string;
  revisitAt?: string;
  laterNote?: string;
}
