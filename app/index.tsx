import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>HELLO XO PLAY</Text>
      <Text style={styles.body}>Body copy in Barlow regular.</Text>
      <Text style={styles.mono}>JETBRAINS · MONO · 11PX</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#fbfbfb',
  },
  heading: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 48,
    letterSpacing: -1,
    color: '#141414',
  },
  body: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 14,
    color: '#3d3d3d',
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    letterSpacing: 0.4,
    color: '#767676',
  },
});
