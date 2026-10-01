import WelcomeHero from './components/WelcomeHero';
import GetStartedButton from './components/GetStartedButton';
import AccountLink from './components/AccountLink';

export default function OnboardingPage() {
  return (
    <main className="onboarding-page">
      <WelcomeHero />
      <GetStartedButton />
      <AccountLink />
    </main>
  );
}
