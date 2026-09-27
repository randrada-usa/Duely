import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { DuelyWordmark } from './DuelyWordmark';

const minimumVisibleMs = 1250;

export function LaunchScreen({
  ready,
  onFinished,
}: {
  ready: boolean;
  onFinished: () => void;
}) {
  const { height, width } = useWindowDimensions();
  const mountedAt = useRef(Date.now());
  const progress = useRef(new Animated.Value(0.06)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const mascotSize = useMemo(
    () => Math.min(width * 0.72, height * 0.37, 330),
    [height, width],
  );
  const wordmarkWidth = Math.min(width * 0.5, 230);

  useEffect(() => {
    const loadingAnimation = Animated.timing(progress, {
      duration: 1600,
      toValue: 0.86,
      useNativeDriver: true,
    });
    loadingAnimation.start();
    return () => loadingAnimation.stop();
  }, [progress]);

  useEffect(() => {
    if (!ready) return;
    const remaining = Math.max(0, minimumVisibleMs - (Date.now() - mountedAt.current));
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(progress, {
          duration: 260,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          delay: 90,
          duration: 220,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onFinished();
      });
    }, remaining);
    return () => clearTimeout(timer);
  }, [onFinished, opacity, progress, ready]);

  return (
    <Animated.View
      accessibilityLabel="Duely is loading"
      accessibilityLiveRegion="polite"
      style={[styles.screen, { opacity }]}
    >
      <View style={styles.content}>
        <DuelyWordmark width={wordmarkWidth} />
        <Text style={styles.tagline}>Scan. Organize. Succeed.</Text>

        <Image
          accessibilityLabel="Due carrying books and school planners"
          resizeMode="contain"
          source={require('../../DuelyMascots/DuelyLoad.png')}
          style={{ height: mascotSize, width: mascotSize }}
        />

        <View
          accessibilityLabel="Loading Duely"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100 }}
          style={styles.progressTrack}
        >
          <Animated.View
            style={[
              styles.progressFill,
              { transform: [{ scaleX: progress }] },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Getting your tasks ready…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F8FF',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 32,
    transform: [{ translateY: -8 }],
  },
  tagline: {
    marginTop: -2,
    marginBottom: 24,
    color: '#53608A',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  progressTrack: {
    width: '42%',
    minWidth: 150,
    maxWidth: 210,
    height: 5,
    marginTop: 24,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#CFD5F4',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4B5FD3',
    transformOrigin: 'left',
  },
  loadingText: {
    marginTop: 12,
    color: '#747C9A',
    fontSize: 13,
    fontWeight: '500',
  },
});
