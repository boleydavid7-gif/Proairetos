import { useState } from 'react';
import CompassRose from '../../components/brand/CompassRose';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import OnboardingLayout from './components/OnboardingLayout';
import StepDots from './components/StepDots';
import { onboardingSteps } from './steps';
import MakeItYours, { type Choices } from './components/MakeItYours';
import type { AppRoute } from '../../app/routes/routeTypes';
import { compassService } from '../../app/services';
import { setDisplayName } from '../../data/storage/preferences';

type Props = {
  /** Enters the app, optionally on a given screen. */
  onGetStarted: (next?: AppRoute) => void;
};

export default function OnboardingPage({ onGetStarted }: Props) {
  const [index, setIndex] = useState(0);
  const step = onboardingSteps[index];
  const isLast = index === onboardingSteps.length - 1;
  const [choices, setChoices] = useState<Choices>({ name: '', values: [], shifts: false });
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    if (choices.name.trim()) setDisplayName(choices.name);
    for (const value of choices.values) {
      // A value that is already chosen (say, from a restored backup) is simply skipped.
      await compassService.chooseValue(value).catch(() => undefined);
    }
    onGetStarted(choices.shifts ? 'schedule' : undefined);
  }

  return (
    <OnboardingLayout>
      <div className="onboarding-topbar">
        <button
          type="button"
          className="onboarding-topbar__button"
          aria-label="Back"
          style={{ visibility: index === 0 ? 'hidden' : 'visible' }}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeftIcon size={22} />
        </button>
        <button type="button" className="onboarding-topbar__button" onClick={() => onGetStarted()}>
          Skip
        </button>
      </div>

      <section className={`onboarding-hero${step.form ? ' onboarding-hero--form' : ''}`} aria-live="polite" key={index}>
        {!step.form && <CompassRose size={76} tone="light" />}
        {step.brand ? (
          <h1 className="onboarding-hero__brand">{step.title}</h1>
        ) : (
          <h1 className="onboarding-hero__title">{step.title}</h1>
        )}
        <p className="onboarding-hero__lines">
          {step.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
        {step.form && <MakeItYours choices={choices} onChange={setChoices} />}
      </section>

      <div className="onboarding-actions">
        <StepDots count={onboardingSteps.length} current={index} />
        <button
          type="button"
          className="onboarding-primary"
          disabled={saving}
          onClick={() => (isLast ? void finish() : setIndex(index + 1))}
        >
          {step.action}
        </button>
        {/* Signing in lives in Settings, under Account and sync. */}
        <button
          type="button"
          className="onboarding-link"
          style={{ visibility: index === 0 ? 'visible' : 'hidden' }}
          onClick={() => onGetStarted('settings')}
        >
          I already have an account
        </button>
      </div>
    </OnboardingLayout>
  );
}
