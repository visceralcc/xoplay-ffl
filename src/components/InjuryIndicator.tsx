import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, gray, injury, type InjuryStatus } from '@/theme';

// 16×16 colored square with single-letter injury code. Spec:
// specs/foundation/components/Component_InjuryIndicator.md.
//
// Renders nothing when status is null / undefined / unknown — the
// "healthy" state is the absence of the indicator. Tooltip and full-word
// rendering live in consuming components, not here.

type InjuryIndicatorProps = {
  status?: InjuryStatus | null;
};

export function InjuryIndicator({ status }: InjuryIndicatorProps) {
  if (!status || !(status in injury)) return null;
  return (
    <View style={[styles.box, { backgroundColor: injury[status] }]}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // 2px corner is intentionally tighter than radius.sm (3px) — the spec
  // calls this out for the micro element size.
  box: {
    width: 16,
    height: 16,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 9,
    lineHeight: 9,
    letterSpacing: 0.3,
    color: gray[0],
  },
});
