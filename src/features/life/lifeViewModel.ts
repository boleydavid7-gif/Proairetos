export type LifeViewState = {
  filter: 'all' | 'open' | 'waiting' | 'done' | 'let_go';
};

export function createLifeViewModel(): LifeViewState {
  return {
    filter: 'all',
  };
}
