import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ConfirmSheet, Header, Icon, Screen, Surface } from '@/components/ui';
import { FEATURES } from '@/config/features';
import { modeTitleKey } from '@/features/game-modes/labels';
import {
  DEFAULT_MODE_ID,
  getGameMode,
  isGameModeId,
  MIX_EMOJI,
  MIX_PARAM,
  type GameModeId,
} from '@/features/game-modes/registry';
import { canEscalate } from '@/features/gameplay/engine/round';
import { LevelCard } from '@/features/levels/components/LevelCard';
import { LEVELS, listLevels } from '@/features/levels/levels';
import { MixRules } from '@/features/rounds/MixRules';
import { RoundSettingsPanel } from '@/features/rounds/RoundSettingsPanel';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { getBuiltInDeck, getCustomQuestions, useCustomCardsStore, useEntitlementsStore, useGameStore, useHiddenCardsStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

export default function LevelScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mixed = params.mode === MIX_PARAM;
  const modeId = isGameModeId(params.mode) ? params.mode : DEFAULT_MODE_ID;

  const lastLevel = useGameStore((state) => state.lastLevel);
  const lastRound = useGameStore((state) => state.lastRound);
  // Re-render when the players' own cards or the Premium state change (card counts).
  useCustomCardsStore((state) => state.cards);
  useHiddenCardsStore((state) => state.ids);
  useEntitlementsStore((state) => state.entitlements);
  const playerCount = useGameStore((state) => state.players.length);
  const startGame = useGameStore((state) => state.startGame);

  const [selected, setSelected] = useState<SpicyLevel>(lastLevel);
  const [length, setLength] = useState<number | null>(lastRound.length);
  const [escalate, setEscalate] = useState(lastRound.escalate);
  const [mixModes, setMixModes] = useState<GameModeId[]>(lastRound.mixModeIds);
  /** EXTREME needs the group's consent once per visit of this screen. */
  const [consented, setConsented] = useState(false);
  const [consentFor, setConsentFor] = useState<'select' | 'start' | null>(null);
  const meta = LEVELS[selected];
  const mode = getGameMode(modeId);
  // Mixed rounds leave out modes the group is too small for and need two modes left.
  const mixPlayable = mixModes.filter((id) => getGameMode(id).minPlayers <= playerCount);
  const canStart = mixed ? mixPlayable.length >= 2 : playerCount >= mode.minPlayers;
  // Cards that can still come up – hidden ones ("Karte ausblenden") are not counted.
  const cardCount = (level: SpicyLevel) =>
    mixed
      ? mixPlayable.reduce(
          (sum, id) => sum + getBuiltInDeck(id, level, locale).length + getCustomQuestions(id, level).length,
          0,
        )
      : getBuiltInDeck(modeId, level, locale).length;
  const toggleMixMode = (id: GameModeId) =>
    setMixModes((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

  const choose = (level: SpicyLevel) => {
    if (level === 'extreme' && !consented) {
      setConsentFor('select');
      return;
    }
    setSelected(level);
  };

  const launch = (level: SpicyLevel) => {
    const setup = {
      length,
      escalate: escalate && canEscalate(length, level),
      // The whole selection: the store leaves out modes the group is too small for, but
      // remembers them for the next (bigger) round.
      ...(mixed ? { modeIds: mixModes } : {}),
    };
    if (!startGame(mixed ? (mixPlayable[0] ?? modeId) : modeId, level, setup)) return;
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
        {mixed ? `${MIX_EMOJI} ${t('mix.title')}` : `${mode.emoji} ${t(modeTitleKey(modeId))}`}
      </AppText>
      {mixed ? (
        <View style={styles.mixRules}>
          <MixRules modeIds={mixPlayable.length > 0 ? mixPlayable : mixModes} />
        </View>
      ) : null}
      {mode.howTo && !mixed ? (
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
      <View style={styles.list} role="radiogroup" aria-label={t('level.title')}>
        {listLevels().map((level) => (
          <LevelCard
            key={level.id}
            level={level.id}
            selected={selected === level.id}
            modeId={modeId}
            questionCount={cardCount(level.id)}
            customCount={mixed ? 0 : getCustomQuestions(modeId, level.id).length}
            {...(mixed
              ? {
                  descriptionKey: `mix.level.${level.id}.description` as const,
                  countLabel: t('mode.unit.cards', { count: cardCount(level.id) }),
                }
              : {})}
            onPress={() => choose(level.id)}
            testID={`level-${level.id}`}
          />
        ))}
      </View>
      <RoundSettingsPanel
        level={selected}
        length={length}
        onLengthChange={setLength}
        escalate={escalate}
        onEscalateChange={setEscalate}
        mix={mixed ? { modeIds: mixModes, onToggle: toggleMixMode, playerCount } : undefined}
      />
      {FEATURES.premium && !mixed ? (
        <Button
          label={t('level.customLink')}
          hint={t('level.customLinkHint')}
          icon="create-outline"
          variant="ghost"
          size="sm"
          onPress={() => router.push({ pathname: '/custom-cards', params: { mode: modeId, level: selected } })}
          style={styles.customLink}
          testID="level-custom-cards"
        />
      ) : null}
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
  mixRules: { marginTop: spacing.md },
  list: { gap: spacing.lg, paddingTop: spacing.lg },
  customLink: { alignSelf: 'center', marginTop: spacing.md },
});
