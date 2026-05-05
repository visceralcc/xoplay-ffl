import { StyleSheet, Text, View } from 'react-native';
import { gray, spacing, type } from '@/theme';

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
    gap: spacing.lg,
    backgroundColor: gray[25],
  },
  heading: {
    ...type.displaySm,
    color: gray[900],
  },
  body: {
    ...type.body,
    color: gray[700],
  },
  mono: {
    ...type.mono,
    color: gray[500],
  },
});
