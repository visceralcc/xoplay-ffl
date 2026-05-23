import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { radius, status } from '@/theme';

// Small pulsing red dot — "this data is live / updating now." Used on
// matchup cards, scoring feeds, the Gameday nav indicator. Spec:
// specs/foundation/components/Component_LiveDot.md.
//
// Inner dot opacity loops 1.0 → 0.6 → 1.0 over 2s. The outer ring is the
// same status-live red at 40% opacity (no separate token — the ring is the
// dot's halo, not a different color). When `prefers-reduced-motion` is on
// the dot is static at full opacity; the ring still renders.

const RING_OFFSET = 4;
const PULSE_DURATION = 1000; // ms each half of the cycle (1.0→0.6 then 0.6→1.0)

type LiveDotProps = {
  size?: number;
};

export function LiveDot({ size = 8 }: LiveDotProps) {
  const total = size + RING_OFFSET * 2;
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: PULSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_DURATION,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, opacity]);

  return (
    <View style={[styles.frame, { width: total, height: total }]}>
      <View
        style={[
          styles.ring,
          { width: total, height: total, borderColor: status.live },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            backgroundColor: status.live,
            opacity,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Frame is `size + 8` square; both children are absolutely positioned
  // (centered) so the ring doesn't push surrounding layout.
  frame: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: radius.full,
    borderWidth: 1,
    opacity: 0.4,
  },
  dot: {
    borderRadius: radius.full,
  },
});
