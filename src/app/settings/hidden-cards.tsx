import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ConfirmSheet, Header, Screen, Surface } from '@/components/ui';
import { modeTitleKey } from '@/features/game-modes/labels';
import { getGameMode } from '@/features/game-modes/registry';
import { describeHiddenCards } from '@/features/hidden-cards/describe';
import { LEVELS } from '@/features/levels/levels';
import { useTranslation } from '@/i18n';
import { useCustomCardsStore, useHiddenCardsStore } from '@/store';
import { colors, spacing } from '@/theme';

/** Cards the group hid during a game – each one can come back. */
export default function HiddenCardsScreen() {
  const { t, locale } = useTranslation();
  const ids = useHiddenCardsStore((state) => state.ids);
  const showCard = useHiddenCardsStore((state) => state.showCard);
  const showAllCards = useHiddenCardsStore((state) => state.showAllCards);
  const customCards = useCustomCardsStore((state) => state.cards);
  const [confirmAll, setConfirmAll] = useState(false);
  const cards = describeHiddenCards(ids, locale, customCards, t('game.fallbackTarget'));

  return (
    <Screen
      header={<Header title={t('hidden.title')} />}
      footer={
        cards.length > 0 ? (
          <Button
            label={t('hidden.restoreAll')}
            icon="eye-outline"
            variant="secondary"
            size="md"
            onPress={() => setConfirmAll(true)}
            testID="hidden-restore-all"
          />
        ) : undefined
      }
    >
      <AppText color={colors.textSecondary} style={styles.intro}>
        {cards.length > 0 ? t('hidden.intro') : t('hidden.empty')}
      </AppText>

      <View style={styles.list}>
        {cards.map((card) => {
          const mode = getGameMode(card.modeId);
          const level = LEVELS[card.level];
          const details = [
            `${mode.emoji} ${t(modeTitleKey(card.modeId))}`,
            `${level.emoji} ${t(level.nameKey).toLocaleUpperCase()}`,
            card.kind ? t(card.kind === 'truth' ? 'tod.truth' : 'tod.dare') : null,
            card.own ? t('hidden.own') : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Surface key={card.id} style={styles.card} testID="hidden-card">
              <AppText variant="caption" color={colors.textMuted}>
                {details}
              </AppText>
              <AppText variant="bodyLarge">{card.text}</AppText>
              <Button
                label={t('hidden.restore')}
                hint={`${t('hidden.restoreHint')} ${card.text}`}
                icon="eye-outline"
                variant="ghost"
                size="sm"
                onPress={() => showCard(card.id)}
                style={styles.restore}
              />
            </Surface>
          );
        })}
      </View>

      <ConfirmSheet
        visible={confirmAll}
        emoji="👀"
        title={t('hidden.restoreAllTitle')}
        body={t('hidden.restoreAllBody')}
        confirmLabel={t('hidden.restoreAll')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirmAll(false);
          showAllCards();
        }}
        onCancel={() => setConfirmAll(false)}
        testID="hidden-restore-all-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.lg },
  list: { gap: spacing.md },
  card: { gap: spacing.sm },
  restore: { alignSelf: 'flex-start' },
});
