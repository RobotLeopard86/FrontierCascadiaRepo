import { query } from "@anthropic-ai/claude-agent-sdk";
import { execSync } from "child_process";

async function main() {
    const prompt = process.argv[2];
    if (!prompt) {
        console.error(JSON.stringify({ type: "error", body: "No prompt provided" }));
        process.exit(1);
    }

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
            prompt: prompt,
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
