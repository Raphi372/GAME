import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ConfirmSheet, Header, Icon, Screen, Surface } from '@/components/ui';
import { modeTitleKey } from '@/features/game-modes/labels';
import { DEFAULT_MODE_ID, getGameMode, isGameModeId } from '@/features/game-modes/registry';
import { LevelCard } from '@/features/levels/components/LevelCard';
import { LEVELS, listLevels } from '@/features/levels/levels';
import { getDeckSize } from '@/features/question-decks';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

export default function LevelScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const modeId = isGameModeId(params.mode) ? params.mode : DEFAULT_MODE_ID;

  const lastLevel = useGameStore((state) => state.lastLevel);
  const playerCount = useGameStore((state) => state.players.length);
  const startGame = useGameStore((state) => state.startGame);

  const [selected, setSelected] = useState<SpicyLevel>(lastLevel);
  /** EXTREME needs the group's consent once per visit of this screen. */
  const [consented, setConsented] = useState(false);
  const [consentFor, setConsentFor] = useState<'select' | 'start' | null>(null);
  const meta = LEVELS[selected];
  const mode = getGameMode(modeId);
  const canStart = playerCount >= mode.minPlayers;

  const choose = (level: SpicyLevel) => {
    if (level === 'extreme' && !consented) {
      setConsentFor('select');
      return;
    }
    setSelected(level);
  };

  const launch = (level: SpicyLevel) => {
    if (!startGame(modeId, level)) return;
    feedback('level');
    router.replace('/game');
  };

  const start = () => {
    if (selected === 'extreme' && !consented) {
      setConsentFor('start');
      return;
    }
    launch(selected);
  };

  return (
    <Screen
      accent={meta.gradient[0]}
      secondaryAccent={meta.gradient[1]}
      header={<Header title={t('level.title')} subtitle={t('level.subtitle')} />}
      footer={
        <Button
          label={t('level.start')}
          icon="flame"
          gradient={meta.gradient}
          disabled={!canStart}
          feedbackEvent={null}
          onPress={start}
          testID="level-start"
        />
      }
    >
      <AppText variant="overline" color={colors.accent} style={styles.modeName}>
        {`${mode.emoji} ${t(modeTitleKey(modeId))}`}
      </AppText>
      {mode.howTo ? (
        <Surface style={styles.howTo} testID="how-to">
          <Icon name="information-circle-outline" size={20} color={colors.lilacOrText} />
          <View style={styles.howToText}>
            <AppText variant="bodyStrong">{t('group.howToTitle')}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t(mode.howTo)}
            </AppText>
          </View>
        </Surface>
      ) : null}
      <View style={styles.list} role="radiogroup">
        {listLevels().map((level) => (
          <LevelCard
            key={level.id}
            level={level.id}
            selected={selected === level.id}
            modeId={modeId}
            questionCount={getDeckSize(modeId, level.id, { locale })}
            onPress={() => choose(level.id)}
            testID={`level-${level.id}`}
          />
        ))}
      </View>
      <ConfirmSheet
        visible={consentFor !== null}
        emoji={LEVELS.extreme.emoji}
        title={t('level.extremeConsentTitle')}
        body={t('level.extremeConsentBody')}
        confirmLabel={t('level.extremeConsentConfirm')}
        cancelLabel={t('level.extremeConsentCancel')}
        accent={LEVELS.extreme.accent}
        gradient={LEVELS.extreme.gradient}
        onConfirm={() => {
          const reason = consentFor;
          setConsented(true);
          setSelected('extreme');
          setConsentFor(null);
          if (reason === 'start') launch('extreme');
        }}
        onCancel={() => setConsentFor(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeName: { marginTop: spacing.xs, marginLeft: spacing.xs },
  howTo: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  howToText: { flex: 1, gap: spacing.xxs },
  list: { gap: spacing.lg, paddingTop: spacing.lg },
});
