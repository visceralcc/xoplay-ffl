import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { gray, radius, status, spacing, type as typo } from '@/theme';

// Salary cap usage bar — the financial health indicator for Dynasty and
// Keeper leagues. Communicates three states at a glance: under cap (healthy),
// near cap (warning), and over cap (error). Hidden entirely in Redraft via
// tier gating upstream. Spec:
// specs/foundation/components/Component_CapMeter.md.

type CapMeterSize = 'sm' | 'md';
type CapState = 'healthy' | 'warning' | 'over';

type CapMeterProps = {
  capUsed: number;
  capTotal: number;
  showLabels?: boolean;
  showRoom?: boolean;
  size?: CapMeterSize;
};

// State boundaries are exclusive on the low end: healthy is *strictly* below
// 85%; exactly 85% reads as Warning. Over cap is strictly above 100%.
function capState(usagePct: number): CapState {
  if (usagePct > 100) return 'over';
  if (usagePct >= 85) return 'warning';
  return 'healthy';
}

const FILL_COLOR: Record<CapState, string> = {
  healthy: status.success,
  warning: status.warning,
  over: status.error,
};

// Room text color follows the same state as the fill (Spec §4.6 table).
const ROOM_COLOR: Record<CapState, string> = {
  healthy: gray[700],
  warning: status.warning,
  over: status.error,
};

const money = (n: number) => `$${n.toFixed(2)}`;

export function CapMeter({
  capUsed,
  capTotal,
  showLabels = true,
  showRoom = true,
  size = 'md',
}: CapMeterProps) {
  const usagePct = capTotal > 0 ? (capUsed / capTotal) * 100 : 0;
  const state = capState(usagePct);
  // Fill is capped at 100% visually so an over-cap franchise reads as a full
  // (error-colored) bar rather than overflowing the track.
  const fillWidth: DimensionValue = `${Math.min(usagePct, 100)}%`;
  const fillColor = FILL_COLOR[state];

  const isSmall = size === 'sm';
  const overCap = state === 'over';
  const roomAmount = overCap ? capUsed - capTotal : capTotal - capUsed;

  const bar = (
    <View style={[styles.track, isSmall ? styles.trackSm : styles.trackMd]}>
      <View style={[styles.fill, { width: fillWidth, backgroundColor: fillColor }]} />
    </View>
  );

  // Small size is a minimal bar-only variant — no labels or room text
  // regardless of the prop values (e.g. inline in a standings cell).
  if (isSmall) {
    return bar;
  }

  return (
    <View style={styles.container}>
      {showLabels ? (
        <Text style={styles.labels}>
          {money(capUsed)} / {money(capTotal)}
        </Text>
      ) : null}
      {bar}
      {showRoom ? (
        <Text style={[styles.room, { color: ROOM_COLOR[state] }]}>
          {overCap ? 'Over Cap: ' : 'Cap Room: '}
          {money(roomAmount)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  // data token (Barlow Condensed Medium) carries tabular-nums so the dollar
  // figures align digit-for-digit.
  labels: {
    ...typo.data,
    color: gray[700],
  },
  track: {
    width: '100%',
    borderRadius: radius.sm,
    backgroundColor: gray[100],
    overflow: 'hidden',
  },
  trackMd: {
    height: 12,
  },
  trackSm: {
    height: 6,
  },
  fill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  // bodyXs is Barlow regular (no tabular-nums in the token), so apply it here
  // for the dollar amount. The label words carry no digits, so tagging the
  // whole line is harmless and keeps the figure aligned.
  room: {
    ...typo.bodyXs,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
