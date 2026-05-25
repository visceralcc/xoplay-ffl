import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { gray, spacing } from '@/theme';
import { GlobalNav } from './GlobalNav';
import { LeagueNav } from './LeagueNav';

// Top-level page wrapper for every authenticated screen. Composes
// GlobalNav + LeagueNav over a scrollable, padded content area. Spec:
// specs/foundation/components/Component_PageShell.md.

type Franchise = {
  primaryColor: string;
  secondaryColor: string;
  name: string;
};

type PageShellProps = {
  children: ReactNode;
  leagueName?: string;
  franchise?: Franchise;
  activeSection?: string;
};

const CONTENT_MAX_WIDTH = 960;

export function PageShell({
  children,
  leagueName,
  franchise,
  activeSection,
}: PageShellProps) {
  return (
    <View style={styles.shell}>
      <GlobalNav leagueName={leagueName} />
      <LeagueNav
        activeSection={activeSection}
        accentColor={franchise?.primaryColor}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Inner wrapper enforces the 960px desktop max-width. On phone
            widths the View just fills the parent. */}
        <View style={styles.contentInner}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: gray[50],
  },
  scroll: {
    flex: 1,
    backgroundColor: gray[50],
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  contentInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
});
