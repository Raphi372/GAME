import { StyleSheet, View } from 'react-native';

import { AppText, Button, Surface } from '@/components/ui';
import { LEVELS } from '@/features/levels/levels';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

interface ExhaustedCardProps {
  level: SpicyLevel;
  deckSize: number;
  onReshuffle: () => void;
  onChangeLevel: () => void;
}

/** Shown when every question of the current level has been played. */
export function ExhaustedCard({ level, deckSize, onReshuffle, onChangeLevel }: ExhaustedCardProps) {
  const { t } = useTranslation();
  const meta = LEVELS[level];
  return (
    <Surface style={styles.card} testID="deck-exhausted">
      <AppText variant="hero" align="center" aria-hidden>
        🎉
      </AppText>
      <View style={styles.text}>
        <AppText variant="h2" align="center" role="heading">
          {t('game.exhaustedTitle')}
        </AppText>
        <AppText variant="bodyLarge" align="center" color={colors.textSecondary}>
          {t('game.exhaustedBody', { count: deckSize, level: t(meta.nameKey).toLocaleUpperCase() })}
        </AppText>
      </View>
      <Button label={t('game.reshuffle')} icon="shuffle" onPress={onReshuffle} gradient={meta.gradient} />
      <Button
        label={t('game.changeLevel')}
        icon="flame-outline"
        variant="secondary"
        size="md"
        onPress={onChangeLevel}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, paddingVertical: spacing.xxxl },
  text: { gap: spacing.sm },
});
