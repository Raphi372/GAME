import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Button, Chip, ConfirmSheet, IconButton, Screen } from '@/components/ui';
import { modeTitleKey } from '@/features/game-modes/labels';
import { DEFAULT_SINGLE_COPY, getGameMode } from '@/features/game-modes/registry';
import { ChallengeTimer } from '@/features/gameplay/components/ChallengeTimer';
import { ChoicePanel } from '@/features/gameplay/components/ChoicePanel';
import { Countdown } from '@/features/gameplay/components/Countdown';
import { ExhaustedCard } from '@/features/gameplay/components/ExhaustedCard';
import { LevelPill } from '@/features/gameplay/components/LevelPill';
import { LevelSheet } from '@/features/gameplay/components/LevelSheet';
import { PlayerPicker } from '@/features/gameplay/components/PlayerPicker';
import { QuestionCard } from '@/features/gameplay/components/QuestionCard';
import { FirstCardHint } from '@/features/rounds/MixRules';
import { TurnBanner } from '@/features/gameplay/components/TurnBanner';
import { countRemaining } from '@/features/gameplay/engine/deck';
import { isLevelUp, isMixedRound } from '@/features/gameplay/engine/round';
import {
  getCurrentQuestion,
  isAwaitingChoice,
  isSessionOver,
  remainingByKind,
  roundProgress,
} from '@/features/gameplay/engine/session';
import { LEVELS } from '@/features/levels/levels';
import { renderQuestionText, splitLead } from '@/features/question-decks';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { getPlayableDeck, useCustomCardsStore, useEntitlementsStore, useGameStore } from '@/store';
import { colors, spacing } from '@/theme';
import type { SpicyLevel } from '@/types';

