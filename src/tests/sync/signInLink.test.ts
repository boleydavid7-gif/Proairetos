import { parseSignInLink } from '../../data/sync/supabase';

describe('sign-in links from the email', () => {
  it('reads the standard Supabase link', () => {
    const link = 'https://abcd.supabase.co/auth/v1/verify?token=pkce_0123abcdef&type=magiclink&redirect_to=https://proairetos.com';
    expect(parseSignInLink(link)).toEqual({ kind: 'token-hash', tokenHash: 'pkce_0123abcdef', type: 'magiclink' });
  });

  it('reads first-time sign-up links and token_hash links', () => {
    expect(parseSignInLink('https://abcd.supabase.co/auth/v1/verify?token=abc&type=signup')).toMatchObject({ type: 'signup' });
    expect(parseSignInLink('https://site.example/confirm?token_hash=xyz&type=email')).toEqual({
      kind: 'token-hash', tokenHash: 'xyz', type: 'email',
    });
  });

  it('reads a link that already landed on the app with a session', () => {
    expect(parseSignInLink('https://proairetos.com/#access_token=AT&refresh_token=RT&type=magiclink')).toEqual({
      kind: 'session', accessToken: 'AT', refreshToken: 'RT',
    });
  });

  it('ignores text that is not a sign-in link', () => {
    expect(parseSignInLink('123456')).toBeNull();
    expect(parseSignInLink('https://example.com/nothing-here')).toBeNull();
    expect(parseSignInLink('  https://abcd.supabase.co/auth/v1/verify?token=t  ')).toMatchObject({ tokenHash: 't', type: 'magiclink' });
  });
});
