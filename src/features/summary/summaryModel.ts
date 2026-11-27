import {
  DEFAULT_MODE_ID,
  DEFAULT_SINGLE_COPY,
  getGameMode,
  type GameModeDefinition,
  type GroupModeConfig,
  type SingleModeCopy,
} from '@/features/game-modes/registry';
import { LEVELS, type LevelMeta } from '@/features/levels/levels';
import type { TranslationKey } from '@/i18n';
import type { GameResult, PlayerResult } from '@/store';

export interface SummaryStat {
  label: TranslationKey;
  value: number;
}

export interface Summary {
  meta: LevelMeta;
  mixed: boolean;
  mode: GameModeDefinition;
  group: GroupModeConfig | undefined;
  isChoice: boolean;
  single: SingleModeCopy;
  /** Mixed rounds: which counters the modes of the round produce. */
  mixHas: { single: boolean; confessions: boolean; picks: boolean };
  stats: SummaryStat[];
  /** Players from the highest score down. */
  ranked: PlayerResult[];
  /** Everyone with the highest score – a tie names all of them; empty if nobody scored. */
  leaders: PlayerResult[];
  /** Title of the highlight ("Mutigste Person", "Die meisten Geständnisse" …). */
  topLabel: TranslationKey;
  minutes: number;
}

/** Everything the summary – and the shared result image – shows about a finished round. */
export function summarize(result: GameResult): Summary {
  const meta = LEVELS[result.level];
  const mixed = result.mixed;
  const mode = getGameMode(mixed ? DEFAULT_MODE_ID : result.modeId);
  const group = mixed ? undefined : mode.group;
  const isChoice = !mixed && Boolean(mode.choice);
  const single = mode.singleCopy ?? DEFAULT_SINGLE_COPY;
  const mixHas = {
    single: result.modeIds.some((id) => getGameMode(id).turnStyle === 'single-player'),
    confessions: result.modeIds.some((id) => getGameMode(id).group?.tally === 'confessed'),
    picks: result.modeIds.some((id) => getGameMode(id).group?.tally === 'picked'),
  };
  const totals = result.players.reduce(
    (sum, player) => ({
      answered: sum.answered + player.answered,
      passed: sum.passed + player.passed,
      skipped: sum.skipped + player.skipped,
      tally: sum.tally + (group ? player[group.tally] : 0),
      truths: sum.truths + player.truths,
      dares: sum.dares + player.dares,
      confessed: sum.confessed + player.confessed,
      picked: sum.picked + player.picked,
    }),
    { answered: 0, passed: 0, skipped: 0, tally: 0, truths: 0, dares: 0, confessed: 0, picked: 0 },
  );
  // Spicy Questions ranks by answered questions, group modes by their tally,
  // "Wahrheit oder Pflicht" by dares done, a mixed round by answers plus confessions.
  const score = (player: PlayerResult) =>
    mixed
      ? player.answered + player.confessed
      : group
        ? player[group.tally]
        : isChoice
          ? player.dares
          : player.answered;
  const ranked = [...result.players].sort((a, b) => score(b) - score(a));
  const best = Math.max(0, ...result.players.map(score));
  const leaders = best > 0 ? result.players.filter((player) => score(player) === best) : [];

  const stats: SummaryStat[] = mixed
    ? [
        { label: 'summary.rounds', value: result.turnsCompleted },
        ...(mixHas.single ? [{ label: 'summary.answered' as const, value: totals.answered }] : []),
        ...(mixHas.confessions ? [{ label: 'summary.confessions' as const, value: totals.confessed }] : []),
        ...(mixHas.picks ? [{ label: 'summary.picks' as const, value: totals.picked }] : []),
        ...(mixHas.single ? [{ label: 'summary.passed' as const, value: totals.passed }] : []),
      ]
    : isChoice
      ? [
          { label: 'summary.rounds', value: result.turnsCompleted },
          { label: 'summary.truths', value: totals.truths },
          { label: 'summary.dares', value: totals.dares },
          { label: 'summary.passed', value: totals.passed },
        ]
      : group
        ? [
            { label: 'summary.rounds', value: result.turnsCompleted },
            { label: group.copy.summaryStat, value: totals.tally },
            { label: 'summary.skipped', value: totals.skipped },
          ]
        : [
            { label: 'summary.rounds', value: result.turnsCompleted },
            { label: single.summaryAnswered, value: totals.answered },
            { label: 'summary.passed', value: totals.passed },
            { label: 'summary.skipped', value: totals.skipped },
          ];

  return {
    meta,
    mixed,
    mode,
    group,
    isChoice,
    single,
    mixHas,
    stats,
    ranked,
    leaders,
    topLabel: group ? group.copy.summaryTop : isChoice ? 'summary.mostDares' : single.summaryTop,
    minutes: Math.max(1, Math.round(result.durationMs / 60000)),
  };
}
