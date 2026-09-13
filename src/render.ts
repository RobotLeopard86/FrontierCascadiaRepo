import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} from 'discord.js';
import type { DiscordTurn, ToolCall } from './types.js';
import fs from 'fs/promises';
import path from 'path';

export interface RenderResult {
  content: string;
  embeds: any[];
  components: any[];
  files: any[];
  tempFiles: string[];
}

export function renderToolCall(tool: ToolCall): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(tool.type === 'call' ? 0x3498db : 0x2ecc71);

  if (tool.type === 'call') {
    embed.setTitle(`🛠️ Tool Call: ${tool.name}`)
      .setDescription(`\`\`\`json\n${JSON.stringify(tool.input, null, 2)}\n\`\`\``);
  } else {
    embed.setTitle(`✅ Tool Result: ${tool.name}`)
      .setDescription(`\`\`\`\n${tool.result}\n\`\`\``);
  }

  return embed;
}

export async function renderTurn(turn: DiscordTurn): Promise<RenderResult> {
  const contentParts: string[] = [];
  const files: any[] = [];
  const tempFiles: string[] = [];

  const embed = new EmbedBuilder()
    .setTitle(turn.headline)
    .setDescription(turn.narration)
    .setColor(0x00AE86);

  // 1. Changed Code in Embed
  for (const block of turn.changedCode) {
    const codeValue = `\`\`\`\n${block.lines}\n\`\`\``;
    if (codeValue.length <= 1024) {
      embed.addFields({ name: block.path, value: codeValue });
    } else {
      // Too long for embed field, put in content
      contentParts.push(`\`\`\`\n${block.path}:${block.lines}\n\`\`\``);
    }
  }

  // 2. Diff Logic
  const diffLines = turn.diff.split('\n').length;
  const diffChars = turn.diff.length;

  if (diffLines < 25 && diffChars < 1024) {
    embed.addFields({ name: 'Diff', value: `\`\`\`diff\n${turn.diff}\n\`\`\`` });
  } else if (diffLines < 25 && diffChars < 1500) {
    // Fits in content but not embed
    contentParts.push(`\`\`\`diff\n${turn.diff}\n\`\`\``);
  } else {
    const diffFilePath = path.join(process.cwd(), `temp_${turn.turnId}.diff`);
    await fs.writeFile(diffFilePath, turn.diff);
    files.push(new AttachmentBuilder(diffFilePath, { name: `${turn.turnId}.diff` }));
    tempFiles.push(diffFilePath);
    embed.addFields({ name: 'Diff', value: '*Diff too large, attached as file.*' });
  }

  // 3. Verification in Embed
  const verValue = `\`\`\`\n${turn.verification}\n\`\`\``;
  if (verValue.length <= 1024) {
    embed.addFields({ name: 'Verification', value: verValue });
  } else {
    contentParts.push(`**Verification:**\n\`\`\`\n${turn.verification}\n\`\`\``);
  }

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
