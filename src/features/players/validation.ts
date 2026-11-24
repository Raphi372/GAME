import { MAX_PLAYERS } from '@/features/game-modes/registry';
import type { Player } from '@/types';

export const MAX_NAME_LENGTH = 20;

export type PlayerNameError = 'empty' | 'tooLong' | 'duplicate' | 'limitReached';

export type ValidationResult = { ok: true; name: string } | { ok: false; error: PlayerNameError };

/** Trims and collapses whitespace. */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Validates a player name.
 * @param excludeId id of the player that is being renamed (so its own name is no duplicate).
 */
export function validatePlayerName(
  raw: string,
  players: readonly Player[],
  excludeId?: string,
): ValidationResult {
  const name = normalizeName(raw);
  if (name.length === 0) return { ok: false, error: 'empty' };
  if ([...name].length > MAX_NAME_LENGTH) return { ok: false, error: 'tooLong' };

  const lower = name.toLocaleLowerCase('de-DE');
  const duplicate = players.some(
    (player) => player.id !== excludeId && player.name.toLocaleLowerCase('de-DE') === lower,
  );
  if (duplicate) return { ok: false, error: 'duplicate' };

  if (excludeId === undefined && players.length >= MAX_PLAYERS) {
    return { ok: false, error: 'limitReached' };
  }
  return { ok: true, name };
}

/** Avatar colour palette – chosen so neighbouring players look different. */
export const AVATAR_COLORS = [
  '#B14DFF',
  '#FF3D9A',
  '#7C5CFF',
  '#FF6B6B',
  '#21D4B4',
  '#FFB443',
  '#4DA3FF',
  '#E040FB',
  '#9BE15D',
  '#FF8A3D',
] as const;

export function nextColorIndex(players: readonly Player[]): number {
  const used = new Set(players.map((player) => player.colorIndex));
  for (let i = 0; i < AVATAR_COLORS.length; i += 1) {
    if (!used.has(i)) return i;
  }
  return players.length % AVATAR_COLORS.length;
}

export function avatarColor(colorIndex: number): string {
  return AVATAR_COLORS[Math.abs(colorIndex) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

export function initials(name: string): string {
  const parts = normalizeName(name).split(' ').filter(Boolean);
  const first = parts[0] ? [...parts[0]][0] ?? '' : '';
  const second = parts[1] ? [...parts[1]][0] ?? '' : '';
  return (first + second).toLocaleUpperCase('de-DE') || '?';
}
