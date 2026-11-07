/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_SIGN_IN_WITH?: string;
  /** Set only for the phone apps: the live site's address, no trailing slash. */
  readonly VITE_API_BASE?: string;
}

/** When this copy of the app was built (vite.config.ts). */
declare const __BUILT_AT__: string;
