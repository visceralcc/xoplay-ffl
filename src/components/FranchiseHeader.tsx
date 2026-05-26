import { StyleSheet, Text, View } from 'react-native';
import {
  fontFamily,
  gray,
  onColor,
  safeBlock,
  spacing,
  type as typo,
} from '@/theme';
import { FranchiseMark } from './FranchiseMark';
import { StatValue } from './StatValue';

// Full-bleed franchise-colored masthead — the identity anchor at the top of
// the Franchise Home screen. Spec:
// specs/foundation/components/Component_FranchiseHeader.md (§4.3, §8.5).
//
// All text is rendered in onColor(primaryColor) so contrast is safe across the
// full range of franchise colors. Near-white franchises pick up a 1px gray-300
// border so the block remains visible against the page surface.

type FranchiseInput = {
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
};

type FranchiseHeaderProps = {
  franchise: FranchiseInput;
  ownerName: string;
  record: string;
  divisionRecord?: string;
  tierLabel?: string;
  pointsFor?: string;
  pointsAgainst?: string;
  streak?: string;
};

export function FranchiseHeader({
  franchise,
  ownerName,
  record,
  divisionRecord,
  tierLabel = 'DYNASTY',
  pointsFor,
  pointsAgainst,
  streak,
}: FranchiseHeaderProps) {
  const text = onColor(franchise.primaryColor);
  const safety = safeBlock(franchise.primaryColor);
  const borderStyle = safety.veryLight ? styles.veryLightBorder : null;

  const recordText = divisionRecord
    ? `${record} (${divisionRecord})`
    : record;

  const hasStats =
    pointsFor != null || pointsAgainst != null || streak != null;

  return (
    <View
      style={[
        styles.block,
        { backgroundColor: franchise.primaryColor },
        borderStyle,
      ]}
    >
      <View style={styles.row}>
        <FranchiseMark franchise={franchise} size={64} />
        <View style={styles.textBlock}>
          <Text style={[styles.name, { color: text }]} numberOfLines={1}>
            {franchise.name}
          </Text>
          <Text style={[styles.meta, { color: text }]} numberOfLines={1}>
            {ownerName} · {recordText}
          </Text>
          <Text style={[styles.tier, { color: text }]} numberOfLines={1}>
            {tierLabel}
          </Text>
        </View>
      </View>

      {hasStats ? (
        <View style={styles.stats}>
          {pointsFor != null ? (
            <StatValue label="PF" value={pointsFor} size="sm" valueColor={text} />
          ) : null}
          {pointsFor != null && (pointsAgainst != null || streak != null) ? (
            <Text style={[styles.statSep, { color: text }]}>·</Text>
          ) : null}
          {pointsAgainst != null ? (
            <StatValue label="PA" value={pointsAgainst} size="sm" valueColor={text} />
          ) : null}
          {pointsAgainst != null && streak != null ? (
            <Text style={[styles.statSep, { color: text }]}>·</Text>
          ) : null}
          {streak != null ? (
            <StatValue label="STREAK" value={streak} size="sm" valueColor={text} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  veryLightBorder: {
    borderWidth: 1,
    borderColor: gray[300],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  textBlock: {
    flex: 1,
    flexDirection: 'column',
    gap: spacing.xs,
  },
  // Franchise name: Barlow Condensed 700, 32px, uppercase. Sits between the
  // committed headlineMd (38px) and headlineSm (24px) tokens, so it's defined
  // here against fontFamily + fixed size instead of pulled from the type scale.
  name: {
    fontFamily: fontFamily.barlowCondensed.bold,
    fontSize: 32,
    lineHeight: 32,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  meta: {
    fontFamily: fontFamily.barlow.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  // Tier label uses the mono token but at 0.7 opacity of the onColor text so
  // it reads as supporting metadata on any franchise color (gray-500 would
  // clash with the colored background).
  tier: {
    ...typo.mono,
    opacity: 0.7,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statSep: {
    opacity: 0.5,
    fontFamily: fontFamily.barlow.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
