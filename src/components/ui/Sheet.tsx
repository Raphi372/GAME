import { useEffect, useState, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMotion } from '@/hooks/useMotion';
import { useTranslation } from '@/i18n';
import { colors, durations, maxContentWidth, NATIVE_DRIVER, radius, spacing } from '@/theme';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accent colour of the top glow line. */
  accent?: string;
  testID?: string;
}

/** Bottom sheet built on the platform Modal (accessible, closes on back button / backdrop tap). */
export function Sheet({ visible, onClose, children, accent = colors.primary, testID }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { enabled: motion } = useMotion();
  const [translateY] = useState(() => new Animated.Value(motion ? 60 : 0));

  useEffect(() => {
    if (!visible) return;
    if (!motion) {
      translateY.setValue(0);
      return;
    }
    translateY.setValue(60);
    Animated.timing(translateY, {
      toValue: 0,
      duration: durations.base,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [visible, motion, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={motion ? 'fade' : 'none'}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID={testID}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          role="button"
          aria-label={t('common.close')}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <Animated.View
          aria-modal
          style={[
            styles.panel,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm },
            { transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.accentLine, { backgroundColor: accent }]} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  panel: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: '30%',
    right: '30%',
    height: 2,
    borderRadius: 2,
    opacity: 0.9,
  },
});
