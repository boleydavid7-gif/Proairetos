export type LifeControllerFilter = {
  includeCompleted: boolean;
  includeLetGo: boolean;
};

export const defaultLifeFilter: LifeControllerFilter = {
  includeCompleted: false,
  includeLetGo: false,
};
