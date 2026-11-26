import { Platform } from 'react-native';

import { spaceKeyPress } from '@/components/ui/keyboard';
import { AVATAR_COLORS } from '@/features/players/validation';
import { LEVELS } from '@/features/levels/levels';
import { blend, brandGradient, colors, contrastRatio, readableOnDark, readableWithWhite } from '@/theme';

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

  it('makes avatar initials readable on their tinted circle', () => {
    for (const color of AVATAR_COLORS) {
      const background = blend(color, colors.surfaceRaised, 0x2e / 255);
      expect(contrastRatio(readableOnDark(color, background), background)).toBeGreaterThanOrEqual(4.5);
    }
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
});
