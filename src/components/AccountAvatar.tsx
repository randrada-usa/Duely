import type { ImageStyle, StyleProp } from 'react-native';
import { Image } from 'react-native';
import { useState } from 'react';

import { googleProfilePhotoUrl } from '../domain/profile';

type Props = {
  displayName?: string | null;
  metadata?: Record<string, unknown>;
  signedIn: boolean;
  style: StyleProp<ImageStyle>;
};

export function AccountAvatar({ displayName, metadata, signedIn, style }: Props) {
  const photoUrl = signedIn ? googleProfilePhotoUrl(metadata) : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showGooglePhoto = !!photoUrl && failedUrl !== photoUrl;

  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel={
        showGooglePhoto
          ? `${displayName?.trim() || 'Google account'} profile photo`
          : 'Due, the Duely mascot'
      }
      onError={showGooglePhoto ? () => setFailedUrl(photoUrl) : undefined}
      resizeMode={showGooglePhoto ? 'cover' : 'contain'}
      source={
        showGooglePhoto
          ? { uri: photoUrl }
          : require('../../assets/mascot.png')
      }
      style={style}
    />
  );
}
