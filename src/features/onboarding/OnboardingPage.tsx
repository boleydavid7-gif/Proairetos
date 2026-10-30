import { useState } from 'react';
import CompassRose from '../../components/brand/CompassRose';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import OnboardingLayout from './components/OnboardingLayout';
import StepDots from './components/StepDots';
import { onboardingSteps } from './steps';
import HomeScreen from './components/HomeScreen';
import MoreApps, { PlansAndSync } from './components/MoreApps';
import { openSettingsAt } from '../settings/settingsViews';
import MakeItYours, { type Choices } from './components/MakeItYours';
import type { AppRoute } from '../../app/routes/routeTypes';
import { setDisplayName } from '../../data/storage/preferences';
import { isSyncConfigured } from '../../data/sync/supabase';

type Props = {
  /** Enters the app, optionally on a given screen. */
  onGetStarted: (next?: AppRoute) => void;
};

export default function OnboardingPage({ onGetStarted }: Props) {
  const [index, setIndex] = useState(0);
  const step = onboardingSteps[index];
  const isLast = index === onboardingSteps.length - 1;
  const [choices, setChoices] = useState<Choices>({ name: '', shifts: false });
  const [saving, setSaving] = useState(false);

  async function finish(trial = false) {
    setSaving(true);
    if (choices.name.trim()) setDisplayName(choices.name);
    // The trial needs an account, so it opens Account and sync; the schedule stays a row in Settings.
    if (trial) {
      openSettingsAt('account');
      onGetStarted('settings');
      return;
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

      <section className={`onboarding-hero${step.form || step.panel ? ' onboarding-hero--form' : ''}${step.brand ? ' onboarding-hero--brand' : ''}`} aria-live="polite" key={index}>
        {!step.form && !step.panel && <CompassRose size={76} tone="light" />}
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
        {step.panel === 'home-screen' && <HomeScreen />}
        {step.panel === 'plans' && <PlansAndSync />}
        {step.panel === 'apps' && (
          <MoreApps
            onStore={() => {
              openSettingsAt('store');
              onGetStarted('settings');
            }}
          />
        )}
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
        {/* Signing in lives in Settings, under Account and sync. Prices and sync can be passed over. */}
        {isLast && isSyncConfigured ? (
          <button type="button" className="onboarding-link" disabled={saving} onClick={() => void finish(true)}>
            Begin with a free trial
          </button>
        ) : step.panel === 'plans' ? (
          <button type="button" className="onboarding-link" onClick={() => setIndex(index + 1)}>
            Skip this
          </button>
        ) : (
        <button
          type="button"
          className="onboarding-link"
          style={{ visibility: index === 0 ? 'visible' : 'hidden' }}
          onClick={() => onGetStarted('settings')}
        >
          I already have an account
        </button>
        )}
      </div>
    </OnboardingLayout>
  );
}
