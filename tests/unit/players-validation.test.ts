import { MAX_PLAYERS } from '@/features/game-modes/registry';
import {
  avatarColor,
  initials,
  MAX_NAME_LENGTH,
  nextColorIndex,
  normalizeName,
  validatePlayerName,
} from '@/features/players/validation';

import { makePlayers } from '../helpers/fixtures';

describe('player name validation', () => {
  const players = [
    { id: 'a', name: 'Lena', colorIndex: 0 },
    { id: 'b', name: 'Max', colorIndex: 1 },
  ];

  it('accepts and normalises a valid name', () => {
    expect(validatePlayerName('  Sophie   Marie ', players)).toEqual({ ok: true, name: 'Sophie Marie' });
    expect(normalizeName('  a   b ')).toBe('a b');
  });

  it('rejects empty names', () => {
    expect(validatePlayerName('   ', players)).toEqual({ ok: false, error: 'empty' });
  });

  it('rejects names that are too long', () => {
    expect(validatePlayerName('x'.repeat(MAX_NAME_LENGTH + 1), players)).toEqual({
      ok: false,
      error: 'tooLong',
    });
    expect(validatePlayerName('x'.repeat(MAX_NAME_LENGTH), players).ok).toBe(true);
  });

  it('rejects duplicates case-insensitively', () => {
    expect(validatePlayerName('lena', players)).toEqual({ ok: false, error: 'duplicate' });
  });

  it('allows keeping the own name when renaming', () => {
    expect(validatePlayerName('LENA', players, 'a')).toEqual({ ok: true, name: 'LENA' });
    expect(validatePlayerName('Max', players, 'a')).toEqual({ ok: false, error: 'duplicate' });
  });

  it(`limits the group to ${MAX_PLAYERS} players`, () => {
    const full = makePlayers(MAX_PLAYERS);
    expect(validatePlayerName('Neu', full)).toEqual({ ok: false, error: 'limitReached' });
    // Renaming is still possible with a full group.
    expect(validatePlayerName('Neu', full, 'p1').ok).toBe(true);
  });

  it('creates initials and colours for avatars', () => {
    expect(initials('lena marie')).toBe('LM');
    expect(initials('Ölaf')).toBe('Ö');
    expect(initials('')).toBe('?');
    expect(avatarColor(0)).toMatch(/^#/);
    expect(avatarColor(-3)).toMatch(/^#/);
    expect(nextColorIndex(players)).toBe(2);
  });
});
