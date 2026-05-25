import { StyleSheet, Text, View } from 'react-native';
import { fontFamily, gray, spacing } from '@/theme';

// Top-level navigation bar — persists across every authenticated screen.
// Stub for Batch 3: renders chrome but no navigation behavior. Spec:
// specs/foundation/components/Component_PageShell.md (GlobalNav sub-component).

type GlobalNavProps = {
  leagueName?: string;
};

export function GlobalNav({ leagueName = 'My League' }: GlobalNavProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Text style={styles.wordmark}>XO</Text>
        <View style={styles.divider} />
        <Text style={styles.leagueName} numberOfLines={1}>
          {leagueName}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={styles.avatar} />
      </View>
    </View>
  );
}

const NAV_HEIGHT = 48;
const DIVIDER_HEIGHT = 24;
const AVATAR_SIZE = 24;

const styles = StyleSheet.create({
  bar: {
    height: NAV_HEIGHT,
    backgroundColor: gray[950],
    borderBottomWidth: 1,
    borderBottomColor: gray[800],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    gap: spacing.md,
    flexShrink: 1,
  },
  // 18px Barlow Condensed 700 — not in the type scale so we compose from
  // fontFamily directly. Spec calls for the bold variant.
  wordmark: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 18,
    lineHeight: 18,
    color: gray[0],
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: DIVIDER_HEIGHT,
    backgroundColor: gray[700],
  },
  // 14px Barlow regular — matches typo.body exactly, but inlined here so
  // GlobalNav reads in isolation without a "why this token" footnote.
  leagueName: {
    fontFamily: fontFamily.barlow.regular,
    fontSize: 14,
    lineHeight: 18,
    color: gray[400],
    flexShrink: 1,
  },
  right: {
    paddingRight: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: gray[700],
  },
});
