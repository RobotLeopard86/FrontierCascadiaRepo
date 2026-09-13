import { EmbedBuilder } from 'discord.js';

/**
 * Builds the Double Helix welcome embed.
 * Used for the /dh-help command.
 */
export function buildWelcomeEmbed(): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle('🧬 Welcome to Double Helix')
        .setDescription(
            "Double Helix lets a whole group share **one live Claude Code session** " +
            "instead of everyone running their own. Start a session, pull your friends " +
            "into it, and you're all typing into the same conversation, same files, same " +
            "agent — real multiplayer programming, powered by Claude Code with the " +
            "Superpowers agentic framework running underneath."
        )
        .addFields(
            {
                name: '📗 Commands',
                value:
                    '`/create <Git repository URL> [branch]` — spin up a new session\n' +
                    '`/invite @user` — pull someone into your session\n' +
                    '`/kick @user` — banish somebody from your session\n' +
                    '`/shell <command>` — run a shell command in your session\n' +
                    '`/end` — end the session for everyone',
            },
            {
                name: '🫂 Trust & permissions',
                value:
                    "Everyone invited into a session is **equally trusted by default** — " +
                    "anyone can ask Claude to run commands, edit files, or commit changes. " +
                    "The person who runs `/create` sets the trust level for that session up " +
                    "front, so check with them if you're unsure what you can do.",
            },
            {
                name: '⚠️ Heads up',
                value:
                    "It's one shared environment per session — everyone feels the consequences." +
                    "Claude will confirm in-channel before anything destructive or hard to undo " +
                    "(force-pushes, deletes, resets), no matter who asks. Play nice with " +
                    "your session-mates.",
            }
        )
        .setFooter({ text: 'Double Helix — multiplayer agentic programming with Claude' });
}
