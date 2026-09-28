import { useState } from 'react';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Image, View } from 'react-native';

import DuelyProfile from '../../DuelyMascots/DuelyProfile.svg';
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

  if (!showGooglePhoto) {
    return (
      <View
        accessibilityLabel="Due, the Duely mascot"
        accessibilityRole="image"
        style={style as StyleProp<ViewStyle>}
      >
        <DuelyProfile height="100%" width="100%" />
      </View>
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel={`${displayName?.trim() || 'Google account'} profile photo`}
      onError={() => setFailedUrl(photoUrl)}
      resizeMode="cover"
      source={{ uri: photoUrl }}
      style={style}
    />
  );
}
