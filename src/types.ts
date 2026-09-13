export interface DiscordTurn {
  turnId: string;
  headline: string;
  narration: string;
  changedCode: Array<{ path: string; lines: string }>;
  diff: string;
  verification: string;
  thinking: string;
}

export interface ToolCall {
  name: string;
  input: any;
  type: 'call' | 'result';
  result?: string;
}