export default function GameScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { width } = useWindowDimensions();
  /** Narrow phones: compact secondary buttons so the labels keep fitting. */
  const narrow = width < 380;
  /** Tablets have room for a full-size card above the player picker as well. */
  const { wide } = useLayout();
  const session = useGameStore((state) => state.session);
  const players = useGameStore((state) => state.players);
  const answer = useGameStore((state) => state.answer);
  const pass = useGameStore((state) => state.pass);
  const skip = useGameStore((state) => state.skip);
  const nextGroupCard = useGameStore((state) => state.nextGroupCard);
  const chooseCard = useGameStore((state) => state.chooseCard);
  const changeLevel = useGameStore((state) => state.changeLevel);
  const reshuffle = useGameStore((state) => state.reshuffle);
  const endGame = useGameStore((state) => state.endGame);
  const refreshDecks = useGameStore((state) => state.refreshDecks);
  // Re-render when the players' own cards or the Premium state change.
  useCustomCardsStore((state) => state.cards);
  useEntitlementsStore((state) => state.entitlements);

  // The card on the table may have been deleted (own cards) – deal a new one then.
  const cardMissing =
    session?.current?.questionId != null &&
    getCurrentQuestion(session, (level) => getPlayableDeck(session.modeId, level, locale)) === null;
  useEffect(() => {
    if (cardMissing) refreshDecks();
  }, [cardMissing, refreshDecks]);

  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [endSheetOpen, setEndSheetOpen] = useState(false);
  /** Set while navigating to the summary so the screen doesn't redirect home first. */
  const [leaving, setLeaving] = useState(false);
  /** Group modes: players marked on the current card – only valid for the card it was made on. */
  const [selection, setSelection] = useState<{ cardKey: string; ids: string[] }>({
    cardKey: '',
    ids: [],
  });

  // Android back button asks before leaving a running game.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        setEndSheetOpen(true);
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  if (!session) return leaving ? null : <Redirect href="/" />;

  const mode = getGameMode(session.modeId);
  const group = mode.turnStyle === 'group' ? mode.group : undefined;
  const isGroup = group !== undefined;
  const deckFor = (level: SpicyLevel) => getPlayableDeck(session.modeId, level, locale);
  const deck = deckFor(session.level);
  const meta = LEVELS[session.level];
  const question = getCurrentQuestion(session, deckFor);
  const current = session.current;
  const player = players.find((candidate) => candidate.id === current?.playerId) ?? players[0];
  const target = players.find((candidate) => candidate.id === current?.targetPlayerId);
  const remaining = countRemaining(deck, session.playedByLevel[session.level]);
  const round = session.turnsCompleted + 1;
  const progress = roundProgress(session);
  // Mixed rounds name the mode of each card – unless the card already starts with it
  // ("Ich hab noch nie …", "Wer würde am ehesten …").
  const showModeChip = isMixedRound(session.round) && !(group && mode.cardLead);
  // Escalating round: the first card of a new level says so.
  const levelUp = session.round.escalate && isLevelUp(session.round, session.turnsCompleted);
  // Mixed rounds explain each mode briefly the first time one of its cards comes up.
  const firstOfMode = isMixedRound(session.round) && session.dealtByMode[session.modeId] === 1;
  // Choice modes ("Wahrheit oder Pflicht"): the player first picks a kind.
  const choiceKinds = mode.choice?.kinds;
  const awaitingChoice = isAwaitingChoice(session, { choiceKinds });
  const kindCounts = choiceKinds ? remainingByKind(session, deckFor, choiceKinds) : null;
  const exhausted = choiceKinds
    ? awaitingChoice && choiceKinds.every((kind) => (kindCounts?.[kind] ?? 0) === 0)
    : question === null;
  const kindLabel = current?.kind ? t(current.kind === 'truth' ? 'tod.truth' : 'tod.dare') : null;
  const cardKey = `${session.level}:${current?.questionId ?? ''}:${current?.playerId ?? ''}`;
  const selectedIds = selection.cardKey === cardKey ? selection.ids : [];

  const fullText = question
    ? renderQuestionText(question.text, {
        targetPlayerName: target?.name,
        fallbackTargetName: t('game.fallbackTarget'),
      })
    : '';
  const { lead, rest } = splitLead(fullText, Object.values(mode.cardLead ?? {}));
  // "Alle:" / "Everyone:" → shown above the text without the colon; otherwise an optional
  // mode label ("Challenge").
  const displayLead = lead?.replace(/:$/, '') ?? (mode.cardLabel ? t(mode.cardLabel) : null);
  const single = mode.singleCopy ?? DEFAULT_SINGLE_COPY;
  const categoryLabel = question ? t(`category.${question.category}`) : '';
  const tallies = group
    ? Object.fromEntries(Object.entries(session.stats).map(([id, stats]) => [id, stats[group.tally]]))
    : {};

  const toggleMark = (playerId: string) =>
    setSelection({
      cardKey,
      ids: selectedIds.includes(playerId)
        ? selectedIds.filter((id) => id !== playerId)
        : [...selectedIds, playerId],
    });

  const finish = () => {
    setLeaving(true);
    setEndSheetOpen(false);
    endGame();
    router.replace('/summary');
  };

  /** Runs a turn action; after the last card of a fixed-length round it opens the summary. */
  const thenFinishIfOver = (action: () => void) => () => {
    action();
    const next = useGameStore.getState().session;
    if (next && isSessionOver(next)) {
      feedback('success');
      finish();
    }
  };
  const answerTurn = thenFinishIfOver(answer);
  const passTurn = thenFinishIfOver(pass);

  const choiceFooter = awaitingChoice ? (
    <>
      <Button
        label={t('game.pass')}
        icon="hand-left-outline"
        variant="secondary"
        size="md"
        hint={t('game.passHint')}
        feedbackEvent="pass"
        onPress={passTurn}
        testID="action-pass"
      />
      <AppText variant="caption" color={colors.textMuted} align="center">
        {`${t('tod.safetyHint')} 💜`}
      </AppText>
    </>
  ) : (
    <>
      <Button
        label={t('tod.done')}
        icon="checkmark"
        hint={t('tod.doneHint')}
        gradient={meta.gradient}
        feedbackEvent="success"
        onPress={answerTurn}
        testID="action-next"
      />
      <View style={styles.secondaryRow}>
        <Button
          label={t('tod.another')}
          icon={narrow ? undefined : 'shuffle'}
          variant="secondary"
          size="md"
          hint={t('tod.anotherHint')}
          feedbackEvent="reveal"
          onPress={skip}
          style={styles.half}
          dense={narrow}
          testID="action-skip"
        />
        <Button
          label={t('game.pass')}
          icon={narrow ? undefined : 'hand-left-outline'}
          variant="secondary"
          size="md"
          hint={t('game.passHint')}
          feedbackEvent="pass"
          onPress={passTurn}
          style={styles.half}
          dense={narrow}
          testID="action-pass"
        />
      </View>
      <AppText variant="caption" color={colors.textMuted} align="center">
        {`${t('tod.safetyHint')} 💜`}
      </AppText>
    </>
  );

  const footer = exhausted ? undefined : choiceKinds ? choiceFooter : group ? (
    <>
      <Button
        label={t('group.next')}
        icon="arrow-forward"
        hint={t(group.copy.nextHint)}
        gradient={meta.gradient}
        feedbackEvent="reveal"
        onPress={thenFinishIfOver(() => nextGroupCard(selectedIds))}
        testID="action-next"
      />
      <Button
        label={t('game.skip')}
        icon="shuffle"
        variant="secondary"
        size="md"
        hint={t('group.skipHint')}
        feedbackEvent="reveal"
        onPress={skip}
        testID="action-skip"
      />
      <AppText variant="caption" color={colors.textMuted} align="center">
        {`${t(group.copy.safetyHint)} 💜`}
      </AppText>
    </>
  ) : (
    <>
      <Button
        label={t(single.next)}
        icon="arrow-forward"
        hint={t(single.nextHint)}
        gradient={meta.gradient}
        feedbackEvent="reveal"
        onPress={answerTurn}
        testID="action-next"
      />
      <View style={styles.secondaryRow}>
        <Button
          label={t(single.skip)}
          icon={narrow ? undefined : 'shuffle'}
          variant="secondary"
          size="md"
          hint={t(single.skipHint)}
          feedbackEvent="reveal"
          onPress={skip}
          style={styles.half}
          dense={narrow}
          testID="action-skip"
        />
        <Button
          label={t('game.pass')}
          icon={narrow ? undefined : 'hand-left-outline'}
          variant="secondary"
          size="md"
          hint={t('game.passHint')}
          feedbackEvent="pass"
          onPress={passTurn}
          style={styles.half}
          dense={narrow}
          testID="action-pass"
        />
      </View>
      <AppText variant="caption" color={colors.textMuted} align="center">
        {`${t(single.safetyHint)} 💜`}
      </AppText>
    </>
  );

  return (
    <Screen
      accent={meta.gradient[0]}
      secondaryAccent={meta.gradient[1]}
      header={
        <View style={styles.topBar}>
          <IconButton icon="close" label={t('game.end')} onPress={() => setEndSheetOpen(true)} />
          <LevelPill level={session.level} onPress={() => setLevelSheetOpen(true)} />
          <IconButton
            icon="people-outline"
            label={t('game.managePlayers')}
            onPress={() => router.push({ pathname: '/players', params: { from: 'game' } })}
          />
        </View>
      }
      footer={footer}
    >
      <View style={styles.content}>
        {player ? (
          <TurnBanner
            player={player}
            accent={meta.accent}
            overline={isGroup ? t('group.reader') : undefined}
          />
        ) : null}
        {showModeChip || levelUp ? (
          <View style={styles.badges} aria-live="polite" testID="round-badges">
            {showModeChip ? <Chip label={`${mode.emoji} ${t(modeTitleKey(session.modeId))}`} color={meta.accent} /> : null}
            {levelUp ? (
              <Chip
                label={t('round.levelUp', { level: `${meta.emoji} ${t(meta.nameKey).toLocaleUpperCase()}` })}
                color={meta.accent}
              />
            ) : null}
          </View>
        ) : null}
        {exhausted ? (
          <ExhaustedCard
            level={session.level}
            deckSize={deck.length}
            onReshuffle={() => {
              feedback('level');
              reshuffle();
            }}
            onChangeLevel={() => setLevelSheetOpen(true)}
          />
        ) : awaitingChoice && choiceKinds && kindCounts ? (
          <>
            <ChoicePanel kinds={choiceKinds} remaining={kindCounts} onChoose={chooseCard} />
            {firstOfMode ? <FirstCardHint modeId={session.modeId} /> : null}
          </>
        ) : (
          <>
            <QuestionCard
              cardKey={cardKey}
              text={rest}
              lead={kindLabel ?? displayLead ?? undefined}
              level={session.level}
              categoryLabel={categoryLabel}
              footer={progress ? t('round.progress', progress) : t('game.remaining', { round, count: remaining })}
              accessibilityLabel={
                kindLabel
                  ? t('tod.cardA11y', { kind: kindLabel, name: player?.name ?? '', text: fullText })
                  : isGroup
                  ? t('group.cardA11y', { name: player?.name ?? '', statement: fullText })
                  : t('game.questionA11y', { name: player?.name ?? '', question: fullText })
              }
              compact={isGroup}
              style={isGroup && !wide ? undefined : styles.card}
            />
            {/* Below the card: the card itself stays in view on small phones. */}
            {firstOfMode ? <FirstCardHint modeId={session.modeId} /> : null}
            {question?.seconds ? (
              <ChallengeTimer seconds={question.seconds} accent={meta.accent} resetKey={cardKey} />
            ) : null}
            {group ? (
              <PlayerPicker
                title={t(group.copy.pickerTitle)}
                hint={t(group.copy.pickerHint)}
                players={players}
                selectedIds={selectedIds}
                onToggle={toggleMark}
                toggleLabel={(candidate) => t(group.copy.toggleLabel, { name: candidate.name })}
                counts={tallies}
                accent={meta.accent}
                accessory={
                  group.countdown ? (
                    <Countdown
                      label={t('mlt.countdown')}
                      hint={t('mlt.countdownHint')}
                      goLabel={t('mlt.countdownGo')}
                      accent={meta.accent}
                      resetKey={cardKey}
                    />
                  ) : null
                }
              />
            ) : null}
          </>
        )}
      </View>

      <LevelSheet
        visible={levelSheetOpen}
        current={session.level}
        modeId={session.modeId}
        mixed={isMixedRound(session.round)}
        getCount={(level) =>
          isMixedRound(session.round)
            ? session.round.modeIds
                .filter((id) => getGameMode(id).minPlayers <= players.length)
                .reduce((sum, id) => sum + getPlayableDeck(id, level, locale).length, 0)
            : deckFor(level).length
        }
        onClose={() => setLevelSheetOpen(false)}
        onSelect={(level) => {
          setLevelSheetOpen(false);
          feedback('level');
          changeLevel(level);
        }}
      />
      <ConfirmSheet
        visible={endSheetOpen}
        emoji="🌙"
        title={t('game.endTitle')}
        body={t('game.endBody')}
        confirmLabel={t('game.endConfirm')}
        cancelLabel={t('game.endCancel')}
        destructive
        onConfirm={finish}
        onCancel={() => setEndSheetOpen(false)}
        testID="end-sheet"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  content: { flex: 1, gap: spacing.xl, paddingTop: spacing.md },
  card: { flexGrow: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  secondaryRow: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
