export type OnboardingStep = {
  title: string;
  lines: string[];
  action: string;
  brand?: boolean;
  /** A few short paragraphs on a readable panel (the meaning of the name, why the app exists). */
  prose?: boolean;
  /** The form for name and shifts. */
  form?: boolean;
  /** A panel in place of the form: Home Screen steps, or the other apps. */
  panel?: 'home-screen' | 'apps' | 'plans';
};

export const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Proairetos',
    prose: true,
    lines: [
      'Proairetos (προαιρετός) is ancient Greek for what is chosen deliberately.',
      'It comes from prohairesis (προαίρεσις), the Stoic name for our capacity to consider, judge and choose how we respond and act.',
      'We cannot control everything that happens to us, or give equal attention to everything that asks for it.',
      'We can become more deliberate about where our attention goes, how we use our time and what we put first.',
    ],
    action: 'Get started',
    brand: true,
  },
  {
    title: 'Why Proairetos',
    lines: [
      'I wanted to make it easier to bring the moving parts of everyday life together.',
      'A place to organize responsibilities, keep track of what matters, plan ahead and make room for personal growth.',
      'Not another system demanding your attention, but a tool that gives you more freedom to decide where your attention belongs.',
      'Because getting organized is meant to give you more time to live, not less.',
    ],
    prose: true,
    action: 'Continue',
  },
  {
    title: 'The Store',
    lines: [
      'There are responsibilities to manage, plans to make, habits to build, people to remember and things you’d like to accomplish.',
      'Proairetos brings these pieces together. Add the apps you need from the Store.',
    ],
    action: 'Continue',
    panel: 'apps',
  },
  {
    title: 'Make time for what matters',
    lines: [
      'You don’t have to do everything.',
      'You don’t have to plan every moment.',
      'You just have to make room for the things that matter to you.',
      'Let Proairetos help with the everyday, so you can focus on what makes life yours.',
      'Your life. Your choices. Your time.',
    ],
    prose: true,
    action: 'Continue',
  },
  {
    title: 'Prices and sync',
    lines: ['Proairetos is free. Sync is optional.'],
    action: 'Continue',
    panel: 'plans',
  },
  {
    title: 'Make it yours',
    lines: ['You can change any of this in Settings.'],
    action: 'Continue',
    form: true,
  },
  {
    title: 'On your Home Screen',
    lines: ['Open it in one tap, like any other app.'],
    action: 'Begin',
    panel: 'home-screen',
  },
];
