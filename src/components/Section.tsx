import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type as typo } from '@/theme';

// Titled content block with an optional collapse toggle. Used to group
// related content within a page (roster sections, stat breakdowns, settings
// groups). Section is a structural grouping — no background, no border,
// no shadow. Use Card if you need elevation. Spec:
// specs/foundation/components/Component_Section.md.

type SectionProps = {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  action?: ReactNode;
};

export function Section({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  action,
}: SectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const headerContent = (
    <View style={styles.headerRow}>
      <View style={styles.titleGroup}>
        {collapsible ? (
          // ▸ collapsed / ▾ expanded — instant toggle, no animation.
          <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );

  return (
    <View>
      {collapsible ? (
        <Pressable onPress={() => setCollapsed((c) => !c)}>
          {headerContent}
        </Pressable>
      ) : (
        headerContent
      )}
      <View style={styles.divider} />
      {collapsed ? null : <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  // Same treatment as Label md — Barlow Condensed 600, 13/13, ls 1.2,
  // uppercase. Color is gray-500 per spec.
  title: {
    ...typo.label,
    color: gray[500],
  },
  chevron: {
    ...typo.label,
    color: gray[400],
    // Chevron glyphs are wider than label tracking expects; drop the
    // letter-spacing so they sit flush against the title.
    letterSpacing: 0,
  },
  action: {
    marginLeft: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: gray[100],
  },
  content: {
    marginTop: spacing.md,
  },
});
