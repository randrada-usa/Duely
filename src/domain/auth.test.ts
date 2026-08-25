import { describe, expect, it } from 'vitest';

import { emailAddressError, normalizeEmail, parseAuthRedirect } from './auth';

describe('email authentication helpers', () => {
  it('normalizes and validates email addresses', () => {
    expect(normalizeEmail(' Student@School.EDU.PH ')).toBe('student@school.edu.ph');
    expect(emailAddressError('student@school.edu.ph')).toBeNull();
    expect(emailAddressError('')).toContain('Enter');
    expect(emailAddressError('not-an-email')).toContain('valid');
  });

  it('accepts only Duely auth callbacks with a complete token pair', () => {
    expect(
      parseAuthRedirect(
        'duely://auth/callback#access_token=access-example&refresh_token=refresh-example',
      ),
    ).toEqual({
      status: 'session',
      accessToken: 'access-example',
      refreshToken: 'refresh-example',
    });
    expect(parseAuthRedirect('duely://tasks#access_token=a&refresh_token=r')).toEqual({
      status: 'ignored',
    });
  });

  it('returns safe recovery messages without reflecting provider details', () => {
    const result = parseAuthRedirect(
      'duely://auth/callback#error=access_denied&error_description=sensitive-provider-detail',
    );
    expect(result.status).toBe('error');
    expect(JSON.stringify(result)).not.toContain('sensitive-provider-detail');

    expect(parseAuthRedirect('duely://auth/callback#access_token=only-one')).toEqual({
      status: 'error',
      message: 'This sign-in link is incomplete or expired. Request a new link.',
    });
  });
});
