import type { ViewStyle } from 'react-native';

import { colors } from './tokens';

// Scan temporarily hides the bar, then restores this same safe-area-aware style.
export function bottomTabBarStyle(bottomInset: number): ViewStyle {
  return {
    height: 76 + bottomInset,
    paddingBottom: Math.max(bottomInset, 8),
    paddingTop: 8,
    borderTopWidth: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    elevation: 8,
  };
}
