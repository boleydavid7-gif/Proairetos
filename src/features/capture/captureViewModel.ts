export type CaptureViewState = {
  text: string;
  confirmed: boolean;
};

export function createCaptureViewModel(text = ''): CaptureViewState {
  return {
    text,
    confirmed: false,
  };
}
