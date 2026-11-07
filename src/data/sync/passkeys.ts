import { fromBase64Url, toBase64Url } from '../../../supabase/functions/_shared/webauthn';

/*
 * Passkeys in the browser (WebAuthn). A passkey belongs to the site, so the same one works in every app of the
 * family, including each iPhone Home Screen app with its own storage. Its PRF secret (asked for with a fixed salt)
 * opens the data key; its signature signs in through the `passkey-sign-in` function.
 */

const PRF_SALT = new TextEncoder().encode('proairetos-passkey-unlock-v1');

export function passkeysHere(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext && typeof window.PublicKeyCredential === 'function' && Boolean(navigator.credentials);
}

/** Whether this browser offers passkeys in the keyboard's suggestions on a sign-in field. */
export async function passkeyAutofillHere(): Promise<boolean> {
  if (!passkeysHere()) return false;
  const check = (window.PublicKeyCredential as unknown as { isConditionalMediationAvailable?: () => Promise<boolean> }).isConditionalMediationAvailable;
  return Boolean(await check?.().catch(() => false));
}

export class PasskeyCancelled extends Error {
  constructor() {
    super('The passkey was not used.');
    this.name = 'PasskeyCancelled';
  }
}

function asked<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((cause: unknown) => {
    if (cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'AbortError')) throw new PasskeyCancelled();
    if (cause instanceof DOMException && cause.name === 'InvalidStateError') throw new Error('This device already has a passkey for your account.');
    throw cause;
  });
}

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: BufferSource } } };

function prfSecret(credential: PublicKeyCredential): Uint8Array<ArrayBuffer> | undefined {
  const first = (credential.getClientExtensionResults() as PrfResults).prf?.results?.first;
  if (!first) return undefined;
  if (first instanceof ArrayBuffer) return new Uint8Array(first.slice(0));
  const view = first as ArrayBufferView;
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice();
}

/** A short name for the passkey's list: what kind of device made it. */
export function deviceLabel(agent = typeof navigator === 'undefined' ? '' : navigator.userAgent): string {
  if (/iPhone/.test(agent)) return 'iPhone';
  if (/iPad/.test(agent)) return 'iPad';
  if (/Android/.test(agent)) return 'Android';
  if (/Macintosh/.test(agent)) return 'Mac';
  if (/Windows/.test(agent)) return 'Windows';
  return 'This device';
}

export type NewPasskey = {
  credentialId: string;
  publicKey: string;
  algorithm: number;
  rpId: string;
  /** Absent when this device's passkeys cannot give a secret (then the passkey signs in, and the passphrase opens). */
  secret?: Uint8Array<ArrayBuffer>;
  /** No secret yet, but this device's passkeys can give one when used: one more tap asks for it. */
  secretOnUse: boolean;
};

export async function createPasskey(user: { id: string; email: string }, exclude: readonly string[] = []): Promise<NewPasskey> {
  const rpId = location.hostname;
  const credential = (await asked(
    navigator.credentials.create({
      publicKey: {
        rp: { id: rpId, name: 'Proairetos' },
        user: { id: new TextEncoder().encode(user.id), name: user.email, displayName: user.email },
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
        excludeCredentials: exclude.map((id) => ({ type: 'public-key' as const, id: fromBase64Url(id) })),
        extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
      },
    }),
  )) as PublicKeyCredential | null;
  if (!credential) throw new PasskeyCancelled();
  const response = credential.response as AuthenticatorAttestationResponse;
  const publicKey = response.getPublicKey?.();
  const algorithm = response.getPublicKeyAlgorithm?.();
  if (!publicKey || (algorithm !== -7 && algorithm !== -257)) throw new Error('This device made a passkey of a kind Proairetos cannot use.');
  const credentialId = toBase64Url(new Uint8Array(credential.rawId));
  const secret = prfSecret(credential);
  const prf = (credential.getClientExtensionResults() as PrfResults).prf;
  // iPhones give the secret only when the passkey is used, not when it is made. Asking at once is refused (Safari
  // allows a passkey only straight after a tap), so the caller offers one more tap for it.
  return { credentialId, publicKey: toBase64Url(new Uint8Array(publicKey)), algorithm, rpId, secret, secretOnUse: !secret && prf?.enabled !== false };
}

export type UsedPasskey = {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  secret?: Uint8Array<ArrayBuffer>;
};

/** Asks for a passkey: any of this site's (signing in), or one of those listed (opening the data while signed in). */
export async function askForPasskey({ challenge, allow, conditional, signal }: { challenge?: string; allow?: readonly string[]; conditional?: boolean; signal?: AbortSignal } = {}): Promise<UsedPasskey> {
  const credential = (await asked(
    navigator.credentials.get({
      // Conditional: offered in the keyboard's suggestions when the email field is tapped, rather than asked.
      ...(conditional ? { mediation: 'conditional' as CredentialMediationRequirement } : {}),
      signal,
      publicKey: {
        rpId: location.hostname,
        challenge: challenge ? fromBase64Url(challenge) : crypto.getRandomValues(new Uint8Array(32)),
        userVerification: 'required',
        allowCredentials: allow?.map((id) => ({ type: 'public-key' as const, id: fromBase64Url(id) })),
        extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
      },
    }),
  )) as PublicKeyCredential | null;
  if (!credential) throw new PasskeyCancelled();
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    credentialId: toBase64Url(new Uint8Array(credential.rawId)),
    clientDataJSON: toBase64Url(new Uint8Array(response.clientDataJSON)),
    authenticatorData: toBase64Url(new Uint8Array(response.authenticatorData)),
    signature: toBase64Url(new Uint8Array(response.signature)),
    secret: prfSecret(credential),
  };
}
