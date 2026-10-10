import { useState } from 'react';
import { signInProviders, type SignInProvider } from '../../data/sync/supabase';
import { signInWith } from '../sync/syncController';

const NAMES: Record<SignInProvider, string> = { google: 'Google', apple: 'Apple' };

/**
 * "Continue with Google / Apple", shown only for the services turned on for this site. Your passphrase still
 * unlocks your data afterwards: the sign-in proves who you are, the passphrase is what reads your things.
 */
export function ProviderButtons({ className }: { className: string }) {
  const [error, setError] = useState('');
  if (signInProviders.length === 0) return null;
  return (
    <div className="provider-buttons">
      {signInProviders.map((provider) => (
        <button
          key={provider}
          type="button"
          className={className}
          onClick={() => {
            setError('');
            void signInWith(provider).catch((cause) => setError(cause instanceof Error ? cause.message : 'That did not work. Try the email code instead.'));
          }}
        >
          Continue with {NAMES[provider]}
        </button>
      ))}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
