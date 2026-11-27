import { summarize } from '@/features/summary/summaryModel';
import type { GameResult, PlayerResult } from '@/store';

const player = (name: string, stats: Partial<PlayerResult> = {}): PlayerResult => ({
  id: `player-${name}`,
  name,
  colorIndex: 0,
  answered: 0,
  passed: 0,
  skipped: 0,
  confessed: 0,
  picked: 0,
  truths: 0,
  dares: 0,
  ...stats,
});

const result = (overrides: Partial<GameResult>): GameResult => ({
  modeId: 'spicy-questions',
  mixed: false,
  modeIds: ['spicy-questions'],
  level: 'hot',
  turnsCompleted: 6,
  durationMs: 12 * 60000,
  players: [player('Lena'), player('Max')],
  ...overrides,
});

const labels = (summaryResult: GameResult) => summarize(summaryResult).stats.map((stat) => stat.label);

describe('summary model', () => {
  it('counts Spicy Questions and names the most daring player', () => {
    const summary = summarize(
      result({
        players: [player('Lena', { answered: 2, passed: 1 }), player('Max', { answered: 3, skipped: 1 })],
      }),
    );
    expect(summary.stats).toEqual([
      { label: 'summary.rounds', value: 6 },
      { label: 'summary.answered', value: 5 },
      { label: 'summary.passed', value: 1 },
      { label: 'summary.skipped', value: 1 },
    ]);
    expect(summary.leaders.map((leader) => leader.name)).toEqual(['Max']);
    expect(summary.ranked.map((ranked) => ranked.name)).toEqual(['Max', 'Lena']);
    expect(summary.topLabel).toBe('summary.mostDaring');
    expect(summary.minutes).toBe(12);
  });

  it('names everybody who shares the lead and nobody if no one scored', () => {
    const tie = result({ players: [player('Lena', { answered: 2 }), player('Max', { answered: 2 }), player('Sam')] });
    expect(summarize(tie).leaders.map((leader) => leader.name)).toEqual(['Lena', 'Max']);
    expect(summarize(result({})).leaders).toEqual([]);
  });

  it('uses the counters of the mode', () => {
    expect(labels(result({ modeId: 'never-have-i-ever', modeIds: ['never-have-i-ever'] }))).toEqual([
      'summary.rounds',
      'summary.confessions',
      'summary.skipped',
    ]);
    expect(labels(result({ modeId: 'truth-or-dare', modeIds: ['truth-or-dare'] }))).toEqual([
      'summary.rounds',
      'summary.truths',
      'summary.dares',
      'summary.passed',
    ]);
    expect(summarize(result({ modeId: 'most-likely', modeIds: ['most-likely'] })).topLabel).toBe('summary.mostPicked');
    expect(labels(result({ modeId: 'random-challenges', modeIds: ['random-challenges'] }))[1]).toBe(
      'summary.challengesDone',
    );
  });

  it('shows the counters of all modes of a mixed round and ranks by answers plus confessions', () => {
    const summary = summarize(
      result({
        mixed: true,
        modeIds: ['spicy-questions', 'never-have-i-ever', 'most-likely'],
        players: [player('Lena', { answered: 1, confessed: 3 }), player('Max', { answered: 3, picked: 4 })],
      }),
    );
    expect(summary.stats.map((stat) => stat.label)).toEqual([
      'summary.rounds',
      'summary.answered',
      'summary.confessions',
      'summary.picks',
      'summary.passed',
    ]);
    expect(summary.leaders.map((leader) => leader.name)).toEqual(['Lena']);
  });

  it('counts at least one minute', () => {
    expect(summarize(result({ durationMs: 5000 })).minutes).toBe(1);
  });
});
