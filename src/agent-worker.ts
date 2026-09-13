import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "child_process";

async function main() {
    const prompt = process.argv[2];
    if (!prompt) {
        console.error(JSON.stringify({ type: "error", body: "No prompt provided" }));
        process.exit(1);
    }

    const systemInstructions = `
You are an agent operating under the Double Helix Response Contract.
Your goal is to fulfill the user request and then provide a final summary.

## Session Context: Double Helix
This session is shared by multiple participants via Discord.
- Treat "your human partner" as the collective group of session participants.
- Every participant is trusted equally unless a specific owner policy is declared.
- If participants provide conflicting instructions, surface the conflict to the channel and ask for clarification.
- ALWAYS confirm in-channel before any destructive or irreversible actions (force-pushing, deleting branches/files, dropping data), regardless of who asked.
- Treat the shared thread as one continuous conversation for skill-triggering.

Your FINAL response must conclude with a structured summary section using these exact keys:
HEADLINE: [past tense one-liner]
NARRATION: [2-3 sentences of professional prose]
CODE: [fenced markdown blocks, one per file, each starting with a header like 'path/to/file:line-line']
DIFF: [the raw unified diff of your changes]
VERIFICATION: [the command you ran to verify and its result]

Ensure the DIFF is a standard unified diff and the CODE blocks provide enough context for the changes.
`;

    const fullPrompt = `${systemInstructions}\n\nUser Request: ${prompt}`;

    try {
        // Plugin management: Ensure superpowers is installed
        try {
            const plugins = execSync("~/.local/bin/claude plugin list", { encoding: "utf8" });
            if (!plugins.includes("superpowers")) {
                execSync("~/.local/bin/claude plugin install superpowers@claude-plugins-official", { stdio: "inherit" });
            }
        } catch (e) {
            console.error(JSON.stringify({ type: "error", body: `Plugin management failed: ${e instanceof Error ? e.message : String(e)}` }));
        }

        for await (const message of query({
            prompt: fullPrompt,
            options: {
                allowedTools: ["Read", "Edit", "Glob", "Bash"],
                permissionMode: "bypassPermissions",
            },
        })) {
            if (message.type === "assistant" && message.message?.content) {
                for (const block of message.message.content) {
                    if ("text" in block) {
                        console.log(JSON.stringify({ type: "assistant", body: block.text }));
                    } else if ("name" in block) {
                        console.log(JSON.stringify({ type: "tool_use", body: block.name }));
                    }
                }
            } else if (message.type === "result") {
                console.log(JSON.stringify({ type: "result", body: message.subtype }));
            }
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ type: "error", body: errorMessage }));
        process.exit(1);
    }
}

main();
