export interface ValueModel {
  id: string;
  userId?: string;
  name: string;
  source: 'PRESET' | 'CUSTOM';
  createdAt: string;
}

export interface UserValueModel {
  userId: string;
  valueId: string;
  chosenAt: string;
}
