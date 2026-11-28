import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText, Button, IconButton, Logo, Screen, SectionTitle } from '@/components/ui';
import { FEATURES } from '@/config/features';
import { ModeCard, ModeTile } from '@/features/game-modes/ModeCard';
import { listGameModes, MIX_EMOJI, MIX_PARAM, type GameModeId } from '@/features/game-modes/registry';
import { isMixedRound } from '@/features/gameplay/engine/round';
import { ResumeCard } from '@/features/gameplay/components/ResumeCard';
import { useMotion } from '@/hooks/useMotion';
import { useTranslation } from '@/i18n';
import { getBuiltInDeck, useGameStore, useHiddenCardsStore } from '@/store';
import { colors, NATIVE_DRIVER, spacing } from '@/theme';
import { SPICY_LEVELS } from '@/types';

function useBreathing(enabled: boolean) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!enabled) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(value, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, value]);
  return value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { enabled: motion } = useMotion();
  const session = useGameStore((state) => state.session);
  // Card totals leave out hidden cards, like the level screen – re-render when they change.
  useHiddenCardsStore((state) => state.ids);
  const playerCount = useGameStore((state) => state.players.length);
  const scale = useBreathing(motion);

  const modes = useMemo(() => listGameModes(), []);
  const totalQuestions = (modeId: GameModeId) =>
    SPICY_LEVELS.reduce((sum, level) => sum + getBuiltInDeck(modeId, level, locale).length, 0);
  const allCards = modes
    .filter((mode) => mode.status === 'available')
    .reduce((sum, mode) => sum + totalQuestions(mode.id), 0);

  const startFlow = (modeId: GameModeId) =>
    router.push({ pathname: '/players', params: { mode: modeId } });

  return (
    <Screen
      header={
        <View style={styles.topBar}>
          {FEATURES.premium ? (
            <Button
              label={t('home.premium')}
              icon="diamond-outline"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/premium')}
              style={styles.premium}
            />
          ) : (
            <View />
          )}
          <IconButton icon="settings-outline" label={t('home.settings')} onPress={() => router.push('/settings')} />
        </View>
      }
    >
      <View style={styles.hero}>
        <Logo size="lg" />
      </View>

      <Animated.View style={[styles.play, { transform: [{ scale }] }]}>
        <Button
          label={t('home.play')}
          icon="flame"
          feedbackEvent="level"
          hint={t('home.playHint')}
          onPress={() => startFlow('spicy-questions')}
          testID="play-now"
        />
      </Animated.View>
      <AppText variant="caption" color={colors.textMuted} align="center">
        {t('home.playHint')}
      </AppText>

      {session ? (
        <View style={styles.resume}>
          <ResumeCard
            modeId={session.modeId}
            mixed={isMixedRound(session.round)}
            level={session.level}
            playerCount={playerCount}
            round={session.turnsCompleted + 1}
            onResume={() => router.push('/game')}
          />
        </View>
      ) : null}

      <SectionTitle>{t('home.modesTitle')}</SectionTitle>
      <View style={styles.modes}>
        {modes.map((mode) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            questionCount={mode.status === 'available' ? totalQuestions(mode.id) : undefined}
            onPress={() => startFlow(mode.id)}
          />
        ))}
        <ModeTile
          emoji={MIX_EMOJI}
          title={t('mix.title')}
          tagline={t('mix.tagline')}
          detail={t('mode.unit.cards', { count: allCards })}
          onPress={() => router.push({ pathname: '/players', params: { mode: MIX_PARAM } })}
          testID="mode-mix"
        />
      </View>

      {FEATURES.premium ? (
        <Button
          label={t('home.customCards')}
          hint={t('home.customCardsHint')}
          icon="create-outline"
          variant="secondary"
          size="md"
          onPress={() => router.push('/custom-cards')}
          style={styles.custom}
          testID="home-custom-cards"
        />
      ) : null}

      <AppText variant="caption" color={colors.textMuted} align="center" style={styles.footer}>
        {t('home.footer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  premium: { alignSelf: 'flex-start' },
  hero: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  play: { marginBottom: spacing.sm },
  resume: { marginTop: spacing.xl },
  modes: { gap: spacing.md },
  custom: { marginTop: spacing.lg },
  footer: { marginTop: spacing.xxl },
});
