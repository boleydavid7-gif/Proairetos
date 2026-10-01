import WelcomeHero from './components/WelcomeHero';
import GetStartedButton from './components/GetStartedButton';
import AccountLink from './components/AccountLink';
import CompassMark from './components/CompassMark';
import OnboardingLayout from './components/OnboardingLayout';

export default function OnboardingPage() {
  return (
    <OnboardingLayout>
      <div className="onboarding-content">
        <CompassMark />
        <WelcomeHero />
        <div className="onboarding-actions">
          <GetStartedButton />
          <AccountLink />
        </div>
      </div>
    </OnboardingLayout>
  );
}
