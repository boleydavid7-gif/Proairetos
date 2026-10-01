import BackgroundScene from './BackgroundScene';

type Props = { children: React.ReactNode };

export default function OnboardingLayout({ children }: Props) {
  return (
    <main className="onboarding-layout">
      <BackgroundScene />
      {children}
    </main>
  );
}
