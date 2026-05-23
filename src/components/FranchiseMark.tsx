import { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { gray, radius, safeBlock } from '@/theme';

// Franchise identity mark. v1 renders a generated geometric SVG using the
// franchise's primary + secondary colors; once franchises upload real logos
// the same component will switch to <Image>. Spec:
// specs/foundation/components/Component_FranchiseMark.md.
//
// All marks are designed in a 64×64 coordinate space so the SVG viewBox is
// fixed; the rendered size scales the SVG natively. Per-franchise marks for
// the five sample franchises map to their abbreviation (case-insensitive);
// anything else falls back to a centered diamond.

const VIEWBOX = 64;

type FranchiseInput = {
  id?: string;
  abbreviation?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
};

type FranchiseMarkProps = {
  franchise: FranchiseInput;
  size?: number;
};

export function FranchiseMark({ franchise, size = 64 }: FranchiseMarkProps) {
  const { primaryColor, secondaryColor } = franchise;

  // Per spec §"Rules": near-white franchise tiles need a 1px gray-200 border
  // so they don't vanish on white surfaces. Near-dark franchises don't —
  // their own value creates an edge against light backgrounds.
  const safety = safeBlock(primaryColor);
  const borderStyle = safety.veryLight
    ? { borderWidth: 1, borderColor: gray[200] }
    : null;

  const key = (franchise.abbreviation ?? franchise.id ?? '')
    .toUpperCase()
    .replace(/^FR-/, '');

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, backgroundColor: primaryColor },
        borderStyle,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        {renderMark(key, secondaryColor)}
      </Svg>
    </View>
  );
}

// ─── per-franchise mark drawings (64×64 coordinate space) ────────────────────

function renderMark(key: string, color: string): ReactElement {
  switch (key) {
    case 'OAK':
      // Pine tree — triangle canopy on a short trunk.
      return (
        <>
          <Path d="M 32 10 L 50 42 L 14 42 Z" fill={color} />
          <Rect x={28} y={42} width={8} height={10} fill={color} />
        </>
      );

    case 'MIA':
      // Two overlapping rings — Venn-style, stroked so the overlap reads.
      return (
        <>
          <Circle
            cx={24}
            cy={32}
            r={14}
            fill="none"
            stroke={color}
            strokeWidth={3}
          />
          <Circle
            cx={40}
            cy={32}
            r={14}
            fill="none"
            stroke={color}
            strokeWidth={3}
          />
        </>
      );

    case 'BRO':
      // Nested squares — outer outline, solid inner block.
      return (
        <>
          <Rect
            x={12}
            y={12}
            width={40}
            height={40}
            fill="none"
            stroke={color}
            strokeWidth={3}
          />
          <Rect x={24} y={24} width={16} height={16} fill={color} />
        </>
      );

    case 'SAN':
      // Sun rising above two rolling hills.
      return (
        <>
          <Circle cx={44} cy={20} r={8} fill={color} />
          <Path
            d="M 0 48 C 10 36 22 36 32 48 C 42 36 54 36 64 48 L 64 64 L 0 64 Z"
            fill={color}
          />
        </>
      );

    case 'PRT':
      // Zigzag mountain range — silhouette filled to bottom edge.
      return (
        <Path
          d="M 4 48 L 16 24 L 28 40 L 40 20 L 52 36 L 60 28 L 60 56 L 4 56 Z"
          fill={color}
        />
      );

    default:
      // Centered diamond fallback for any franchise without a bespoke mark.
      return <Path d="M 32 12 L 52 32 L 32 52 L 12 32 Z" fill={color} />;
  }
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
});
