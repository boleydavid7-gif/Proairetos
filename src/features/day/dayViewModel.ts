export type DayViewState = {
  selectedDate: string;
  loading: boolean;
};

export function createDayViewModel(date: string): DayViewState {
  return {
    selectedDate: date,
    loading: false,
  };
}
