/** Placeholder replaced by the name of another (random) player. */
export const OTHER_PLAYER_PLACEHOLDER = '{other}';

export function requiresTargetPlayer(text: string): boolean {
  return text.includes(OTHER_PLAYER_PLACEHOLDER);
}

export interface RenderContext {
  targetPlayerName?: string | null;
  /** Used when no target player is available. */
  fallbackTargetName: string;
}

/** Replaces all placeholders in a question text. */
export function renderQuestionText(text: string, context: RenderContext): string {
  if (!requiresTargetPlayer(text)) return text;
  const name = context.targetPlayerName?.trim() || context.fallbackTargetName;
  return text.split(OTHER_PLAYER_PLACEHOLDER).join(name);
}
