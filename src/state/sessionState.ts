export type SessionState = {
  userId?: string;
  authenticated: boolean;
};

export const initialSessionState: SessionState = {
  authenticated: false,
};
