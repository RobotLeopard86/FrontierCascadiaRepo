import dotenv from 'dotenv';
import { initDiscord } from './discord';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN || '';
const CHANNEL_ID = process.env.CHANNEL_ID || '';

async function main() {
    if (!TOKEN || !CHANNEL_ID) {
        console.error('Error: DISCORD_TOKEN and CHANNEL_ID are required in .env');
        process.exit(1);
    }

    try {
        await initDiscord();
        console.log('Application started successfully.');
    } catch (error) {
        console.error('Application failed to start:', error);
        process.exit(1);
    }
}

main();
