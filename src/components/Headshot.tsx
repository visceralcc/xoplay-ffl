import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { gray, radius } from '@/theme';

// Player photo placeholder — silhouette (head circle + shoulder arc) on a
// solid square. v1 has no real headshots; this component's external API is
// the slot real photos will eventually slide into. Spec:
// specs/foundation/components/Component_Headshot.md.
//
// Geometry per spec §"Silhouette SVG": viewBox 44×44, head circle at
// (22, 16) r=8, shoulders quadratic from (6, 44) through (22, 28) to
// (38, 44). Both shapes rendered at fillOpacity 0.7.

const VIEWBOX = 44;

type HeadshotProps = {
  size?: number;
  backgroundColor?: string;
  foregroundColor?: string;
};

export function Headshot({
  size = 44,
  backgroundColor = gray[200],
  foregroundColor = gray[500],
}: HeadshotProps) {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, backgroundColor },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        <Circle cx={22} cy={16} r={8} fill={foregroundColor} fillOpacity={0.7} />
        <Path
          d="M 6 44 Q 22 28 38 44 Z"
          fill={foregroundColor}
          fillOpacity={0.7}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
});
