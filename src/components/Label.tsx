import { StyleSheet, Text } from 'react-native';
import { gray, type as typo } from '@/theme';

// Uppercase meta label — section headers, column headers, tab labels, category
// identifiers. Spec: specs/foundation/components/Component_Label.md.
//
// Always Barlow Condensed, always uppercase (textTransform applied by the
// type token). Single line, clips on overflow — sizing is the parent's job.

type LabelSize = 'md' | 'sm';

type LabelProps = {
  children: string;
  size?: LabelSize;
  color?: string;
};

export function Label({ children, size = 'md', color = gray[500] }: LabelProps) {
  if (!children) return null;
  return (
    <Text
      numberOfLines={1}
      style={[size === 'sm' ? styles.sm : styles.md, { color }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  md: typo.label,
  sm: typo.labelSm,
});
