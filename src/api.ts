import express from 'express';
import crypto, { randomUUID } from 'crypto';
import { sendMessage } from './discord';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:9b';
const MAX_PROMPT_CHARS = parseInt(process.env.LOCAL_LLM_MAX_PROMPT_CHARS || '8000', 10);

function isAuthorized(req: express.Request): boolean {
    const expected = process.env.LOCAL_LLM_API_KEY;
    if (!expected) return false;

    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return false;

    const expectedBuf = Buffer.from(expected);
    const tokenBuf = Buffer.from(token);
    if (expectedBuf.length !== tokenBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, tokenBuf);
}

export async function initApi(port: number) {
    const app = express();
    app.use(express.json());

    app.post('/internal/local-llm', async (req, res) => {
        if (!isAuthorized(req)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { prompt } = req.body;
        if (typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({ error: 'prompt must be a non-empty string' });
        }
        if (prompt.length > MAX_PROMPT_CHARS) {
            return res.status(400).json({ error: `prompt exceeds ${MAX_PROMPT_CHARS} character limit` });
        }

        const flag = randomUUID();
        console.log(`[LOCAL-LLM FLAG] nonce=${flag} received ${prompt.length} chars at ${new Date().toISOString()}`);

        try {
            const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
            });

            if (!ollamaRes.ok) {
                const body = await ollamaRes.text().catch(() => '');
                console.error(`[LOCAL-LLM FLAG] nonce=${flag} ollama error ${ollamaRes.status}: ${body.slice(0, 200)}`);
                return res.status(502).json({ error: 'Local model backend error', flag });
            }

            const data = (await ollamaRes.json()) as { response?: string };
            res.json({ response: data.response ?? '', flag });
        } catch (error: any) {
            console.error(`[LOCAL-LLM FLAG] nonce=${flag} request failed: ${error.message}`);
            res.status(502).json({ error: 'Failed to reach local model backend', flag });
        }
    });

    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`API Server running on port ${port}`);
            resolve(server);
        });
    });
}
