import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type TouchEvent } from 'react';
import { flushSync } from 'react-dom';
import CompassRose from '../../components/brand/CompassRose';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import TextSizeSlider from '../../components/ui/TextSize';
import OnboardingLayout from './components/OnboardingLayout';
import StepLine from './components/StepLine';
import Sails from './components/Sails';
import LampSwitch from './components/LampSwitch';
import LitLines from './components/LitLines';
import { onboardingSteps } from './steps';
import HomeScreen from './components/HomeScreen';
import MoreApps from './components/MoreApps';
import { openSettingsAt } from '../settings/settingsViews';
import AccountSection, { useSyncStatus } from '../settings/AccountSection';
import MakeItYours, { type Choices } from './components/MakeItYours';
import type { AppRoute } from '../../app/routes/routeTypes';
import { loadAppearance, loadDaySettings, saveAppearance, setDisplayName, type TextSize } from '../../data/storage/preferences';
import { personalDate } from '../../core/rhythm/personalDay';
import { reflectionService } from '../../app/services';
import { applyAppearance } from '../../app/appearance';
import { tap } from '../../app/feel';
import { isInstalled } from '../../app/install/installPrompt';
import { isSyncConfigured } from '../../data/sync/supabase';
import { Sym } from '../../lamplight/icons';

type Props = {
  /** Enters the app, optionally on a given screen. */
  onGetStarted: (next?: AppRoute) => void;
};

const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
/** How long the words take to leave before Today comes in (the room stays: Today wears the same wallpaper). */
const LEAVING_MS = 560;
/** Where the welcome was left, so closing it partway opens it there again (device only, cleared on leaving). */
const KEPT = 'proairetosWelcome';
type Kept = { index: number; lit: boolean; choices: Choices };

function readKept(): Kept | null {
  try {
    const kept = JSON.parse(localStorage.getItem(KEPT) ?? 'null') as Kept | null;
    return kept && typeof kept.index === 'number' && kept.choices ? kept : null;
  } catch {
    return null;
  }
}

