import WelcomeHero from './components/WelcomeHero';
import GetStartedButton from './components/GetStartedButton';
import AccountLink from './components/AccountLink';
import CompassMark from './components/CompassMark';
import OnboardingLayout from './components/OnboardingLayout';

type Props = {
  onGetStarted: () => void;
};

export default function OnboardingPage({ onGetStarted }: Props) {
  return (
    <OnboardingLayout>
      <div className="onboarding-content">
        <CompassMark />
        <WelcomeHero />
        <div className="onboarding-actions">
          <GetStartedButton onClick={onGetStarted} />
          <AccountLink />
        </div>
      </div>
    </OnboardingLayout>
  );
}
