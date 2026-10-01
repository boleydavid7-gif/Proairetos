export type CaptureControllerState = {
  text: string;
  confirmed: boolean;
};

export function createCaptureState(text: string): CaptureControllerState {
  return {
    text,
    confirmed: false,
  };
}

export function confirmCapture(state: CaptureControllerState): CaptureControllerState {
  return {
    ...state,
    confirmed: true,
  };
}
