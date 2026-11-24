import { renderQuestionText, requiresTargetPlayer } from '@/features/question-decks/templates';
import { translate } from '@/i18n';
import { de } from '@/i18n/de';
import { en } from '@/i18n/en';

describe('question templates', () => {
  it('replaces {other} with the target player name', () => {
    expect(requiresTargetPlayer('Was magst du an {other}?')).toBe(true);
    expect(renderQuestionText('Was magst du an {other}?', { targetPlayerName: 'Max', fallbackTargetName: 'x' })).toBe(
      'Was magst du an Max?',
    );
  });

  it('uses a fallback when no target is available', () => {
    expect(
      renderQuestionText('{other} und {other}', { targetPlayerName: null, fallbackTargetName: 'jemand' }),
    ).toBe('jemand und jemand');
  });

  it('leaves texts without placeholders untouched', () => {
    expect(renderQuestionText('Normale Frage?', { fallbackTargetName: 'x' })).toBe('Normale Frage?');
  });
});

describe('translations', () => {
  it('uses German by default and interpolates parameters', () => {
    expect(translate('de', 'players.count', { count: 3, max: 20 })).toBe('3 von 20 Spielern');
    expect(translate('en', 'players.count', { count: 3, max: 20 })).toBe('3 of 20 players');
  });

  it('keeps unknown placeholders', () => {
    expect(translate('de', 'players.count', { count: 1 })).toBe('1 von {max} Spielern');
  });

  it('provides every German key in English (prepared translation)', () => {
    const missing = Object.keys(de).filter((key) => !(key in en) || !en[key as keyof typeof en]);
    expect(missing).toEqual([]);
  });

  it('contains the three required game buttons', () => {
    expect(de['game.next']).toBe('Nächste Frage');
    expect(de['game.skip']).toBe('Überspringen');
    expect(de['game.pass']).toBe('Ich passe');
  });
});