export default function OnboardingPage({ onGetStarted }: Props) {
  // The Home Screen step only while Proairetos is not on the Home Screen already.
  const steps = useMemo(() => onboardingSteps.filter((each) => each.panel !== 'home-screen' || !isInstalled()), []);
  const kept = useMemo(readKept, []);
  const [index, setIndex] = useState(() => Math.min(kept?.index ?? 0, steps.length - 1));
  // Which way the last move went, so the next step comes in from that side.
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const [choices, setChoices] = useState<Choices>(() => {
    const look = loadAppearance();
    return { name: '', shifts: false, intention: '', room: look.room, color: look.color, ...kept?.choices };
  });
  const [lit, setLit] = useState(kept?.lit ?? false);
  const [leaving, setLeaving] = useState(false);
  const [sizes, setSizes] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>(() => loadAppearance().textSize);
  const [account, setAccount] = useState(false);
  const status = useSyncStatus();
  const touch = useRef<{ x: number; y: number; sideways?: boolean } | null>(null);
  const hero = useRef<HTMLElement>(null);

  useEffect(() => {
    if (leaving) return;
    try {
      localStorage.setItem(KEPT, JSON.stringify({ index, lit, choices } satisfies Kept));
    } catch {
      // Without storage the welcome simply starts over next time.
    }
  }, [index, lit, choices, leaving]);

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
    try {
      localStorage.removeItem(KEPT);
    } catch {
      // Nothing kept to clear.
    }
    setLeaving(true);
    window.setTimeout(() => onGetStarted(next), still() ? 0 : LEAVING_MS);
  };

  async function finish() {
    if (leaving) return;
    if (choices.name.trim()) setDisplayName(choices.name);
    // One thing that matters today becomes Today's intention: the first deliberate choice in the app.
    if (choices.intention.trim()) {
      await reflectionService.setIntention(personalDate(new Date(), [], loadDaySettings()), choices.intention).catch(() => undefined);
    }
    leave(choices.shifts ? 'schedule' : undefined);
  }

  const go = (next: number) => {
    if (next < 0 || next >= steps.length || next === index || leaving) return;
    if (index === 0 && !lit) return;
    tap();
    const move = () => {
      setDirection(next > index ? 'forward' : 'back');
      setIndex(next);
      setSizes(false);
    };
    document.querySelector('.onboarding-layout')?.scrollTo({ top: 0, left: 0 });
    // The title, the line of light and the action carry over from step to step (view transitions where the browser has
    // them); the rest of the step comes in on its own rise.
    const start = (document as Document & { startViewTransition?: (update: () => void) => unknown }).startViewTransition;
    if (start && !still()) start.call(document, () => flushSync(move));
    else move();
  };
  const onSailed = useCallback(() => {
    // Once the sail holds the wind, bring the closing words under it up above the button.
    window.setTimeout(
      () => document.querySelector('.sails + .onboarding-hero__lines')?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }),
      300,
    );
  }, []);
  const onLit = useCallback(() => setLit(true), []);

  // Signed in from the welcome: the account sheet closes by itself and the welcome goes on.
  useEffect(() => {
    if (!account || status.phase !== 'ready') return;
    const timer = window.setTimeout(() => {
      setAccount(false);
      if (isLast) void finish();
      else go(index + 1);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [account, status.phase]);

  const changeSize = (size: TextSize) => {
    setTextSize(size);
    const next = { ...loadAppearance(), textSize: size };
    saveAppearance(next);
    applyAppearance(next);
  };

  // A sideways swipe moves between steps, the page following the finger; never from a field, the sails or a slider.
  const follow = (dx: number) => {
    const element = hero.current;
    if (!element) return;
    element.style.transition = 'none';
    element.style.translate = `${dx * 0.5}px 0`;
    element.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / 600));
  };
  const settle = () => {
    const element = hero.current;
    if (!element) return;
    element.style.transition = 'translate 420ms var(--ll-spring, ease-out), opacity 420ms ease';
    element.style.translate = '';
    element.style.opacity = '';
  };
  const onTouchStart = (event: TouchEvent) => {
    const target = event.target as HTMLElement;
    touch.current = target.closest('input, textarea, select, .sails, .lamp-switch, .ob-account')
      ? null
      : { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const onTouchMove = (event: TouchEvent) => {
    const start = touch.current;
    if (!start || still()) return;
    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;
    if (start.sideways === undefined && Math.hypot(dx, dy) > 10) start.sideways = Math.abs(dx) > Math.abs(dy) * 1.5;
    if (start.sideways && !(index === 0 && !lit)) follow(dx);
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    const turn = Math.abs(dx) >= 60 && Math.abs(dx) >= Math.abs(dy) * 1.5 && ((dx < 0 && !isLast) || (dx > 0 && index > 0));
    if (!turn) return settle();
    if (hero.current) hero.current.style.transition = 'none';
    go(dx < 0 ? index + 1 : index - 1);
  };

  const dark = index === 0 && !lit;
  const signIn = step.form && isSyncConfigured && status.phase !== 'ready' && status.phase !== 'unavailable';

  return (
    <OnboardingLayout
      scene={step.scene ?? 'room'}
      room={choices.room}
      color={choices.color}
      lit={lit}
      leaving={leaving}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {index > 0 && (
        <div className="onboarding-aside" aria-hidden="true">
          <CompassRose size={56} tone="light" />
          <span lang="el">προαιρετός</span>
        </div>
      )}

      <div className="onboarding-topbar">
        {index === 0 ? (
          <button
            type="button"
            className="onboarding-topbar__button onboarding-topbar__aa"
            aria-label="Text size"
            aria-expanded={sizes}
            onClick={() => setSizes((open) => !open)}
          >
            Aa
          </button>
        ) : (
          <button type="button" className="onboarding-topbar__button" aria-label="Back" onClick={() => go(index - 1)}>
            <ArrowLeftIcon size={22} />
          </button>
        )}
        <button type="button" className="onboarding-topbar__button" onClick={() => leave()}>
          Skip
        </button>
      </div>
      {sizes && index === 0 && (
        <div className="ob-card onboarding-sizes">
          <TextSizeSlider value={textSize} onChange={changeSize} />
        </div>
      )}

      <section
        ref={hero}
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
        <StepLine count={steps.length} current={index} />
        {!dark && (
          <button
            type="button"
            className="onboarding-primary"
            disabled={leaving}
            onClick={() => {
              if (signIn) {
                keepLook();
                setAccount(true);
              } else if (isLast) void finish();
              else go(index + 1);
            }}
          >
            {signIn ? 'Start your free trial' : step.action}
          </button>
        )}
        {signIn ? (
          <button type="button" className="onboarding-link" onClick={() => (isLast ? void finish() : go(index + 1))}>
            Continue without an account
          </button>
        ) : index === 0 ? (
          <div className="onboarding-links">
            <button
              type="button"
              className="onboarding-link"
              onClick={() => {
                openSettingsAt('account');
                leave('settings');
              }}
            >
              I already have an account
            </button>
            <button
              type="button"
              className="onboarding-link"
              onClick={() => {
                openSettingsAt('backup');
                leave('settings');
              }}
            >
              Restore a backup
            </button>
          </div>
        ) : isLast && step.panel === 'home-screen' ? (
          <button type="button" className="onboarding-link" disabled={leaving} onClick={() => void finish()}>
            Skip this
          </button>
        ) : (
          <span className="onboarding-link onboarding-link--room" aria-hidden="true" />
        )}
      </div>

      {account && <AccountSheet onClose={() => setAccount(false)} />}
    </OnboardingLayout>
  );
}

/** Making an account without leaving the welcome: the same sign-in as Settings, over the room, closed by Close, Escape
 *  or by finishing (the page goes on by itself once the account is open). */
function AccountSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ob-account" role="dialog" aria-modal="true" aria-label="Your account">
      <div className="ob-account__sheet">
        <div className="ob-account__head">
          <h2>Your account</h2>
          <button type="button" className="onboarding-topbar__button" aria-label="Close" onClick={onClose}>
            <Sym name="close" size={22} />
          </button>
        </div>
        <AccountSection />
      </div>
    </div>
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
