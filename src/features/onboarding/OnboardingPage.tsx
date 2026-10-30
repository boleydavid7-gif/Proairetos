import { useCallback, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import CompassRose from '../../components/brand/CompassRose';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import OnboardingLayout from './components/OnboardingLayout';
import StepLine from './components/StepLine';
import Sails from './components/Sails';
import LampSwitch from './components/LampSwitch';
import LitLines from './components/LitLines';
import { onboardingSteps } from './steps';
import HomeScreen from './components/HomeScreen';
import MoreApps, { PlansAndSync } from './components/MoreApps';
import { openSettingsAt } from '../settings/settingsViews';
import MakeItYours, { type Choices } from './components/MakeItYours';
import type { AppRoute } from '../../app/routes/routeTypes';
import { loadAppearance, loadDaySettings, saveAppearance, setDisplayName } from '../../data/storage/preferences';
import { personalDate } from '../../core/rhythm/personalDay';
import { reflectionService } from '../../app/services';
import { applyAppearance } from '../../app/appearance';
import { tap } from '../../app/feel';
import { isSyncConfigured } from '../../data/sync/supabase';

type Props = {
  /** Enters the app, optionally on a given screen. */
  onGetStarted: (next?: AppRoute) => void;
};

const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
/** How long the words take to leave before Today comes in (the room stays: Today wears the same wallpaper). */
const LEAVING_MS = 560;

export default function OnboardingPage({ onGetStarted }: Props) {
  const [index, setIndex] = useState(0);
  // Which way the last move went, so the next step comes in from that side.
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const step = onboardingSteps[index];
  const isLast = index === onboardingSteps.length - 1;
  const [choices, setChoices] = useState<Choices>(() => {
    const look = loadAppearance();
    return { name: '', shifts: false, intention: '', room: look.room, color: look.color };
  });
  const [lit, setLit] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  // Chosen on the setup step; the Home Screen step comes after it and then begins with it.
  const [trial, setTrial] = useState(false);

  /** The room and color chosen here become Settings > Appearance, as if chosen there. */
  const keepLook = () => {
    const look = loadAppearance();
    if (look.room === choices.room && look.color === choices.color) return;
    const next = { ...look, room: choices.room, color: choices.color };
    saveAppearance(next);
    applyAppearance(next);
  };

  /** The words leave and the room stays; then Today (or the page asked for) comes in. */
  const leave = (next?: AppRoute) => {
    keepLook();
    setLeaving(true);
    window.setTimeout(() => onGetStarted(next), still() ? 0 : LEAVING_MS);
  };

  async function finish(trial = false) {
    if (leaving) return;
    if (choices.name.trim()) setDisplayName(choices.name);
    // One thing that matters today becomes Today's intention: the first deliberate choice in the app.
    if (choices.intention.trim()) {
      await reflectionService.setIntention(personalDate(new Date(), [], loadDaySettings()), choices.intention).catch(() => undefined);
    }
    // The trial needs an account, so it opens Account and sync; the schedule stays a row in Settings.
    if (trial) {
      openSettingsAt('account');
      leave('settings');
      return;
    }
    leave(choices.shifts ? 'schedule' : undefined);
  }

  const go = (next: number) => {
    if (next < 0 || next >= onboardingSteps.length || next === index || leaving) return;
    if (index === 0 && !lit) return;
    tap();
    setDirection(next > index ? 'forward' : 'back');
    setIndex(next);
    document.querySelector('.onboarding-layout')?.scrollTo({ top: 0, left: 0 });
  };
  const onSailed = useCallback(() => {
    // Once the sail holds the wind, bring the closing words under it up above the button.
    window.setTimeout(
      () => document.querySelector('.sails + .onboarding-hero__lines')?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }),
      300,
    );
  }, []);
  const onLit = useCallback(() => setLit(true), []);

  // A sideways swipe moves between steps, as the buttons do; never from a field, the sails or a slider.
  const onTouchStart = (event: TouchEvent) => {
    const target = event.target as HTMLElement;
    touch.current = target.closest('input, textarea, select, .sails, .lamp-switch')
      ? null
      : { x: event.touches[0].clientX, y: event.touches[0].clientY };
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

  const dark = index === 0 && !lit;

  return (
    <OnboardingLayout
      scene={step.scene ?? 'room'}
      room={choices.room}
      color={choices.color}
      lit={lit}
      leaving={leaving}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
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
        <button type="button" className="onboarding-topbar__button" onClick={() => leave()}>
          Skip
        </button>
      </div>

      <section
        className={`onboarding-hero${step.form || step.panel ? ' onboarding-hero--panel' : ''}${step.lit ? ' onboarding-hero--lit' : ''}${step.brand ? ' onboarding-hero--word' : ''}`}
        data-enter={direction}
        aria-live="polite"
        key={index}
      >
        {step.brand ? (
          dark ? (
            <>
              <h1 className="onboarding-word__name onboarding-word__name--dark">
                <CompassRose size={28} tone="light" /> Proairetos
              </h1>
              <LampSwitch onLit={onLit} />
            </>
          ) : (
            <>
              <p className="onboarding-word__name">
                <CompassRose size={28} tone="light" /> Proairetos
              </p>
              <h1 className="onboarding-word" lang="el">{step.title}</h1>
              <p className="onboarding-word__say">pro·ai·re·tós</p>
              <p className="onboarding-word__sense">
                <i>adjective</i> chosen deliberately
              </p>
              <Lines lines={step.lines} />
            </>
          )
        ) : (
          <h1 className="onboarding-hero__title">{step.title}</h1>
        )}
        {step.panel === 'sails' && (
          <>
            <Lines lines={step.lines.slice(0, 1)} />
            <Sails onSorted={onSailed} />
            <Lines lines={step.lines.slice(1)} />
          </>
        )}
        {step.lit && <LitLines lines={step.lines} finale={step.finale} />}
        {!step.brand && !step.lit && step.panel !== 'sails' && <Lines lines={step.lines} />}
        {step.form && <MakeItYours choices={choices} onChange={setChoices} />}
        {step.panel === 'home-screen' && <HomeScreen />}
        {step.panel === 'plans' && <PlansAndSync />}
        {step.panel === 'apps' && (
          <MoreApps
            onStore={() => {
              openSettingsAt('store');
              leave('settings');
            }}
          />
        )}
      </section>

      <div className="onboarding-actions" data-waiting={dark || undefined}>
        <StepLine count={onboardingSteps.length} current={index} />
        {!dark && (
          <button
            type="button"
            className="onboarding-primary"
            disabled={leaving}
            onClick={() => (isLast ? void finish(trial) : go(index + 1))}
          >
            {step.action}
          </button>
        )}
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
          <button type="button" className="onboarding-link" disabled={leaving} onClick={() => void finish(trial)}>
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
            onClick={() => {
              openSettingsAt('account');
              leave('settings');
            }}
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
