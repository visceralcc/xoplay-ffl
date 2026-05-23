import { StyleSheet, Text } from 'react-native';
import { gray, type as typo } from '@/theme';

// Inline monospace meta — IDs, timestamps, franchise codes, terminal-style
// annotations. Spec: specs/foundation/components/Component_Mono.md.
//
// Always JetBrains Mono 400, always 11px, always uppercase (textTransform
// applied by the type token). Renders inline so it can sit next to other
// text within a row.

type MonoProps = {
  children: string;
  color?: string;
};

export function Mono({ children, color = gray[500] }: MonoProps) {
  if (!children) return null;
  return <Text style={[styles.mono, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  mono: typo.mono,
});
