import { StyleSheet, View } from 'react-native';

import { AppText, IconButton, Surface } from '@/components/ui';
import { OTHER_PLAYER_PLACEHOLDER } from '@/features/question-decks/templates';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme';

import type { CustomCard } from '../model';

/** Shows "{other}" as a readable token instead of the raw placeholder. */
export function useReadableCardText() {
  const { t } = useTranslation();
  return (text: string) => text.split(OTHER_PLAYER_PLACEHOLDER).join(`[${t('custom.playerToken')}]`);
}

interface CustomCardRowProps {
  card: CustomCard;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomCardRow({ card, onEdit, onDelete }: CustomCardRowProps) {
  const { t } = useTranslation();
  const readable = useReadableCardText();
  const text = readable(card.text);
  const meta = [
    card.kind ? t(`tod.${card.kind}`) : null,
    card.seconds !== undefined ? t('custom.timerSeconds', { seconds: card.seconds }) : null,
  ].filter(Boolean);

  return (
    <Surface style={styles.row} testID={`custom-card-${card.id}`}>
      <View style={styles.text}>
        {meta.length > 0 ? (
          <AppText variant="overline" color={colors.lilacOrText}>
            {meta.join(' · ')}
          </AppText>
        ) : null}
        <AppText variant="body">{text}</AppText>
      </View>
      <View style={styles.actions}>
        <IconButton icon="create-outline" label={t('custom.editA11y', { text })} onPress={onEdit} />
        <IconButton icon="trash-outline" label={t('custom.deleteA11y', { text })} onPress={onDelete} tone="danger" />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
