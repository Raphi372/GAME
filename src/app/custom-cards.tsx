import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Button, ConfirmSheet, Header, Icon, Screen, Surface } from '@/components/ui';
import { ChoiceChip } from '@/features/custom-cards/components/ChoiceChip';
import { CustomCardEditor } from '@/features/custom-cards/components/CustomCardEditor';
import { CustomCardRow } from '@/features/custom-cards/components/CustomCardRow';
import type { CustomCard } from '@/features/custom-cards/model';
import { modeTitleKey } from '@/features/game-modes/labels';
import { isGameModeId, listGameModes, type GameModeId } from '@/features/game-modes/registry';
import { LEVELS } from '@/features/levels/levels';
import { canUseFeature } from '@/features/premium/entitlements';
import { useTranslation } from '@/i18n';
import { useCustomCardsStore, useEntitlementsStore } from '@/store';
import { brandGradient, colors, spacing } from '@/theme';
import { isSpicyLevel, SPICY_LEVELS, type SpicyLevel } from '@/types';

/** Players write their own cards per game mode and level (Premium feature). */
export default function CustomCardsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  /** Narrow phones: tighter buttons so the long labels keep fitting. */
  const narrow = width < 380;
  const params = useLocalSearchParams<{ mode?: string; level?: string }>();
  const entitlements = useEntitlementsStore((state) => state.entitlements);
  const cards = useCustomCardsStore((state) => state.cards);
  const removeCard = useCustomCardsStore((state) => state.removeCard);
  const modes = useMemo(() => listGameModes().filter((mode) => mode.status === 'available'), []);

  const [modeId, setModeId] = useState<GameModeId>(() =>
    isGameModeId(params.mode) ? params.mode : 'spicy-questions',
  );
  const [level, setLevel] = useState<SpicyLevel>(() => (isSpicyLevel(params.level) ? params.level : 'mild'));
  /** `key` remounts the editor so every opening starts with fresh state. */
  const [editor, setEditor] = useState<{ key: number; card?: CustomCard } | null>(null);
  const [deleting, setDeleting] = useState<CustomCard | null>(null);

  const header = <Header title={t('custom.title')} />;

  if (!canUseFeature('customQuestions', entitlements)) {
    return (
      <Screen header={header} testID="custom-cards-locked">
        <Surface style={styles.locked}>
          <Icon name="diamond" size={30} color={brandGradient[1]} />
          <AppText variant="h2" align="center" role="heading">
            {t('custom.locked.title')}
          </AppText>
          <AppText variant="body" align="center" color={colors.textSecondary}>
            {t('custom.locked.body')}
          </AppText>
          {cards.length > 0 ? (
            <AppText variant="caption" align="center" color={colors.textMuted}>
              {t('custom.locked.stored')}
            </AppText>
          ) : null}
          <Button
            label={t('custom.locked.cta')}
            icon="diamond-outline"
            onPress={() => router.push('/premium')}
            dense={narrow}
            style={styles.lockedCta}
          />
        </Surface>
      </Screen>
    );
  }

  const meta = LEVELS[level];
  const visible = cards.filter((card) => card.modeId === modeId && card.level === level);

  return (
    <Screen
      header={header}
      accent={meta.accent}
      testID="custom-cards"
      footer={
        <Button
          label={t('custom.add')}
          icon="add"
          gradient={meta.gradient}
          onPress={() => setEditor({ key: Date.now() })}
          dense={narrow}
          testID="custom-card-add"
        />
      }
    >
      <AppText variant="body" color={colors.textSecondary}>
        {t('custom.subtitle')}
      </AppText>

      <View style={styles.section} role="radiogroup" aria-label={t('custom.modeLabel')}>
        <AppText variant="overline" color={colors.textMuted}>
          {t('custom.modeLabel')}
        </AppText>
        <View style={styles.chips}>
          {modes.map((mode) => (
            <ChoiceChip
              key={mode.id}
              label={`${mode.emoji} ${t(modeTitleKey(mode.id))}`}
              a11yLabel={t(modeTitleKey(mode.id))}
              selected={modeId === mode.id}
              onPress={() => setModeId(mode.id)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section} role="radiogroup" aria-label={t('custom.levelLabel')}>
        <AppText variant="overline" color={colors.textMuted}>
          {t('custom.levelLabel')}
        </AppText>
        <View style={styles.chips}>
          {SPICY_LEVELS.map((id) => (
            <ChoiceChip
              key={id}
              label={`${LEVELS[id].emoji} ${t(LEVELS[id].nameKey)}`}
              a11yLabel={t(LEVELS[id].nameKey)}
              selected={level === id}
              onPress={() => setLevel(id)}
              accent={LEVELS[id].accent}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" color={colors.textMuted}>
          {visible.length === 1 ? t('custom.countOne') : t('custom.countMany', { count: visible.length })}
        </AppText>
        {visible.length === 0 ? (
          <Surface>
            <AppText variant="body" color={colors.textSecondary} align="center">
              {t('custom.empty')}
            </AppText>
          </Surface>
        ) : (
          <View style={styles.list}>
            {visible.map((card) => (
              <CustomCardRow
                key={card.id}
                card={card}
                onEdit={() => setEditor({ key: Date.now(), card })}
                onDelete={() => setDeleting(card)}
              />
            ))}
          </View>
        )}
      </View>

      <AppText variant="caption" color={colors.textMuted} style={styles.rules}>
        {t('custom.rules')}
      </AppText>

      {editor ? (
        <CustomCardEditor
          key={editor.key}
          modeId={modeId}
          level={level}
          card={editor.card}
          onClose={() => setEditor(null)}
        />
      ) : null}

      <ConfirmSheet
        visible={deleting !== null}
        title={t('custom.deleteTitle')}
        body={t('custom.deleteBody')}
        confirmLabel={t('custom.deleteConfirm')}
        cancelLabel={t('custom.cancel')}
        destructive
        emoji="🗑️"
        onConfirm={() => {
          if (deleting) removeCard(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
        testID="custom-card-delete"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  locked: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, marginTop: spacing.lg },
  lockedCta: { alignSelf: 'stretch', marginTop: spacing.sm },
  section: { gap: spacing.sm, marginTop: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { gap: spacing.sm },
  rules: { marginTop: spacing.xl },
});
