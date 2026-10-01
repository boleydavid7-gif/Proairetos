export type AppShellState = {
  route: string;
};

export function createAppShell(route: string): AppShellState {
  return { route };
}
