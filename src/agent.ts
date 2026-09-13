import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';

export async function processAgentRequest(
    prompt: string,
    onMessage: (formattedMessage: string) => Promise<void>
): Promise<void> {
    const agentRoot = path.join(process.cwd(), 'agent');
    if (!fs.existsSync(agentRoot)) {
        fs.mkdirSync(agentRoot, { recursive: true });
    }

    const requestId = crypto.randomUUID();
    const requestDir = path.join(agentRoot, requestId);
    fs.mkdirSync(requestDir, { recursive: true });

    return new Promise((resolve, reject) => {
        const child = spawn('pnpm', ['exec', 'vite-node', path.join(process.cwd(), 'src/agent-worker.ts'), prompt], {
            cwd: requestDir,
        });

        const stdoutRl = readline.createInterface({
            input: child.stdout,
            terminal: false,
        });

        stdoutRl.on('line', async (line) => {
            if (!line.trim()) return;
            try {
                const parsed = JSON.parse(line);
                const formatted = `AGENT REPLY\nType: ${parsed.type}\nBody:\n${parsed.body}`;
                await onMessage(formatted);
            } catch (e) {
                // Ignore non-JSON output from vite-node
            }
        });

        const stderrRl = readline.createInterface({
            input: child.stderr,
            terminal: false,
        });

        stderrRl.on('line', async (line) => {
            if (!line.trim()) return;
            try {
                const parsed = JSON.parse(line);
                const formatted = `AGENT REPLY\nType: ${parsed.type}\nBody:\n${parsed.body}`;
                await onMessage(formatted);
            } catch (e) {
                console.error(`[Agent Worker Stderr] ${line}`);
            }
        });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`Agent worker exited with code ${code}`);
            }
            resolve();
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}
