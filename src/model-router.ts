export type Difficulty = 'easy' | 'hard';

const HARD_SIGNALS = [
    /refactor/i,
    /migrat(e|ion)/i,
    /architect/i,
    /entire (codebase|project|repo)/i,
    /across (the )?(codebase|repo|project)/i,
    /\bdebug\b/i,
    /fix (the|this) bug/i,
    /investigat/i,
    /integrat/i,
    /database schema/i,
    /auth(entication|orization)/i,
    /\bsecurity\b/i,
    /\bdeploy/i,
    /ci\/cd/i,
    /test suite/i,
    /existing (code|project|repo)/i,
];

const EASY_INTENT = /\b(write|create|generate|make|build|give)\b.{0,30}\b(a|an|me)?\b.{0,20}\b(simple|basic|small|quick|hello[ -]?world|script|snippet|function|api)\b/i;

const MAX_EASY_WORDS = 60;

export function classifyPrompt(prompt: string): Difficulty {
    const trimmed = prompt.trim();
    if (!trimmed) return 'hard';

    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > MAX_EASY_WORDS) return 'hard';

    if (HARD_SIGNALS.some((re) => re.test(trimmed))) return 'hard';

    if (EASY_INTENT.test(trimmed)) return 'easy';

    return 'hard';
}
