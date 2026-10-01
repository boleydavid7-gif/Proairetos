import BackgroundScene from './BackgroundScene';

type Props = { children: React.ReactNode };

export default function OnboardingLayout({ children }: Props) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-center">
      <BackgroundScene />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center justify-center gap-8">
        {children}
      </div>
    </main>
  );
}
