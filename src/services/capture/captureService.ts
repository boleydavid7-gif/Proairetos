export type CaptureProposal = {
  text: string;
  proposedType?: 'DO' | 'REMEMBER' | 'MAKE_TIME_FOR' | 'THINKING_ABOUT';
  confirmed: boolean;
};

export function createCaptureProposal(text: string): CaptureProposal {
  return {
    text,
    confirmed: false,
  };
}
