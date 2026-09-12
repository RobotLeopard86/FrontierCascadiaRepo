const MAX_PROMPT_CHARS = parseInt(process.env.LOCAL_LLM_MAX_PROMPT_CHARS || '8000', 10);
const TIMEOUT_MS = parseInt(process.env.LOCAL_LLM_TIMEOUT_MS || '120000', 10);
const PORT = process.env.PORT || '7125';
// Same machine (monolithic/dev) by default. On the main bot machine, set this
// to the LAN address of the Pi running the llm-relay role, e.g.
// http://192.168.1.50:7125
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || `http://127.0.0.1:${PORT}`;

export interface LocalLlmResult {
    text: string;
    flag: string;
}

export async function generateWithLocalModel(prompt: string): Promise<LocalLlmResult> {
    if (typeof prompt !== 'string' || !prompt.trim()) {
        throw new Error('Prompt must be a non-empty string');
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
        throw new Error(`Prompt too long for local model (${prompt.length} > ${MAX_PROMPT_CHARS} chars)`);
    }

    const apiKey = process.env.LOCAL_LLM_API_KEY;
    if (!apiKey) {
        throw new Error('LOCAL_LLM_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(`${LOCAL_LLM_URL}/internal/local-llm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ prompt }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`Local model request failed (${res.status}): ${body.slice(0, 200)}`);
        }

        const data = (await res.json()) as { response?: string; flag?: string };
        if (typeof data.response !== 'string' || typeof data.flag !== 'string') {
            throw new Error('Local model returned an unexpected response shape');
        }

        return { text: data.response, flag: data.flag };
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error(`Local model request timed out after ${TIMEOUT_MS}ms`);
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}
