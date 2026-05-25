import type { ReactNode } from 'react';
import { StyleSheet, View, type FlexAlignType } from 'react-native';
import { spacing } from '@/theme';

// Flex container with consistent inter-child spacing. Replaces ad-hoc
// marginBottom / marginRight patterns — the most basic layout primitive.
// Spec: specs/foundation/components/Component_Stack.md.

type StackDirection = 'vertical' | 'horizontal';
type StackAlign = 'start' | 'center' | 'end' | 'stretch';
type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around';

type StackProps = {
  children: ReactNode;
  direction?: StackDirection;
  gap?: number;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
};

const ALIGN_MAP: Record<StackAlign, FlexAlignType> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY_MAP: Record<
  StackJustify,
  'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

export function Stack({
  children,
  direction = 'vertical',
  gap = spacing.md,
  align = 'stretch',
  justify = 'start',
  wrap = false,
}: StackProps) {
  return (
    <View
      style={[
        styles.base,
        {
          flexDirection: direction === 'vertical' ? 'column' : 'row',
          alignItems: ALIGN_MAP[align],
          justifyContent: JUSTIFY_MAP[justify],
          flexWrap: wrap && direction === 'horizontal' ? 'wrap' : 'nowrap',
          gap,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // No visual treatment of its own — Stack is invisible infrastructure.
  base: {},
});
