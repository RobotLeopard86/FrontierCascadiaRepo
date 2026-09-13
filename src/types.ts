export interface DiscordTurn {
  turnId: string;
  headline: string;
  narration: string;
  changedCode: Array<{ path: string; lines: string }>;
  diff: string;
  verification: string;
  thinking: string;
}
