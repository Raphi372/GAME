import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Header, Screen } from '@/components/ui';
import {
  DEFAULT_MODE_ID,
  getGameMode,
  isGameModeId,
  MAX_PLAYERS,
} from '@/features/game-modes/registry';
import { AddPlayerForm } from '@/features/players/components/AddPlayerForm';
import { PlayerRow } from '@/features/players/components/PlayerRow';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { useGameStore } from '@/store';
import { colors, spacing } from '@/theme';

export default function PlayersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string; from?: string }>();
  const fromGame = params.from === 'game';

  const players = useGameStore((state) => state.players);
  const session = useGameStore((state) => state.session);
  const addPlayer = useGameStore((state) => state.addPlayer);
  const renamePlayer = useGameStore((state) => state.renamePlayer);
  const removePlayer = useGameStore((state) => state.removePlayer);

  const modeId = fromGame && session ? session.modeId : isGameModeId(params.mode) ? params.mode : DEFAULT_MODE_ID;
  const mode = getGameMode(modeId);
  const missing = Math.max(0, mode.minPlayers - players.length);
  const removeLocked = fromGame && session !== null && players.length <= mode.minPlayers;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        header={
          <Header
            title={t('players.title')}
            subtitle={t('players.subtitle', { min: mode.minPlayers, max: MAX_PLAYERS })}
          />
        }
        footer={
          <>
            <AppText variant="caption" color={missing > 0 ? colors.accent : colors.textMuted} align="center">
              {missing > 0
                ? t('players.needMore', { count: missing })
                : t('players.count', { count: players.length, max: MAX_PLAYERS })}
            </AppText>
            {fromGame ? (
              <Button label={t('players.backToGame')} icon="play" onPress={() => router.back()} />
            ) : (
              <Button
                label={t('players.continue')}
                icon="arrow-forward"
                disabled={missing > 0}
                onPress={() => router.push({ pathname: '/level', params: { mode: modeId } })}
                testID="players-continue"
              />
            )}
          </>
        }
      >
        <AddPlayerForm onAdd={addPlayer} disabled={players.length >= MAX_PLAYERS} />
        <View style={styles.list}>
          {players.length === 0 ? (
            <AppText variant="body" color={colors.textMuted} align="center" style={styles.empty}>
              {t('players.empty')}
            </AppText>
          ) : (
            players.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                onRename={(name) => renamePlayer(player.id, name)}
                onRemove={() => {
                  if (removePlayer(player.id)) feedback('pass');
                }}
                removeDisabled={removeLocked}
                removeDisabledHint={t('players.removeLocked', { min: mode.minPlayers })}
              />
            ))
          )}
        </View>
        <AppText variant="caption" color={colors.textMuted} align="center" style={styles.note}>
          {removeLocked ? t('players.removeLocked', { min: mode.minPlayers }) : t('players.localNote')}
        </AppText>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { marginTop: spacing.xl, gap: spacing.sm },
  empty: { paddingVertical: spacing.xxxl },
  note: { marginTop: spacing.xl },
});
