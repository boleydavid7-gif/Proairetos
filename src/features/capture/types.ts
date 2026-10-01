export type CaptureSource = 'manual' | 'assistant_proposal';

export type CaptureProposal = {
  text: string;
  proposedType: null | 'DO' | 'REMEMBER' | 'MAKE_TIME_FOR' | 'THINKING_ABOUT';
  confirmed: boolean;
  source: CaptureSource;
};
