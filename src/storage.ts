import fs from 'fs/promises';
import path from 'path';
import { DiscordTurn } from './types';

const TURNS_DIR = path.join(process.cwd(), 'turns');

async function ensureDir() {
  try {
    await fs.mkdir(TURNS_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function saveTurn(turn: DiscordTurn) {
  await ensureDir();
  const filePath = path.join(TURNS_DIR, `${turn.turnId}.json`);
  await fs.writeFile(filePath, JSON.stringify(turn, null, 2));
}

export async function getTurn(turnId: string): Promise<DiscordTurn | null> {
  try {
    const filePath = path.join(TURNS_DIR, `${turnId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}
