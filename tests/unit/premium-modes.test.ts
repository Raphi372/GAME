import {
  GAME_MODE_IDS,
  getGameMode,
  isGameModeId,
  isGroupMode,
  isModePlayable,
  listGameModes,
  listPlayableModeIds,
} from '@/features/game-modes/registry';
import { cardCountKey, modeTitleKey } from '@/features/game-modes/labels';
import { canShowAd } from '@/features/premium/adPolicy';
import { canAccessTier, FREE_ENTITLEMENTS } from '@/features/premium/entitlements';
import { formatPrice, PREMIUM_PLANS, PURCHASES_ENABLED } from '@/features/premium/plans';
import { unavailablePurchaseService } from '@/features/premium/purchases';

describe('premium preparation', () => {
  it('everyone is on the free tier in the MVP', () => {
    expect(FREE_ENTITLEMENTS.premium).toBe(false);
    expect(canAccessTier('free', FREE_ENTITLEMENTS)).toBe(true);
    expect(canAccessTier('premium', FREE_ENTITLEMENTS)).toBe(false);
    expect(canAccessTier('premium', { premium: true })).toBe(true);
  });

  it('never simulates a successful purchase', async () => {
    expect(PURCHASES_ENABLED).toBe(false);
    await expect(unavailablePurchaseService.isAvailable()).resolves.toBe(false);
    await expect(unavailablePurchaseService.purchase('yearly')).resolves.toEqual({ status: 'unavailable' });
    await expect(unavailablePurchaseService.restore()).resolves.toEqual({ status: 'unavailable' });
  });

  it('keeps the planned prices as configuration', () => {
    const prices = Object.fromEntries(PREMIUM_PLANS.map((plan) => [plan.id, plan.priceCents]));
    expect(prices).toEqual({ monthly: 299, yearly: 1499, lifetime: 1299 });
    expect(formatPrice(PREMIUM_PLANS[0]!, 'de-DE')).toMatch(/2,99\s?€/);
  });

  it('never shows ads during a round', () => {
    expect(canShowAd({ phase: 'in-round', premium: false })).toBe(false);
    expect(canShowAd({ phase: 'in-round', premium: false }, true)).toBe(false);
    expect(canShowAd({ phase: 'setup', premium: false }, true)).toBe(false);
    expect(canShowAd({ phase: 'menu', premium: true }, true)).toBe(false);
    expect(canShowAd({ phase: 'round-summary', premium: false }, true)).toBe(true);
    // MVP: ads disabled entirely.
    expect(canShowAd({ phase: 'menu', premium: false })).toBe(false);
  });
});

describe('game mode registry', () => {
  it('lists all planned modes and marks the playable ones', () => {
    expect(listGameModes().map((mode) => mode.id)).toEqual([...GAME_MODE_IDS]);
    expect(isModePlayable('spicy-questions')).toBe(true);
    expect(isModePlayable('never-have-i-ever')).toBe(true);
    expect(isModePlayable('most-likely')).toBe(true);
    expect(isModePlayable('truth-or-dare')).toBe(true);
    expect(isModePlayable('random-challenges')).toBe(false);
    expect(listPlayableModeIds()).toEqual([
      'spicy-questions',
      'never-have-i-ever',
      'truth-or-dare',
      'most-likely',
    ]);
    expect(getGameMode('truth-or-dare').choice?.kinds).toEqual(['truth', 'dare']);
    expect(cardCountKey('truth-or-dare')).toBe('mode.unit.cards');
    expect(getGameMode('most-likely').minPlayers).toBe(3);
    expect(getGameMode('most-likely').group?.tally).toBe('picked');
    expect(getGameMode('most-likely').group?.countdown).toBe(true);
    expect(getGameMode('never-have-i-ever').group?.tally).toBe('confessed');
    expect(isGroupMode('never-have-i-ever')).toBe(true);
    expect(isGroupMode('spicy-questions')).toBe(false);
    expect(modeTitleKey('never-have-i-ever')).toBe('mode.never-have-i-ever.title');
    expect(cardCountKey('never-have-i-ever')).toBe('mode.unit.statements');
    expect(cardCountKey('spicy-questions')).toBe('mode.unit.questions');
    expect(getGameMode('spicy-questions').minPlayers).toBe(2);
    expect(getGameMode('spicy-questions').maxPlayers).toBe(20);
    expect(isGameModeId('most-likely')).toBe(true);
    expect(isGameModeId('poker')).toBe(false);
  });
});

describe('group mode configuration', () => {
  it('every group mode has its rules and texts', () => {
    for (const mode of listGameModes()) {
      if (mode.turnStyle === 'group' && mode.status === 'available') {
        expect(mode.group).toBeDefined();
        expect(mode.cardLead).toBeTruthy();
      }
    }
  });
});
