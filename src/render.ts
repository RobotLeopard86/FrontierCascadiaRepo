import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from 'discord.js';
import { DiscordTurn } from './types';
import fs from 'fs/promises';
import path from 'path';

export interface RenderResult {
  content: string;
  embeds: any[];
  components: any[];
  files: any[];
  tempFiles: string[];
}

export async function renderTurn(turn: DiscordTurn): Promise<RenderResult> {
  const contentParts: string[] = [];
  const files: any[] = [];
  const tempFiles: string[] = [];

  // 1. Changed Code
  for (const block of turn.changedCode) {
    contentParts.push(`\`\`\`\n${block.path}:${block.lines}\n\`\`\``);
  }

  // 2. Diff Logic
  const diffLines = turn.diff.split('\n').length;
  const diffChars = turn.diff.length;

  if (diffLines < 25 && diffChars < 1500) {
    contentParts.push(`\`\`\`diff\n${turn.diff}\n\`\`\``);
  } else {
    const diffFilePath = path.join(process.cwd(), `temp_${turn.turnId}.diff`);
    await fs.writeFile(diffFilePath, turn.diff);
    files.push(new AttachmentBuilder(diffFilePath, { name: `${turn.turnId}.diff` }));
    tempFiles.push(diffFilePath);
    contentParts.push(`\n*Diff too large, attached as file.*`);
  }

  const embed = new EmbedBuilder()
    .setTitle(turn.headline)
    .setDescription(turn.narration)
    .addFields({ name: 'Verification', value: `\`\`\`\n${turn.verification}\n\`\`\`` })
    .setColor(0x00AE86);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`thinking:${turn.turnId}`)
      .setLabel('Show thinking')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    content: contentParts.join('\n\n').slice(0, 2000),
    embeds: [embed],
    components: [row],
    files: files,
    tempFiles: tempFiles,
  };
}
