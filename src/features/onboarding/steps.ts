export type OnboardingStep = {
  title: string;
  lines: string[];
  action: string;
  brand?: boolean;
};

export const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Proairetos',
    lines: ['Clarity today.', 'A steadier tomorrow.'],
    action: 'Get Started',
    brand: true,
  },
  {
    title: 'Capture first',
    lines: ['Get things out of your head the moment they arrive.', 'Sorting can wait.'],
    action: 'Continue',
  },
  {
    title: 'Yours to choose',
    lines: ['You decide what matters.', 'Proairetos keeps it in sight and never keeps score.'],
    action: 'Begin',
  },
];
