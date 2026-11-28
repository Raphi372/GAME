import { renderQuestionText, requiresTargetPlayer } from '@/features/question-decks/templates';
import { translate } from '@/i18n';
import { de } from '@/i18n/de';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';

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
    expect(translate('es', 'players.count', { count: 3, max: 20 })).toBe('3 de 20 jugadores');
  });

  it('keeps unknown placeholders', () => {
    expect(translate('de', 'players.count', { count: 1 })).toBe('1 von {max} Spielern');
  });

  it.each([
    ['English', en],
    ['Spanish', es],
  ])('provides every German key in %s, with the same placeholders', (_name, dictionary) => {
    const missing = Object.keys(de).filter((key) => !dictionary[key as keyof typeof de]);
    expect(missing).toEqual([]);
    const params = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort().join(',');
    const mismatched = (Object.keys(de) as (keyof typeof de)[]).filter(
      (key) => params(de[key]) !== params(dictionary[key]),
    );
    expect(mismatched).toEqual([]);
  });

  it('writes Spanish questions and exclamations with opening marks and without vosotros/ustedes', () => {
    // The level taglines ("Are you ready?") stay English in every language, like the claim.
    const brand = new Set([de['level.mild.tagline'], de['level.hot.tagline'], de['level.extreme.tagline']]);
    for (const text of Object.values(es).filter((value) => !brand.has(value))) {
      expect(text.split('¿').length).toBe(text.split('?').length);
      expect(text.split('¡').length).toBe(text.split('!').length);
      expect(text).not.toMatch(/(?<![\p{L}])(vosotr[oa]s|vuestr[oa]s?|ustedes|os)(?![\p{L}])|\p{L}(áis|éis)(?![\p{L}])/iu);
    }
  });

  it.each([
    ['German', de],
    ['English', en],
    ['Spanish', es],
  ])('names the way into the settings in %s exactly like the settings screen does', (_name, dictionary) => {
    const texts: Record<string, string> = dictionary;
    const labels = Object.values(texts).filter((label) => label.length > 2);
    // "Einstellungen → Ausgeblendete Karten …": what follows the arrow must be a real label.
    const paths = Object.values(texts).flatMap((text) => text.split(`${texts['settings.title']} → `).slice(1));
    expect(paths.length).toBeGreaterThan(2);
    for (const rest of paths) expect(labels.some((label) => rest.startsWith(label))).toBe(true);
  });

  it('contains the three required game buttons', () => {
    expect(de['game.next']).toBe('Nächste Frage');
    expect(de['game.skip']).toBe('Überspringen');
    expect(de['game.pass']).toBe('Ich passe');
  });
});
