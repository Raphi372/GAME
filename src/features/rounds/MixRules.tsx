import { StyleSheet, View } from 'react-native';

import { AppText, Icon, Surface } from '@/components/ui';
import { modeRuleKey, modeTitleKey } from '@/features/game-modes/labels';
import { getGameMode, type GameModeId } from '@/features/game-modes/registry';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme';

/** "So geht's" of a mixed round: one rule per selected mode plus the fair-play basics. */
export function MixRules({ modeIds }: { modeIds: readonly GameModeId[] }) {
  const { t } = useTranslation();
  return (
    <Surface style={styles.box} testID="mix-how-to">
      <Icon name="information-circle-outline" size={20} color={colors.lilacOrText} />
      <View style={styles.text}>
        <AppText variant="bodyStrong">{t('group.howToTitle')}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {t('mix.howToIntro')}
        </AppText>
        {modeIds.map((modeId) => (
          <AppText key={modeId} variant="caption" color={colors.textSecondary}>
            {`${getGameMode(modeId).emoji} ${t(modeTitleKey(modeId))} – ${t(modeRuleKey(modeId))}`}
          </AppText>
        ))}
        <AppText variant="caption" color={colors.textSecondary}>
          {t('mix.howToSafety')}
        </AppText>
      </View>
    </Surface>
  );
}

/**
 * Shown below the card in a mixed round when a mode comes up for the first time –
 * compact, so the card itself always stays in view on small phones.
 */
export function FirstCardHint({ modeId }: { modeId: GameModeId }) {
  const { t } = useTranslation();
  const title = `${getGameMode(modeId).emoji} ${t(modeTitleKey(modeId))}`;
  return (
    // Announced when it appears, after the card itself.
    <View aria-live="polite">
      <Surface style={[styles.box, styles.compact]} testID="mix-first-card">
        <Icon name="information-circle-outline" size={18} color={colors.lilacOrText} />
        <AppText variant="caption" color={colors.textSecondary} style={styles.text}>
          <AppText variant="caption" color={colors.text}>
            {t('mix.firstCard', { title })}
          </AppText>
          {` – ${t(modeRuleKey(modeId))}`}
        </AppText>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: spacing.md },
  compact: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'flex-start' },
  text: { flex: 1, gap: spacing.xxs },
});
