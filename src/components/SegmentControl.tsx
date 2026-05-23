import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontFamily, gray, radius, type as typo } from '@/theme';

// Toggle control for switching between views or modes — roster bucket tabs
// (Active / IR / Taxi), density modes (Standard / Compact), etc. Spec:
// specs/foundation/components/Component_SegmentControl.md.
//
// Controlled component: caller owns activeIndex and reacts to onChangeIndex.
// Active segment fills gray-950 with white type-label text in Barlow
// Condensed 600; inactive segments are transparent with gray-500 text in
// Barlow Condensed 500. The container has a 1px gray-200 border with
// radius-sm corners; overflow:hidden lets the active fill respect them.

type SegmentControlProps = {
  segments: string[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
};

export function SegmentControl({
  segments,
  activeIndex,
  onChangeIndex,
}: SegmentControlProps) {
  return (
    <View style={styles.container}>
      {segments.map((label, i) => {
        const active = i === activeIndex;
        return (
          <Pressable
            key={i}
            onPress={() => {
              if (!active) onChangeIndex(i);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[
                styles.text,
                active ? styles.textActive : styles.textInactive,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: gray[200],
    borderRadius: radius.sm,
    // Clip the active fill to the container's rounded corners.
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: gray[950],
  },
  // Start from the type.label token (Barlow Condensed 600, 13/13, ls 1.2,
  // uppercase) and override fontFamily for the inactive medium weight.
  text: {
    ...typo.label,
  },
  textActive: {
    color: gray[0],
  },
  textInactive: {
    color: gray[500],
    fontFamily: fontFamily.barlowCondensed.medium,
  },
});
