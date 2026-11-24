import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { LevelCard } from '@/features/levels/components/LevelCard';
import { LEVELS, listLevels } from '@/features/levels/levels';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

interface LevelSheetProps {
  visible: boolean;
  current: SpicyLevel;
  getCount: (level: SpicyLevel) => number;
  onSelect: (level: SpicyLevel) => void;
  onClose: () => void;
}

/** In-game level switcher. Switching to EXTREME asks the group for consent first. */
export function LevelSheet({ visible, current, getCount, onSelect, onClose }: LevelSheetProps) {
  const { t } = useTranslation();
  const [pendingExtreme, setPendingExtreme] = useState(false);

  const close = () => {
    setPendingExtreme(false);
    onClose();
  };

  const select = (level: SpicyLevel) => {
    setPendingExtreme(false);
    onSelect(level);
  };

  const choose = (level: SpicyLevel) => {
    if (level === current) return close();
    if (level === 'extreme') return setPendingExtreme(true);
    select(level);
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      accent={LEVELS[pendingExtreme ? 'extreme' : current].accent}
      testID="level-sheet"
    >
      {pendingExtreme ? (
        <>
          <View style={styles.text}>
            <AppText variant="h1" aria-hidden>
              {LEVELS.extreme.emoji}
            </AppText>
            <AppText variant="h2" role="heading">
              {t('level.extremeConsentTitle')}
            </AppText>
            <AppText variant="bodyLarge" color={colors.textSecondary}>
              {t('level.extremeConsentBody')}
            </AppText>
          </View>
          <View style={styles.actions}>
            <Button
              label={t('level.extremeConsentConfirm')}
              gradient={LEVELS.extreme.gradient}
              size="md"
              onPress={() => select('extreme')}
            />
            <Button
              label={t('level.extremeConsentCancel')}
              variant="ghost"
              size="md"
              onPress={() => setPendingExtreme(false)}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.text}>
            <AppText variant="h2" role="heading">
              {t('game.levelSheetTitle')}
            </AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {t('game.levelSheetBody')}
            </AppText>
          </View>
          <View style={styles.list} role="radiogroup">
            {listLevels().map((meta) => (
              <LevelCard
                key={meta.id}
                level={meta.id}
                compact
                selected={meta.id === current}
                questionCount={getCount(meta.id)}
                onPress={() => choose(meta.id)}
              />
            ))}
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  text: { gap: spacing.sm },
  list: { gap: spacing.md },
  actions: { gap: spacing.xs },
});
