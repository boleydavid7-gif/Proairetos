import { useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import CompassRose from '../../components/brand/CompassRose';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import OnboardingLayout from './components/OnboardingLayout';
import StepLine from './components/StepLine';
import Sails from './components/Sails';
import { onboardingSteps } from './steps';
import HomeScreen from './components/HomeScreen';
import MoreApps, { PlansAndSync } from './components/MoreApps';
import { openSettingsAt } from '../settings/settingsViews';
import MakeItYours, { type Choices } from './components/MakeItYours';
import type { AppRoute } from '../../app/routes/routeTypes';
import { loadDaySettings, setDisplayName } from '../../data/storage/preferences';
import { personalDate } from '../../core/rhythm/personalDay';
import { reflectionService } from '../../app/services';
import { tap } from '../../app/feel';
import { isSyncConfigured } from '../../data/sync/supabase';

type Props = {
  /** Enters the app, optionally on a given screen. */
  onGetStarted: (next?: AppRoute) => void;
};

export default function OnboardingPage({ onGetStarted }: Props) {
  const [index, setIndex] = useState(0);
  const step = onboardingSteps[index];
  const isLast = index === onboardingSteps.length - 1;
  const [choices, setChoices] = useState<Choices>({ name: '', shifts: false, intention: '' });
  // The sails step keeps its closing words back until the four are sorted (or the person goes on).
  const [sorted, setSorted] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  // Chosen on the setup step; the Home Screen step comes after it and then begins with it.
  const [trial, setTrial] = useState(false);

  async function finish(trial = false) {
    setSaving(true);
    if (choices.name.trim()) setDisplayName(choices.name);
    // One thing that matters today becomes Today's intention: the first deliberate choice in the app.
    if (choices.intention.trim()) {
      await reflectionService.setIntention(personalDate(new Date(), [], loadDaySettings()), choices.intention).catch(() => undefined);
    }
    // The trial needs an account, so it opens Account and sync; the schedule stays a row in Settings.
    if (trial) {
      openSettingsAt('account');
      onGetStarted('settings');
      return;
    }
    onGetStarted(choices.shifts ? 'schedule' : undefined);
  }

  const go = (next: number) => {
    if (next < 0 || next >= onboardingSteps.length || next === index) return;
    tap();
    setIndex(next);
  };
  // A sideways swipe moves between steps, as the buttons do; never from a field or a sideways list.
  const onTouchStart = (event: TouchEvent) => {
    const target = event.target as HTMLElement;
    touch.current = target.closest('input, textarea, select') ? null : { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && !isLast) go(index + 1);
    if (dx > 0) go(index - 1);
  };

  return (
    <OnboardingLayout step={index} count={onboardingSteps.length} scene={step.scene ?? 'valley'} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="onboarding-topbar">
        <button
          type="button"
          className="onboarding-topbar__button"
          aria-label="Back"
          style={{ visibility: index === 0 ? 'hidden' : 'visible' }}
          onClick={() => go(index - 1)}
        >
          <ArrowLeftIcon size={22} />
        </button>
        <button type="button" className="onboarding-topbar__button" onClick={() => onGetStarted()}>
          Skip
        </button>
      </div>

      <section
        className={`onboarding-hero${step.form || step.panel ? ' onboarding-hero--form' : ''}${step.prose ? ' onboarding-hero--prose' : ''}${step.brand ? ' onboarding-hero--word' : ''}`}
        aria-live="polite"
        key={index}
      >
        {step.brand ? (
          <>
            <p className="onboarding-word__name">
              <CompassRose size={28} tone="light" /> Proairetos
            </p>
            <h1 className="onboarding-word" lang="el">{step.title}</h1>
            <p className="onboarding-word__say">pro·ai·re·tós</p>
            <p className="onboarding-word__sense">
              <i>adjective</i> chosen deliberately
            </p>
          </>
        ) : (
          <h1 className="onboarding-hero__title">{step.title}</h1>
        )}
        {step.panel === 'sails' ? (
          <>
            <Sails
              onSorted={() => {
                setSorted(true);
                // The closing words come in below the cards; bring them up above the button.
                setTimeout(() => document.querySelector('.sails + .onboarding-hero__lines')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
              }}
            />
            {sorted && <Lines lines={step.lines} />}
          </>
        ) : (
          <Lines lines={step.lines} />
        )}
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
        <StepLine count={onboardingSteps.length} current={index} />
        <button
          type="button"
          className="onboarding-primary"
          disabled={saving}
          onClick={() => (isLast ? void finish(trial) : go(index + 1))}
        >
          {step.action}
        </button>
        {/* Signing in lives in Settings, under Account and sync. Prices and sync can be passed over. */}
        {step.form && isSyncConfigured ? (
          <button
            type="button"
            className="onboarding-link"
            onClick={() => {
              setTrial(true);
              go(index + 1);
            }}
          >
            Continue with a free trial
          </button>
        ) : isLast ? (
          <button type="button" className="onboarding-link" disabled={saving} onClick={() => void finish(trial)}>
            Skip this
          </button>
        ) : step.panel === 'plans' ? (
          <button type="button" className="onboarding-link" onClick={() => go(index + 1)}>
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

/** The step's words, each rising in after the one before. */
function Lines({ lines }: { lines: string[] }) {
  return (
    <p className="onboarding-hero__lines">
      {lines.map((line, at) => (
        <span key={line} style={{ '--i': at } as CSSProperties}>
          {line}
        </span>
      ))}
    </p>
  );
}
