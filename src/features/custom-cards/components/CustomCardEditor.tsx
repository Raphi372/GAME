import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Sheet } from '@/components/ui';
import { modeTitleKey } from '@/features/game-modes/labels';
import type { GameModeId } from '@/features/game-modes/registry';
import { LEVELS } from '@/features/levels/levels';
import { OTHER_PLAYER_PLACEHOLDER } from '@/features/question-decks/templates';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation, type TranslateFn } from '@/i18n';
import { feedback } from '@/services/feedback';
import { useCustomCardsStore } from '@/store';
import { colors, fonts, radius, scaleTextStyle, spacing } from '@/theme';
import { CARD_KINDS, type CardKind, type SpicyLevel } from '@/types';

import {
  allowsPlayerPlaceholder,
  allowsTimer,
  bodyOf,
  CUSTOM_CARD_MAX_LENGTH,
  CUSTOM_TIMER_OPTIONS,
  MAX_CUSTOM_CARDS,
  needsKind,
  requiredLead,
  type CustomCard,
  type CustomCardError,
} from '../model';
import { ChoiceChip } from './ChoiceChip';

const INPUT_TEXT = { fontSize: 16, lineHeight: 22 };

export function customCardErrorMessage(t: TranslateFn, error: CustomCardError): string {
  switch (error) {
    case 'tooLong':
      return t('custom.error.tooLong', { max: CUSTOM_CARD_MAX_LENGTH });
    case 'limit':
      return t('custom.error.limit', { max: MAX_CUSTOM_CARDS });
    default:
      return t(`custom.error.${error}`);
  }
}

interface CustomCardEditorProps {
  modeId: GameModeId;
  level: SpicyLevel;
  /** The card being edited; a new card is created when missing. */
  card?: CustomCard;
  onClose: () => void;
}

/** Bottom sheet to write or edit one card. Mounted only while open, so its state starts fresh. */
export function CustomCardEditor({ modeId, level, card, onClose }: CustomCardEditorProps) {
  const { t, locale } = useTranslation();
  const addCard = useCustomCardsStore((state) => state.addCard);
  const updateCard = useCustomCardsStore((state) => state.updateCard);
  const [body, setBody] = useState(() => (card ? bodyOf(card) : ''));
  const [kind, setKind] = useState<CardKind | undefined>(() =>
    needsKind(modeId) ? (card?.kind ?? 'truth') : undefined,
  );
  const [seconds, setSeconds] = useState<number | undefined>(card?.seconds);
  const [error, setError] = useState<string | null>(null);
  const { scale } = useLayout();
  const meta = LEVELS[level];
  const lead = requiredLead(modeId, locale);

  const save = () => {
    const draft = { modeId, level, body, kind, seconds };
    const result = card ? updateCard(card.id, draft) : addCard(draft);
    if (result.ok) {
      feedback('select');
      onClose();
    } else {
      feedback('warning');
      setError(customCardErrorMessage(t, result.error));
    }
  };

  const insertPlayer = () => {
    setBody((current) => `${current.trimEnd()} ${OTHER_PLAYER_PLACEHOLDER} `.trimStart());
    setError(null);
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      accent={meta.accent}
      label={t(card ? 'custom.editorEdit' : 'custom.editorNew')}
      testID="custom-card-editor"
    >
      <View style={styles.titles}>
        <AppText variant="h3" role="heading">
          {t(card ? 'custom.editorEdit' : 'custom.editorNew')}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {`${t(modeTitleKey(modeId))} · ${meta.emoji} ${t(meta.nameKey)}`}
        </AppText>
      </View>

      <View style={styles.field}>
        {lead ? (
          <AppText variant="overline" color={meta.accent}>
            {`${lead} …`}
          </AppText>
        ) : null}
        <TextInput
          value={body}
          onChangeText={(value) => {
            setBody(value);
            if (error) setError(null);
          }}
          multiline
          placeholder={t('custom.inputPlaceholder')}
          placeholderTextColor={colors.textMuted}
          aria-label={t('custom.inputLabel')}
          maxLength={CUSTOM_CARD_MAX_LENGTH + 20}
          selectionColor={colors.accent}
          style={[styles.input, scaleTextStyle(INPUT_TEXT, scale), error ? styles.inputError : null]}
          maxFontSizeMultiplier={1.4}
          testID="custom-card-input"
        />
        {allowsPlayerPlaceholder(modeId) ? (
          <Button
            label={t('custom.insertPlayer')}
            hint={t('custom.insertPlayerHint')}
            icon="person-add-outline"
            variant="secondary"
            size="sm"
            onPress={insertPlayer}
            style={styles.insert}
          />
        ) : null}
      </View>

      {needsKind(modeId) ? (
        <View style={styles.field} role="radiogroup" aria-label={t('custom.kindLabel')}>
          <AppText variant="overline" color={colors.textMuted}>
            {t('custom.kindLabel')}
          </AppText>
          <View style={styles.chips}>
            {CARD_KINDS.map((option) => (
              <ChoiceChip
                key={option}
                label={t(`tod.${option}`)}
                selected={kind === option}
                onPress={() => setKind(option)}
                accent={meta.accent}
              />
            ))}
          </View>
        </View>
      ) : null}

      {allowsTimer(modeId) ? (
        <View style={styles.field} role="radiogroup" aria-label={t('custom.timerLabel')}>
          <AppText variant="overline" color={colors.textMuted}>
            {t('custom.timerLabel')}
          </AppText>
          <View style={styles.chips}>
            {[undefined, ...CUSTOM_TIMER_OPTIONS].map((option) => (
              <ChoiceChip
                key={option ?? 'none'}
                label={option === undefined ? t('custom.timerNone') : t('custom.timerSeconds', { seconds: option })}
                a11yLabel={
                  option === undefined
                    ? `${t('custom.timerLabel')}: ${t('custom.timerNone')}`
                    : `${t('custom.timerLabel')}: ${t('custom.timerSeconds', { seconds: option })}`
                }
                selected={seconds === option}
                onPress={() => setSeconds(option)}
                accent={meta.accent}
              />
            ))}
          </View>
        </View>
      ) : null}

      {error ? (
        <AppText variant="caption" color={colors.danger} role="alert">
          {error}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('custom.save')} icon="checkmark" onPress={save} gradient={meta.gradient} />
        <Button label={t('custom.cancel')} variant="ghost" size="sm" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  titles: { gap: spacing.xxs },
  field: { gap: spacing.sm },
  input: {
    minHeight: 96,
    maxHeight: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontFamily: fonts.body,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: colors.danger },
  insert: { alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { gap: spacing.xs },
});
