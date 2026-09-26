import { describe, expect, it } from 'vitest';

import { googleProfilePhotoUrl } from './profile';

describe('Google profile photo', () => {
  it('uses the Supabase Google avatar URL', () => {
    expect(
      googleProfilePhotoUrl({ avatar_url: 'https://example.com/avatar.jpg' }),
    ).toBe('https://example.com/avatar.jpg');
  });

  it('falls back to the Google picture field', () => {
    expect(
      googleProfilePhotoUrl({ picture: 'https://example.com/picture.jpg' }),
    ).toBe('https://example.com/picture.jpg');
  });

  it('rejects missing and non-HTTPS image locations', () => {
    expect(googleProfilePhotoUrl(undefined)).toBeNull();
    expect(googleProfilePhotoUrl({ avatar_url: 'file:///private/photo.jpg' })).toBeNull();
  });
});
