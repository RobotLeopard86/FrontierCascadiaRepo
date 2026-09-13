import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import type { DiscordTurn, ToolCall } from './types.js';

interface TurnState {
    thinking: string[];
    lastAssistantMessage: string;
    lastBashResult: string;
}

interface QueuedRequest {
    prompt: string;
    userId: string;
}

interface ChannelQueue {
    active: boolean;
    queue: QueuedRequest[];
}

const channelQueues = new Map<string, ChannelQueue>();

export async function handleQueuedAgentRequest(
    channelId: string,
    prompt: string,
    userId: string,
    onMessage: (message: string | DiscordTurn | ToolCall) => Promise<void>,
    workingDir?: string,
    workBranch?: string
): Promise<void> {
    let queueState = channelQueues.get(channelId);
    if (!queueState) {
        queueState = { active: false, queue: [] };
        channelQueues.set(channelId, queueState);
    }

    if (queueState.active) {
        queueState.queue.push({ prompt, userId });
        const position = queueState.queue.length;
        await onMessage(`You are at position ${position} in the queue.`);
        return;
    }

    queueState.active = true;
    try {
        await processAgentRequest(prompt, onMessage, workingDir, workBranch);
    } finally {
        queueState.active = false;
    }

    while (queueState.queue.length > 0) {
        const next = queueState.queue.shift();
        if (next) {
            queueState.active = true;
            try {
                await processAgentRequest(next.prompt, onMessage, workingDir, workBranch);
            } finally {
                queueState.active = false;
            }
        }
    }
}

