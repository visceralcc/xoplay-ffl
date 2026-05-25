import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { gray, radius, spacing } from '@/theme';

// Elevated container for grouped content — home tiles, dashboard blocks,
// any visual grouping that needs to read as a separated surface. Spec:
// specs/foundation/components/Component_Card.md.

type CardProps = {
  children: ReactNode;
  padding?: number;
  backgroundColor?: string;
};

export function Card({
  children,
  padding = spacing.lg,
  backgroundColor = gray[0],
}: CardProps) {
  return (
    <View style={[styles.card, { padding, backgroundColor }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: gray[100],
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: gray[950],
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    // Android shadow.
    elevation: 1,
  },
});
