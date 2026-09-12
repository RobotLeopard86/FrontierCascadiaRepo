import fs from 'fs';
import path from 'path';
import { classifyPrompt } from './model-router.js';
import { generateWithLocalModel } from './local-llm.js';
import { processAgentRequest } from './agent.js';

const SAVE_TO_PATTERN = /save\s+(?:it|this|that)?\s*(?:to|as)\s+([./\w-]+\.[a-zA-Z0-9]+)/i;
const CODE_BLOCK_PATTERN = /```(?:\w+)?\n([\s\S]*?)```/;

function extractSaveTarget(prompt: string): string | null {
    const match = prompt.match(SAVE_TO_PATTERN);
    return match ? match[1] : null;
}

function resolveSavePath(target: string, workingDir?: string): string {
    const baseDir = workingDir || path.join(process.cwd(), 'agent');
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    const resolved = path.resolve(baseDir, target);
    if (!resolved.startsWith(path.resolve(baseDir) + path.sep) && resolved !== path.resolve(baseDir)) {
        throw new Error('Refusing to write outside the working directory');
    }
    return resolved;
}

export async function routeAndHandle(
    prompt: string,
    onMessage: (formattedMessage: string) => Promise<void>,
    workingDir?: string,
    workBranch?: string
): Promise<void> {
    const difficulty = classifyPrompt(prompt);

    if (difficulty === 'hard') {
        return processAgentRequest(prompt, onMessage, workingDir, workBranch);
    }

    try {
        const { text, flag } = await generateWithLocalModel(prompt);

        let body = text;
        const saveTarget = extractSaveTarget(prompt);
        const codeMatch = text.match(CODE_BLOCK_PATTERN);
        if (saveTarget && codeMatch) {
            const savePath = resolveSavePath(saveTarget, workingDir);
            fs.writeFileSync(savePath, codeMatch[1]);
            body = `${text}\n\nSaved to ${saveTarget}`;
        }

        await onMessage(`AGENT REPLY\nType: local (flag: ${flag})\nBody:\n${body}`);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Router] Local model failed, escalating to cloud: ${message}`);
        await onMessage(`AGENT REPLY\nType: local-error\nBody:\nLocal model unavailable (${message}), escalating to the full agent...`);
        return processAgentRequest(prompt, onMessage, workingDir, workBranch);
    }
}
