import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { feedback } from '@/services/feedback';
import { colors, fonts, radius, spacing } from '@/theme';

interface ChallengeTimerProps {
  seconds: number;
  accent: string;
  /** Changing the key (new card) stops and resets the timer. */
  resetKey: string;
}

type TimerState = { key: string; remaining: number | null; done: boolean };

/** Optional countdown for timed challenges ("20 Sekunden lang …"). */
export function ChallengeTimer({ seconds, accent, resetKey }: ChallengeTimerProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<TimerState>({ key: '', remaining: null, done: false });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = state.key === resetKey ? state : { key: resetKey, remaining: null, done: false };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  // Stop a running timer when the card changes or the screen unmounts.
  useEffect(() => stop, [resetKey]);

  const start = () => {
    stop();
    const key = resetKey;
    // Count against the clock, not the ticks: JS timers pause while the app is in the
    // background, the remaining time must still be right afterwards.
    const endsAt = Date.now() + seconds * 1000;
    let shown = seconds;
    setState({ key, remaining: shown, done: false });
    feedback('tap');
    timer.current = setInterval(() => {
      const remaining = Math.ceil((endsAt - Date.now()) / 1000);
      if (remaining > 0) {
        if (remaining !== shown) {
          shown = remaining;
          setState({ key, remaining, done: false });
        }
        return;
      }
      stop();
      feedback('level');
      setState({ key, remaining: null, done: true });
    }, 250);
  };

  if (current.remaining !== null) {
    const progress = current.remaining / seconds;
    return (
      <View style={styles.running} testID="challenge-timer">
        <AppText
          style={[styles.number, { color: accent }]}
          maxFontSizeMultiplier={1.2}
          aria-label={t('rc.timerRemaining', { seconds: current.remaining })}
        >
          {String(current.remaining)}
        </AppText>
        <View style={styles.track}>
          <View style={[styles.bar, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>
        <Button
          label={t('rc.timerStop')}
          variant="ghost"
          size="sm"
          feedbackEvent={null}
          onPress={() => {
            stop();
            setState({ key: resetKey, remaining: null, done: false });
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.idle}>
      {current.done ? (
        <AppText variant="h3" align="center" color={accent} role="alert">
          {t('rc.timerDone')}
        </AppText>
      ) : null}
      <Button
        label={t('rc.timerStart', { seconds })}
        icon="timer-outline"
        variant="secondary"
        size="sm"
        hint={t('rc.timerHint')}
        feedbackEvent={null}
        onPress={start}
        testID="challenge-timer-start"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  idle: { gap: spacing.sm },
  running: { alignItems: 'center', gap: spacing.sm },
  number: { fontFamily: fonts.displayBlack, fontSize: 40, lineHeight: 48 },
  track: {
    width: '100%',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.pill },
});
