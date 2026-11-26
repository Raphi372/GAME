import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLayout } from '@/hooks/useLayout';
import { colors, spacing } from '@/theme';

import { AmbientBackground } from './AmbientBackground';

interface ScreenProps {
  children: ReactNode;
  /** Content rendered above the scroll area (e.g. a header). */
  header?: ReactNode;
  /** Pinned bottom area (e.g. call-to-action buttons). */
  footer?: ReactNode;
  scroll?: boolean;
  accent?: string;
  secondaryAccent?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Text-only pages (no buttons in the scroll area): lets keyboard users focus the
   * scroll area to scroll it (web).
   */
  focusableScroll?: boolean;
  testID?: string;
}

/** Base layout: ambient background, safe areas, centred max-width column (wider on tablets). */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  accent,
  secondaryAccent,
  contentStyle,
  focusableScroll = false,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const gutter = layout.wide ? spacing.xxxl : spacing.xl;
  const padding = {
    paddingLeft: Math.max(insets.left, gutter),
    paddingRight: Math.max(insets.right, gutter),
  };

  return (
    <View style={styles.root} testID={testID}>
      <AmbientBackground accent={accent} secondary={secondaryAccent} />
      <View
        role="main"
        style={[styles.column, { maxWidth: layout.contentWidth, paddingTop: insets.top + spacing.sm }]}
      >
        {header ? <View style={[styles.header, padding]}>{header}</View> : null}
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, padding, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            focusable={Platform.OS === 'web' && focusableScroll}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padding, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <View
            style={[
              styles.footer,
              padding,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xs },
            ]}
          >
            {footer}
          </View>
        ) : (
          <View style={{ height: insets.bottom }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  column: { flex: 1, width: '100%', alignSelf: 'center' },
  flex: { flex: 1 },
  header: { paddingBottom: spacing.sm },
  scrollContent: { paddingBottom: spacing.xxl, flexGrow: 1 },
  footer: { paddingTop: spacing.md, gap: spacing.md },
});
