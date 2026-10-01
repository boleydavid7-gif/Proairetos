import WelcomeHero from './components/WelcomeHero';
import GetStartedButton from './components/GetStartedButton';
import AccountLink from './components/AccountLink';
import BackgroundScene from './components/BackgroundScene';
import CompassMark from './components/CompassMark';
import OnboardingLayout from './components/OnboardingLayout';

export default function OnboardingPage() {
  return (
    <OnboardingLayout>
      <BackgroundScene />
      <CompassMark />
      <WelcomeHero />
      <GetStartedButton />
      <AccountLink />
    </OnboardingLayout>
  );
}
