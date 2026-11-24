import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { useMotion } from '@/hooks/useMotion';
import { useTranslation } from '@/i18n';
import { colors, durations, NATIVE_DRIVER, spacing } from '@/theme';
import type { Player } from '@/types';

interface TurnBannerProps {
  player: Player;
  accent: string;
}

/** "Du bist dran" banner – slides in whenever the active player changes. */
export function TurnBanner({ player, accent }: TurnBannerProps) {
  const { t } = useTranslation();
  const { enabled: motion } = useMotion();
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!motion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: durations.slow,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [player.id, motion, progress]);

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: progress,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          ],
        },
      ]}
      accessible
      aria-label={`${t('game.yourTurn')}: ${player.name}`}
      testID="turn-banner"
    >
      <Avatar name={player.name} colorIndex={player.colorIndex} size={52} />
      <View style={styles.text}>
        <AppText variant="overline" color={accent}>
          {t('game.yourTurn')}
        </AppText>
        <AppText variant="h1" numberOfLines={1} adjustsFontSizeToFit color={colors.text}>
          {player.name}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: spacing.xxs },
});
