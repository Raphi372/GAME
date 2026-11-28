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

/**
 * Shown when every question of the current level has been played – or when the group hid
 * every card of the level ("Karte ausblenden"), where reshuffling cannot help.
 */
export function ExhaustedCard({ level, deckSize, onReshuffle, onChangeLevel }: ExhaustedCardProps) {
  const { t } = useTranslation();
  const meta = LEVELS[level];
  const levelName = t(meta.nameKey).toLocaleUpperCase();
  const allHidden = deckSize === 0;
  return (
    <Surface style={styles.card} testID="deck-exhausted">
      <AppText variant="hero" align="center" aria-hidden>
        {allHidden ? '🙈' : '🎉'}
      </AppText>
      <View style={styles.text}>
        <AppText variant="h2" align="center" role="heading">
          {t(allHidden ? 'game.allHiddenTitle' : 'game.exhaustedTitle')}
        </AppText>
        <AppText variant="bodyLarge" align="center" color={colors.textSecondary}>
          {allHidden
            ? t('game.allHiddenBody', { level: levelName })
            : t('game.exhaustedBody', { count: deckSize, level: levelName })}
        </AppText>
      </View>
      {allHidden ? (
        <Button label={t('game.changeLevel')} icon="flame-outline" onPress={onChangeLevel} gradient={meta.gradient} />
      ) : (
        <>
          <Button label={t('game.reshuffle')} icon="shuffle" onPress={onReshuffle} gradient={meta.gradient} />
          <Button
            label={t('game.changeLevel')}
            icon="flame-outline"
            variant="secondary"
            size="md"
            onPress={onChangeLevel}
          />
        </>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, paddingVertical: spacing.xxxl },
  text: { gap: spacing.sm },
});
