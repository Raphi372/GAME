import { StyleSheet, View } from 'react-native';

import { AppText, ChoiceChip, SectionTitle, Surface } from '@/components/ui';
import { modeTitleKey } from '@/features/game-modes/labels';
import { getGameMode, listPlayableModeIds, type GameModeId } from '@/features/game-modes/registry';
import { canEscalate, ROUND_LENGTHS } from '@/features/gameplay/engine/round';
import { LEVELS } from '@/features/levels/levels';
import { SettingsGroup, SwitchRow } from '@/features/settings/SettingsRows';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

interface RoundSettingsPanelProps {
  /** The level chosen above – the goal of an escalating round. */
  level: SpicyLevel;
  length: number | null;
  onLengthChange: (length: number | null) => void;
  escalate: boolean;
  onEscalateChange: (escalate: boolean) => void;
  /** Mixed rounds only: the modes to mix. */
  mix?: {
    modeIds: readonly GameModeId[];
    onToggle: (modeId: GameModeId) => void;
    playerCount: number;
  };
}

/** "Runde anpassen": round length, slow build-up and – for a mixed round – its modes. */
export function RoundSettingsPanel({
  level,
  length,
  onLengthChange,
  escalate,
  onEscalateChange,
  mix,
}: RoundSettingsPanelProps) {
  const { t } = useTranslation();
  const accent = LEVELS[level].accent;
  const escalatePossible = canEscalate(length, level);
  const goal = `${LEVELS[level].emoji} ${t(LEVELS[level].nameKey).toLocaleUpperCase()}`;
  const escalateHint =
    length === null
      ? t('round.escalateNeedsLength')
      : level === 'mild'
      ? t('round.escalateNeedsLevel')
      : t('round.escalateHint', { level: goal });

  const tooFew = (modeId: GameModeId) => (mix ? getGameMode(modeId).minPlayers > mix.playerCount : false);
  const playable = mix ? mix.modeIds.filter((modeId) => !tooFew(modeId)) : [];

  return (
    <View testID="round-settings">
      <SectionTitle>{t('round.title')}</SectionTitle>
      <View style={styles.blocks}>
        {mix ? (
          <Surface style={styles.block}>
            <View style={styles.block} role="group" aria-label={t('round.modes')}>
              <AppText variant="overline" color={colors.textMuted}>
                {t('round.modes')}
              </AppText>
              <View style={styles.chips}>
                {listPlayableModeIds().map((modeId) => {
                  const mode = getGameMode(modeId);
                  const title = t(modeTitleKey(modeId));
                  const blocked = tooFew(modeId);
                  return (
                    <ChoiceChip
                      key={modeId}
                      kind="checkbox"
                      label={`${mode.emoji} ${title}`}
                      a11yLabel={blocked ? t('round.modeNeedsPlayers', { title, min: mode.minPlayers }) : title}
                      selected={!blocked && mix.modeIds.includes(modeId)}
                      disabled={blocked}
                      onPress={() => mix.onToggle(modeId)}
                      accent={accent}
                      testID={`round-mode-${modeId}`}
                    />
                  );
                })}
              </View>
              {listPlayableModeIds()
                .filter(tooFew)
                .map((modeId) => (
                  <AppText key={modeId} variant="caption" color={colors.textMuted}>
                    {t('round.modeNeedsPlayers', { title: t(modeTitleKey(modeId)), min: getGameMode(modeId).minPlayers })}
                  </AppText>
                ))}
              {playable.length < 2 ? (
                <AppText variant="caption" color={colors.accent} role="alert">
                  {t('round.modesHint')}
                </AppText>
              ) : null}
            </View>
          </Surface>
        ) : null}

        <Surface style={styles.block}>
          <View style={styles.block} role="radiogroup" aria-label={t('round.length')}>
            <AppText variant="overline" color={colors.textMuted}>
              {t('round.length')}
            </AppText>
            <View style={styles.chips}>
              {[null, ...ROUND_LENGTHS].map((option) => (
                <ChoiceChip
                  key={option ?? 'endless'}
                  label={option === null ? t('round.endless') : t('round.cards', { count: option })}
                  a11yLabel={`${t('round.length')}: ${option === null ? t('round.endless') : t('round.cards', { count: option })}`}
                  selected={length === option}
                  onPress={() => onLengthChange(option)}
                  accent={accent}
                  testID={`round-length-${option ?? 'endless'}`}
                />
              ))}
            </View>
          </View>
        </Surface>

        <SettingsGroup>
          <SwitchRow
            icon="trending-up-outline"
            label={t('round.escalate')}
            hint={escalateHint}
            value={escalate && escalatePossible}
            onValueChange={onEscalateChange}
            disabled={!escalatePossible}
            testID="round-escalate"
          />
        </SettingsGroup>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: spacing.md },
  block: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
