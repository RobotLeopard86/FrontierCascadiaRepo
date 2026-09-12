import dotenv from 'dotenv';
import { initDiscord } from './discord';
import { initAPI } from './api';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN || '';
const CHANNEL_ID = process.env.CHANNEL_ID || '';
const PORT = parseInt(process.env.PORT || '7125', 10);

// 'bot' (default): full Discord bridge + API, for the main bot machine.
// 'llm-relay': API only, no Discord login — for a machine (e.g. the Pi)
// that just serves /internal/local-llm to a remote 'bot' instance.
const ROLE = process.env.ROLE || 'bot';

async function main() {
    if (ROLE === 'llm-relay') {
        try {
            await initApi(PORT);
            console.log('Application started successfully (llm-relay role, Discord not started).');
        } catch (error) {
            console.error('Application failed to start:', error);
            process.exit(1);
        }
        return;
    }

    if (!TOKEN || !CHANNEL_ID) {
        console.error('Error: DISCORD_TOKEN and CHANNEL_ID are required in .env');
        process.exit(1);
    }

    try {
	await initAPI();
        await initDiscord();
        console.log('Application started successfully.');
    } catch (error) {
        console.error('Application failed to start:', error);
        process.exit(1);
    }
}

main();
