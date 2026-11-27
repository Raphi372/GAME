import { render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet, Text, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, Chip, Screen } from '@/components/ui';
import { AVATAR_TEXT_CONTRAST } from '@/components/ui/Avatar';
import { spaceKeyPress } from '@/components/ui/keyboard';
import { ModeCard } from '@/features/game-modes/ModeCard';
import { getGameMode } from '@/features/game-modes/registry';
import { AVATAR_COLORS } from '@/features/players/validation';
import { LinkRow, SwitchRow } from '@/features/settings/SettingsRows';
import { LEVELS } from '@/features/levels/levels';
import { blend, brandGradient, colors, contrastRatio, readableOnDark, readableWithWhite } from '@/theme';

// Tests below switch Platform.OS to 'web' – put it back after every test.
afterEach(() => jest.restoreAllMocks());

describe('colour contrast', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('keeps white button labels readable on every gradient (WCAG AA 4.5:1)', () => {
    const gradients = [brandGradient, ...Object.values(LEVELS).map((level) => level.gradient)];
    for (const gradient of gradients) {
      for (const stop of gradient) {
        expect(contrastRatio('#FFFFFF', readableWithWhite(stop))).toBeGreaterThanOrEqual(4.5);
      }
    }
    // Colours that are dark enough stay exactly as designed.
    expect(readableWithWhite('#7C3AED')).toBe('#7C3AED');
  });

  it('only darkens as much as needed and keeps the hue', () => {
    const darker = readableWithWhite('#FF3D9A');
    expect(contrastRatio('#FFFFFF', darker)).toBeLessThan(5.2);
    expect(darker).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('makes avatar initials readable on their tinted circle – also on accent-tinted chips', () => {
    const tint = 0x2e / 255;
    for (const color of AVATAR_COLORS) {
      const initials = readableOnDark(color, blend(color, colors.surfaceRaised, tint), AVATAR_TEXT_CONTRAST);
      const parents = [
        colors.background,
        colors.surface,
        colors.surfaceRaised,
        // Selected player chips are tinted with the level colour.
        ...Object.values(LEVELS).flatMap((level) =>
          [colors.background, colors.surface].map((surface) => blend(level.accent, surface, tint)),
        ),
      ];
      for (const parent of parents) {
        expect(contrastRatio(initials, blend(color, parent, tint))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('only accepts #RRGGBB colours', () => {
    expect(() => contrastRatio('rgba(255, 255, 255, 0.08)', '#000000')).toThrow(TypeError);
    expect(() => blend('#FFF', '#000000', 0.5)).toThrow(TypeError);
    // The "make it readable" helpers leave unsupported input untouched instead of guessing.
    expect(readableWithWhite('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
    expect(readableOnDark('#B14DFF', colors.border)).toBe('#B14DFF');
  });

  it('renders primary button labels in pure white (the gradient is darkened for white)', async () => {
    await render(<Button label="Los" onPress={() => undefined} />);
    const label = screen.getByText('LOS');
    expect(label).toHaveStyle({ color: '#FFFFFF' });
  });

  it('keeps the main text colours readable on the dark surfaces', () => {
    for (const text of [colors.text, colors.textSecondary, colors.textMuted, colors.accent, colors.danger]) {
      for (const surface of [colors.background, colors.surface, colors.surfaceRaised]) {
        expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('space bar on radios, switches and checkboxes (web)', () => {
  it('presses the control on space only, and only on the web', () => {
    const onPress = jest.fn();
    expect(spaceKeyPress(onPress)).toEqual({});

    jest.replaceProperty(Platform, 'OS', 'web');
    const { onKeyDown } = spaceKeyPress(onPress) as {
      onKeyDown: (event: { key: string; preventDefault: () => void }) => void;
    };
    const preventDefault = jest.fn();
    onKeyDown({ key: 'a', preventDefault });
    expect(onPress).not.toHaveBeenCalled();
    onKeyDown({ key: ' ', preventDefault });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('acts once per key press even when the space bar is held', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onPress = jest.fn();
    const { onKeyDown } = spaceKeyPress(onPress) as {
      onKeyDown: (event: { key: string; repeat?: boolean; preventDefault: () => void }) => void;
    };
    const preventDefault = jest.fn();
    onKeyDown({ key: ' ', preventDefault });
    onKeyDown({ key: ' ', repeat: true, preventDefault });
    onKeyDown({ key: ' ', repeat: true, preventDefault });
    expect(onPress).toHaveBeenCalledTimes(1);
    // The page must not scroll while the key is held either.
    expect(preventDefault).toHaveBeenCalledTimes(3);
  });
});

type HostNode = { type: string; props: Record<string, unknown>; children: (HostNode | string)[] | null };

/** Finds the native scroll view in the rendered host tree. */
function findScrollView(node: HostNode | HostNode[] | null): HostNode | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findScrollView(child);
      if (found) return found;
    }
    return null;
  }
  if (node.type === 'RCTScrollView') return node;
  return findScrollView((node.children ?? []).filter((child): child is HostNode => typeof child !== 'string'));
}

describe('keyboard-scrollable text pages', () => {
  it('makes the scroll area focusable on the web only', async () => {
    const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
    const page = () => (
      <SafeAreaProvider initialMetrics={metrics}>
        <Screen focusableScroll>
          <Text>Datenschutz</Text>
        </Screen>
      </SafeAreaProvider>
    );
    await render(page());
    expect(findScrollView(screen.toJSON() as HostNode | HostNode[] | null)?.props.focusable).toBe(false);
    jest.replaceProperty(Platform, 'OS', 'web');
    await screen.rerender(page());
    expect(findScrollView(screen.toJSON() as HostNode | HostNode[] | null)?.props.focusable).toBe(true);
  });
});

describe('hints of setting rows', () => {
  const rows = () => (
    <>
      <SwitchRow
        label="Langsam steigern"
        hint="Geht nur mit fester Rundenlänge."
        value={false}
        onValueChange={() => undefined}
        icon="trending-up-outline"
        disabled
      />
      <LinkRow label="Alle lokalen Daten löschen" hint="Alles wird entfernt." icon="trash-outline" onPress={() => undefined} />
    </>
  );

  it('describe the control on the web (the visible hint is linked via aria-describedby)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await render(rows());
    const switchHint = screen.getByText('Geht nur mit fester Rundenlänge.');
    const linkHint = screen.getByText('Alles wird entfernt.');
    expect(switchHint.props.nativeID).toBeTruthy();
    expect(linkHint.props.nativeID).not.toBe(switchHint.props.nativeID);
    expect(screen.getByRole('switch', { name: 'Langsam steigern' }).props['aria-describedby']).toBe(
      switchHint.props.nativeID,
    );
    expect(screen.getByRole('button', { name: 'Alle lokalen Daten löschen' }).props['aria-describedby']).toBe(
      linkHint.props.nativeID,
    );
  });

  it('stay an accessibility hint on iOS and Android', async () => {
    await render(rows());
    const control = screen.getByRole('switch', { name: 'Langsam steigern' });
    expect(control.props['aria-describedby']).toBeUndefined();
    expect(control.props.accessibilityHint).toBe('Geht nur mit fester Rundenlänge.');
  });
});

describe('large system text', () => {
  it('never cuts off the descriptions of the game modes', async () => {
    await render(<ModeCard mode={getGameMode('spicy-questions')} questionCount={330} onPress={() => undefined} />);
    expect(screen.getByText(/Die Fragenrunde in drei Hitzestufen/).props.numberOfLines).toBeUndefined();
  });

  it('keeps chips inside their row, so long labels wrap instead of running off screen', async () => {
    await render(<Chip label="Jetzt wird’s heißer: 🌶️🌶️ HOT" />);
    const chip = screen.getByText('Jetzt wird’s heißer: 🌶️🌶️ HOT').parent;
    expect((StyleSheet.flatten(chip?.props.style) as ViewStyle).maxWidth).toBe('100%');
  });
});

