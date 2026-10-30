export type OnboardingStep = {
  title: string;
  lines: string[];
  action: string;
  /** The first step: the lamp, then the name as a dictionary entry. */
  brand?: boolean;
  /** The owner's words, lit one line at a time and then all together (as a lyrics view lights the line being sung). */
  lit?: boolean;
  /** A last line set apart, large, once the others have been read. */
  finale?: string;
  /** The form for name, room, color, schedule and the first intention. */
  form?: boolean;
  /** A panel under the words: the sails, the apps gathering, prices, or the Home Screen steps. */
  panel?: 'sails' | 'apps' | 'plans' | 'home-screen';
  /** The picture for it: the person's room, or the coast for the sails. */
  scene?: 'room' | 'sea';
};

/** The owner's words throughout. The welcome happens in the person's own room, lit by its one lamp. */
export const onboardingSteps: OnboardingStep[] = [
  {
    title: 'προαιρετός',
    lines: [
      'From prohairesis (προαίρεσις), the Stoic name for our capacity to consider, judge and choose how we respond and act.',
      'We cannot control everything that happens to us, or give equal attention to everything that asks for it.',
      'We can become more deliberate about where our attention goes, how we use our time and what we put first.',
    ],
    action: 'Continue',
    brand: true,
  },
  {
    title: 'Adjust your sails',
    lines: [
      'The sea isn’t yours to control. Your sails are.',
      'Proairetos gathers your plans, people, money, health and home into one calm place, so you can steer by what matters to you.',
    ],
    action: 'Continue',
    panel: 'sails',
    scene: 'sea',
  },
  {
    title: 'Why Proairetos',
    lines: [
      'I wanted to make it easier to bring the moving parts of everyday life together.',
      'A place to organize responsibilities, keep track of what matters, plan ahead and make room for personal growth.',
      'Not another system demanding your attention, but a tool that gives you more freedom to decide where your attention belongs.',
      'Because getting organized is meant to give you more time to live, not less.',
    ],
    lit: true,
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
    ],
    finale: 'Your life. Your choices. Your time.',
    lit: true,
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
