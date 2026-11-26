import { render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, type TextStyle } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { QuestionCard } from '@/features/gameplay/components/QuestionCard';
import {
  COMPACT_LAYOUT,
  getLayout,
  maxContentWidth,
  scaleTextStyle,
  typography,
  WIDE_LAYOUT,
  WIDE_LAYOUT_SCALE,
  wideContentWidth,
} from '@/theme';

/** Window sizes in points. */
const WINDOWS = {
  'small phone': [320, 568],
  iPhone: [390, 844],
  'iPhone Pro Max': [440, 956],
  'phone in landscape (web)': [844, 390],
  'iPad split screen': [507, 1032],
  'iPad mini': [744, 1133],
  'iPad 13″ portrait': [1032, 1376],
  'iPad 13″ landscape': [1376, 1032],
  'desktop browser': [1280, 720],
} as const;

describe('layout classes', () => {
  it.each([
    ['small phone', false],
    ['iPhone', false],
    ['iPhone Pro Max', false],
    ['phone in landscape (web)', false],
    ['iPad split screen', false],
    ['iPad mini', true],
    ['iPad 13″ portrait', true],
    ['iPad 13″ landscape', true],
    ['desktop browser', true],
  ] as const)('%s → wide: %s', (name, wide) => {
    const [width, height] = WINDOWS[name];
    expect(getLayout(width, height)).toBe(wide ? WIDE_LAYOUT : COMPACT_LAYOUT);
  });

  it('phones keep the original column and sizes', () => {
    expect(COMPACT_LAYOUT).toEqual({ wide: false, contentWidth: maxContentWidth, scale: 1 });
    expect(WIDE_LAYOUT).toEqual({ wide: true, contentWidth: wideContentWidth, scale: WIDE_LAYOUT_SCALE });
  });

  it('scales font size, line height and letter spacing, nothing else', () => {
    const style: TextStyle = { fontSize: 15, lineHeight: 22, letterSpacing: 1.6, color: '#fff', fontFamily: 'X' };
    expect(scaleTextStyle(style, 1.2)).toEqual({
      fontSize: 18,
      lineHeight: 26,
      letterSpacing: 1.9,
      color: '#fff',
      fontFamily: 'X',
    });
    expect(scaleTextStyle(style, 1)).toBe(style);
    expect(scaleTextStyle({ color: '#fff' }, 1.2)).toEqual({ color: '#fff' });
  });
});

describe('components follow the window size', () => {
  const original = Dimensions.get('window');

  function setWindow(width: number, height: number) {
    Dimensions.set({ window: { ...original, width, height }, screen: { ...original, width, height } });
  }

  afterEach(() => setWindow(original.width, original.height));

  function fontSizeOf(text: string): number | undefined {
    return (StyleSheet.flatten(screen.getByText(text).props.style) as TextStyle).fontSize;
  }

  it('keeps phone sizes on phones', async () => {
    setWindow(...WINDOWS.iPhone);
    await render(
      <>
        <AppText>Body</AppText>
        <AppText variant="h1">Heading</AppText>
        <AppText style={{ fontSize: 34 }}>Custom</AppText>
      </>,
    );
    expect(fontSizeOf('Body')).toBe(typography.body.fontSize);
    expect(fontSizeOf('Heading')).toBe(typography.h1.fontSize);
    expect(fontSizeOf('Custom')).toBe(34);
  });

  it('scales every text on tablets – also sizes passed in style', async () => {
    setWindow(...WINDOWS['iPad 13″ portrait']);
    await render(
      <>
        <AppText>Body</AppText>
        <AppText variant="h1">Heading</AppText>
        <AppText style={{ fontSize: 34 }}>Custom</AppText>
      </>,
    );
    expect(fontSizeOf('Body')).toBe(Math.round(typography.body.fontSize * WIDE_LAYOUT_SCALE));
    expect(fontSizeOf('Heading')).toBe(Math.round(typography.h1.fontSize * WIDE_LAYOUT_SCALE));
    expect(fontSizeOf('Custom')).toBe(Math.round(34 * WIDE_LAYOUT_SCALE));
  });

  it('buttons grow with the text on tablets', async () => {
    const heightOf = async () => {
      await render(<Button label="Los" onPress={() => undefined} testID="button" />);
      const content = screen.getByText('LOS').parent;
      return (StyleSheet.flatten(content?.props.style) as { height?: number }).height;
    };
    setWindow(...WINDOWS.iPhone);
    const phone = await heightOf();
    setWindow(...WINDOWS['iPad mini']);
    const tablet = await heightOf();
    expect(phone).toBe(64);
    expect(tablet).toBe(Math.round(64 * WIDE_LAYOUT_SCALE));
  });

  it('the question card uses big text on tablets', async () => {
    const card = (
      <QuestionCard
        cardKey="1"
        text="Kurze Frage?"
        level="mild"
        categoryLabel="Dating"
        footer="Runde 1"
        accessibilityLabel="Kurze Frage?"
      />
    );
    setWindow(...WINDOWS.iPhone);
    await render(card);
    expect(fontSizeOf('Kurze Frage?')).toBe(26);
    setWindow(...WINDOWS['iPad 13″ portrait']);
    await render(card);
    expect(fontSizeOf('Kurze Frage?')).toBe(36);
  });
});
