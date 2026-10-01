import { useState } from 'react';
import CompassRose from '../../components/brand/CompassRose';
import { ArrowLeftIcon } from '../../components/icons/Icons';
import OnboardingLayout from './components/OnboardingLayout';
import StepDots from './components/StepDots';
import { onboardingSteps } from './steps';

type Props = {
  onGetStarted: () => void;
};

export default function OnboardingPage({ onGetStarted }: Props) {
  const [index, setIndex] = useState(0);
  const step = onboardingSteps[index];
  const isLast = index === onboardingSteps.length - 1;

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
        <button type="button" className="onboarding-topbar__button" onClick={onGetStarted}>
          Skip
        </button>
      </div>

      <section className="onboarding-hero" aria-live="polite" key={index}>
        <CompassRose size={76} tone="light" />
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
      </section>

      <div className="onboarding-actions">
        <StepDots count={onboardingSteps.length} current={index} />
        <button
          type="button"
          className="onboarding-primary"
          onClick={() => (isLast ? onGetStarted() : setIndex(index + 1))}
        >
          {step.action}
        </button>
        {/* Accounts do not exist yet, so this enters the app like Skip. */}
        <button
          type="button"
          className="onboarding-link"
          style={{ visibility: index === 0 ? 'visible' : 'hidden' }}
          onClick={onGetStarted}
        >
          I already have an account
        </button>
      </div>
    </OnboardingLayout>
  );
}
