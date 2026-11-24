import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ConfirmSheet, Header, Screen } from '@/components/ui';
import { DEFAULT_MODE_ID, getGameMode, isGameModeId } from '@/features/game-modes/registry';
import { LevelCard } from '@/features/levels/components/LevelCard';
import { LEVELS, listLevels } from '@/features/levels/levels';
import { getDeckSize } from '@/features/question-decks';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store';
import { spacing } from '@/theme';
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
  const canStart = playerCount >= getGameMode(modeId).minPlayers;

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
      <View style={styles.list} role="radiogroup">
        {listLevels().map((level) => (
          <LevelCard
            key={level.id}
            level={level.id}
            selected={selected === level.id}
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
  list: { gap: spacing.lg, paddingTop: spacing.md },
});
