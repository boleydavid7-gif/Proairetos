export type DayControllerState = {
  selectedDate: string;
};

export function createDayState(selectedDate: string): DayControllerState {
  return {
    selectedDate,
  };
}
