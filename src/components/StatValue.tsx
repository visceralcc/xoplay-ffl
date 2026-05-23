import { StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import { Label } from './Label';

// Labeled stat — the standard pattern for showing a key metric like
// "Cap Room: $23.50" or "PF: 1,432.8". Composes Label for the label
// portion and renders the value as a Barlow Condensed data token with
// tabular-nums so stacked values align. Spec:
// specs/foundation/components/Component_StatValue.md.

type StatValueSize = 'sm' | 'md' | 'lg';
type StatValueLayout = 'vertical' | 'horizontal';

type StatValueProps = {
  label: string;
  value: string;
  size?: StatValueSize;
  valueColor?: string;
  layout?: StatValueLayout;
};

export function StatValue({
  label,
  value,
  size = 'md',
  valueColor = gray[950],
  layout = 'vertical',
}: StatValueProps) {
  const labelSize: 'md' | 'sm' = size === 'sm' ? 'sm' : 'md';
  const valueStyle = VALUE_STYLES[size];
  const containerStyle =
    layout === 'horizontal' ? styles.horizontal : styles.vertical;

  return (
    <View style={containerStyle}>
      <Label size={labelSize}>{label}</Label>
      <Text style={[valueStyle, layout === 'horizontal' && styles.valueRight, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// Size-to-typography mapping. All three tokens are Barlow Condensed with
// fontVariant: ['tabular-nums'] baked in by the theme, so stacked stats
// align without per-call overrides.
const VALUE_STYLES = {
  sm: typo.data,
  md: typo.dataMd,
  lg: typo.statLg,
} as const;

const styles = StyleSheet.create({
  vertical: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  // In horizontal layout the value flexes to fill remaining width and
  // right-aligns — gives the "CAP ROOM    $23.50" balanced look when the
  // StatValue sits inside a wider flex parent.
  valueRight: {
    flex: 1,
    textAlign: 'right',
  },
});
