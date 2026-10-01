export type AppFrameProps = {
  children: React.ReactNode;
};

export default function AppFrame({ children }: AppFrameProps) {
  return <main className="app-frame">{children}</main>;
}
