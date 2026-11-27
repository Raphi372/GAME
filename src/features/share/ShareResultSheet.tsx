import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Sheet } from '@/components/ui';
import { SettingsGroup, SwitchRow } from '@/features/settings/SettingsRows';
import type { Summary } from '@/features/summary/summaryModel';
import { useLayout } from '@/hooks/useLayout';
import { useTranslation } from '@/i18n';
import type { GameResult } from '@/store';
import { colors, spacing } from '@/theme';

import { ResultShareCard, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './ResultShareCard';
import { shareResultImage } from './shareImage';

/** Space the sheet needs around its scroll area: gap above it, padding and buttons. */
const SHEET_CHROME = 180;
/** Room for the error line above the buttons – the scroll area gives it up while it shows. */
const ERROR_LINE = 56;
/** Space next to the preview inside the scroll area: title, text, switch and gaps. */
const PREVIEW_CHROME = 205;
/** The preview never gets smaller than this – on short phones the sheet scrolls instead. */
const MIN_PREVIEW_SCALE = 0.55;

interface ShareResultSheetProps {
  visible: boolean;
  onClose: () => void;
  result: GameResult;
  summary: Summary;
}

/**
 * Preview of the result picture with the choice to show names (off by default), and the
 * button that hands it to the system share menu.
 */
export function ShareResultSheet({ visible, onClose, result, summary }: ShareResultSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { contentWidth } = useLayout();
  const card = useRef<ViewInstance>(null);
  const busyRef = useRef(false);
  const [showNames, setShowNames] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // The card keeps its design size – so the picture is sharp – and the preview scales it
  // to the room left on screen.
  const room = height - insets.top - Math.max(insets.bottom, spacing.lg) - SHEET_CHROME;
  const roomWidth = Math.min(width, contentWidth) - 2 * spacing.xl;
  const scale = Math.min(
    1,
    Math.max(MIN_PREVIEW_SCALE, Math.min(roomWidth / SHARE_CARD_WIDTH, (room - PREVIEW_CHROME) / SHARE_CARD_HEIGHT)),
  );
  const scrollMax = room - (failed ? ERROR_LINE : 0);
  const previewWidth = Math.round(SHARE_CARD_WIDTH * scale);
  const previewHeight = Math.round(SHARE_CARD_HEIGHT * scale);

  const share = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await shareResultImage(card, t('share.dialogTitle'));
    } catch {
      setFailed(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} accent={summary.meta.accent} label={t('share.title')} testID="share-sheet">
      <ScrollView
        style={{ maxHeight: Math.max(scrollMax, previewHeight) }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.text}>
          <AppText variant="h2" role="heading">
            {t('share.title')}
          </AppText>
          <AppText color={colors.textSecondary}>{t('share.body')}</AppText>
        </View>

        <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
          <View
            style={[
              styles.scaled,
              {
                left: (previewWidth - SHARE_CARD_WIDTH) / 2,
                top: (previewHeight - SHARE_CARD_HEIGHT) / 2,
                transform: [{ scale }],
              },
            ]}
          >
            <ResultShareCard ref={card} result={result} summary={summary} showNames={showNames} />
          </View>
        </View>

        <SettingsGroup>
          <SwitchRow
            label={t('share.showNames')}
            hint={t('share.showNamesHint')}
            value={showNames}
            onValueChange={setShowNames}
            icon="people-outline"
            testID="share-show-names"
          />
        </SettingsGroup>
      </ScrollView>

      {failed ? (
        <AppText variant="caption" color={colors.danger} role="alert">
          {t('share.error')}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button
          label={busy ? t('share.busy') : t('share.send')}
          icon={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
          onPress={share}
          disabled={busy}
          gradient={summary.meta.gradient}
          size="md"
          testID="share-send"
        />
        <Button label={t('share.done')} variant="ghost" size="md" onPress={onClose} testID="share-close" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  text: { gap: spacing.xs },
  preview: { alignSelf: 'center' },
  scaled: { position: 'absolute', width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT },
  actions: { gap: spacing.xs },
});
