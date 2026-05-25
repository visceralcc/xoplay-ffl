import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fontFamily, gray, spacing } from '@/theme';

// Section-level navigation rendered below GlobalNav. Stub for Batch 3:
// tabs render but don't route. Spec: specs/foundation/components/
// Component_PageShell.md (LeagueNav sub-component).

export const LEAGUE_NAV_TABS = [
  'My Team',
  'League',
  'Transactions',
  'Draft',
  'Social',
  'Commissioner',
] as const;

export type LeagueNavTab = (typeof LEAGUE_NAV_TABS)[number];

type LeagueNavProps = {
  activeSection?: string;
  /**
   * If provided, the active tab's underline uses franchise.primaryColor.
   * Otherwise the active underline falls back to gray-400.
   */
  accentColor?: string;
};

export function LeagueNav({ activeSection, accentColor }: LeagueNavProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.content}
    >
      {LEAGUE_NAV_TABS.map((label) => {
        const active = label === activeSection;
        return (
          <View key={label} style={styles.tab}>
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {label}
            </Text>
            <View
              style={[
                styles.underline,
                {
                  backgroundColor: active
                    ? (accentColor ?? gray[400])
                    : 'transparent',
                },
              ]}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const NAV_HEIGHT = 40;
const UNDERLINE_HEIGHT = 2;

const styles = StyleSheet.create({
  bar: {
    height: NAV_HEIGHT,
    backgroundColor: gray[900],
    flexGrow: 0,
  },
  content: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    gap: spacing.xl,
    alignItems: 'stretch',
  },
  // Each tab fills the bar height. Label sits centered in the flex space
  // above the underline, which is pinned to the bottom edge of the bar.
  tab: {
    height: NAV_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 12px Barlow Condensed 500 uppercase, letter-spacing 1 — close to
  // typo.labelSm but with medium weight and slightly looser tracking. Spec
  // is explicit on the values so we compose from fontFamily directly.
  label: {
    fontFamily: fontFamily.barlowCondensed.medium,
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: gray[0],
  },
  labelInactive: {
    color: gray[500],
  },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: UNDERLINE_HEIGHT,
  },
});