export async function processAgentRequest(
    prompt: string,
    onMessage: (message: string | DiscordTurn | ToolCall) => Promise<void>,
    workingDir?: string,
    workBranch?: string
): Promise<void> {
    const agentRoot = path.join(process.cwd(), 'agent');
    if (!fs.existsSync(agentRoot)) {
        fs.mkdirSync(agentRoot, { recursive: true });
    }

    const requestDir = workingDir || path.join(agentRoot, crypto.randomUUID());
    if (!fs.existsSync(requestDir)) {
        fs.mkdirSync(requestDir, { recursive: true });
    }

    const state: TurnState = {
        thinking: [],
        lastAssistantMessage: '',
        lastBashResult: '',
    };

    return new Promise((resolve, reject) => {
        const child = spawn('pnpm', ['exec', 'vite-node', path.resolve(requestDir, '../../src/agent-worker.ts'), prompt], {
            cwd: requestDir,
        });

        const stdoutRl = readline.createInterface({
            input: child.stdout,
            terminal: false,
        });

        async function handleLine(line: string) {
            if (!line.trim()) return;
            try {
                const parsed = JSON.parse(line);
                const body = parsed.body || '';

                state.thinking.push(`[${parsed.type}] ${body}`);

                if (parsed.type === 'assistant') {
                    state.lastAssistantMessage = body;
                } else if (parsed.type === 'tool_use') {
                    const tool = parsed.body;
                    if (tool && typeof tool === 'object') {
                        await onMessage({
                            name: tool.name,
                            input: tool.input,
                            type: 'call',
                        } as ToolCall);
                    } else {
                        const formatted = `AGENT REPLY\nType: ${parsed.type}\nBody:\n${body}`;
                        await onMessage(formatted);
                    }
                } else if (parsed.type === 'tool_result') {
                    const tool = parsed.body;
                    if (tool && typeof tool === 'object') {
                        await onMessage({
                            name: tool.name,
                            result: tool.subtype,
                            type: 'result',
                        } as ToolCall);
                    } else {
                        const formatted = `AGENT REPLY\nType: ${parsed.type}\nBody:\n${body}`;
                        await onMessage(formatted);
                    }
                } else if (parsed.type === 'result') {
                    state.lastBashResult = body;
                    const formatted = `AGENT REPLY\nType: ${parsed.type}\nBody:\n${body}`;
                    await onMessage(formatted);
                } else {
                    const formatted = `AGENT REPLY\nType: ${parsed.type}\nBody:\n${body}`;
                    await onMessage(formatted);
                }
            } catch (e) {
                // Ignore non-JSON output from vite-node
            }
        }

        stdoutRl.on('line', handleLine);

        const stderrRl = readline.createInterface({
            input: child.stderr,
            terminal: false,
        });

        stderrRl.on('line', async (line) => {
            if (!line.trim()) return;
            try {
                const parsed = JSON.parse(line);
                const body = parsed.body || '';
                state.thinking.push(`[${parsed.type}] ${body}`);

                if (parsed.type === 'tool_use') {
                    const tool = parsed.body;
                    if (tool && typeof tool === 'object') {
                        await onMessage({
                            name: tool.name,
                            input: tool.input,
                            type: 'call',
                        } as ToolCall);
                        return;
                    }
                } else if (parsed.type === 'tool_result') {
                    const tool = parsed.body;
                    if (tool && typeof tool === 'object') {
                        await onMessage({
                            name: tool.name,
                            result: tool.subtype,
                            type: 'result',
                        } as ToolCall);
                        return;
                    }
                }

                const formatted = `AGENT REPLY\nType: ${parsed.type}\nBody:\n${body}`;
                await onMessage(formatted);
            } catch (e) {
                console.error(`[Agent Worker Stderr] ${line}`);
            }
        });

        child.on('close', async (code) => {
            if (code !== 0) {
                console.error(`Agent worker exited with code ${code}`);
            }

            if (workingDir && workBranch) {
                try {
                    console.log(`[Git] Committing changes in ${workingDir}...`);
                    execSync('git add .', { cwd: workingDir });
                    execSync('git config user.name "HelixBot"', { cwd: workingDir });
                    execSync('git config user.email "agent@helixbot.local"', { cwd: workingDir });
                    execSync('git config commit.gpgsign false', { cwd: workingDir });
                    execSync('git config tag.gpgsign false', { cwd: workingDir });
                    const truncatedPrompt = prompt.length > 134 ? prompt.slice(0, 134) + '...' : prompt;
                    const commitMsg = `Agent update: ${truncatedPrompt}`.slice(0, 150);
                    const escapedMsg = commitMsg.replace(/"/g, '\\"');
                    execSync(`git commit -m "${escapedMsg}"`, { cwd: workingDir });
                    execSync(`git push -u origin ${workBranch}`, { cwd: workingDir });
                    console.log(`[Git] Successfully pushed changes to ${workBranch}`);
                } catch (e) {
                    console.error(`[Git] Failed to commit/push changes: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            // Construct the final DiscordTurn
            const finalText = state.lastAssistantMessage;
            const turn: DiscordTurn = {
                turnId: crypto.randomUUID(),
                headline: 'Agent update',
                narration: 'The agent has completed the request.',
                changedCode: [],
                diff: '',
                verification: state.lastBashResult || 'No verification run.',
                thinking: state.thinking.join('\n'),
            };

            // Parse summary keys from final assistant message
            const headlineMatch = finalText.match(/HEADLINE:\s*(.*)/i);
            if (headlineMatch && headlineMatch[1]) turn.headline = headlineMatch[1].trim();

            const narrationMatch = finalText.match(/NARRATION:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i);
            if (narrationMatch && narrationMatch[1]) turn.narration = narrationMatch[1].trim();

            const diffMatch = finalText.match(/DIFF:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i);
            if (diffMatch && diffMatch[1]) turn.diff = diffMatch[1].trim();

            const codeMatch = finalText.match(/CODE:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i);
            if (codeMatch && codeMatch[1]) {
                const codeBlocks = codeMatch[1].trim().split('```').filter(b => b.trim());
                for (const block of codeBlocks) {
                    const lines = block.split('\n');
                    const header = lines[0] || '';
                    const content = lines.slice(1).join('\n');
                    if (header.includes(':')) {
                        const [filePath] = header.split(':');
                        turn.changedCode.push({ path: filePath?.trim() || 'unknown', lines: content.trim() });
                    } else {
                        turn.changedCode.push({ path: 'unknown', lines: block.trim() });
                    }
                }
            }

            const verMatch = finalText.match(/VERIFICATION:\s*([\s\S]*?)(?=\n[A-Z]+:|$)/i);
            if (verMatch && verMatch[1]) turn.verification = verMatch[1].trim();

            await onMessage(turn);
            resolve();
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}
