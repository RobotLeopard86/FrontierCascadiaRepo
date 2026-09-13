# HelixBot
#### Collaborative agentic coding

## About
HelixBot is a Discord bot to enable collaborative, agent-driven development on Git repositories via Claude Code. Created by Owen Siebers, Jackson Burrow, Evan Tijerina, and Spencer Hatch for Frontier Cascadia 2026.

## Setup

1. Create `.env` file:
   ```env
   DISCORD_TOKEN=your_bot_token
   GUILD_ID=your_server_id
   CHANNEL_ID=your_default_channel_id
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run in development:
   ```bash
   pnpm dev
   ```

4. Build and start:
   ```bash
   pnpm build
   pnpm start
   ```
