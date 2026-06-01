import { StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';
import type { TransactionType } from '@/data';
import { Mono } from './Mono';

// Single transaction in a feed — the building block of Recent Transactions on
// Franchise Home and League Home. Compact, scannable, read-only: icon, optional
// franchise color dot, description, and relative timestamp. Spec:
// specs/foundation/components/Component_TransactionRow.md.

type TransactionRowProps = {
  type: TransactionType;
  description: string;
  timestamp: string;
  franchise?: { abbreviation: string; primaryColor: string };
};

// Unicode placeholders until an icon library is chosen (Spec §4.7). Types not
// in this map fall back to a neutral circle in gray-400.
const ICON: Partial<Record<TransactionType, string>> = {
  ADD_DROP: '↕',
  WAIVER_CLAIM: '◆',
  TRADE_COMPLETED: '⇄',
  TRADE_REVERSAL: '↺',
  IR_MOVE: '+',
  TAXI_MOVE: '↕',
  AUCTION_AWARD: '◆',
  DRAFT_PICK_MADE: '★',
  SALARY_ADJUSTMENT: '$',
  COMMISSIONER_ACTION: '◇',
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Relative time per Spec §4.7: < 1h → "Xm ago", < 24h → "Xh ago",
// < 7d → "Xd ago", else short date "Nov 10". Mono uppercases the result.
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function TransactionRow({
  type,
  description,
  timestamp,
  franchise,
}: TransactionRowProps) {
  const glyph = ICON[type] ?? '●';
  // Mapped icons sit at gray-500; the fallback circle is the softer gray-400.
  const iconColor = ICON[type] ? gray[500] : gray[400];

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Text style={[styles.iconGlyph, { color: iconColor }]}>{glyph}</Text>
      </View>
      {franchise ? (
        <View
          style={[styles.dot, { backgroundColor: franchise.primaryColor }]}
        />
      ) : null}
      <Text style={styles.description} numberOfLines={1}>
        {description}
      </Text>
      <View style={styles.timestamp}>
        <Mono color={gray[400]}>{formatRelativeTime(timestamp)}</Mono>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: gray[100],
  },
  // 16×16 icon area, left-aligned (Spec §4.7).
  icon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  // System font (no Barlow family) so the placeholder glyphs render with full
  // symbol coverage; sized to fill the 16px icon area.
  iconGlyph: {
    fontSize: 14,
    lineHeight: 16,
  },
  // 8px franchise color dot, between icon and description.
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  description: {
    ...typo.bodySm,
    color: gray[700],
    flex: 1,
  },
  timestamp: {
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
});
