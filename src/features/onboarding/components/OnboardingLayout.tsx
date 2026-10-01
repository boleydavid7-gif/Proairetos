import BackgroundScene from './BackgroundScene';

type Props = { children: React.ReactNode };

export default function OnboardingLayout({ children }: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <BackgroundScene />
      {children}
    </main>
  );
}
