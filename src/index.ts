import { Client, GatewayIntentBits } from 'discord.js';
import type { TextChannel } from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN || '';
const GUILD_ID = process.env.GUILD_ID || '';
const CHANNEL_ID = process.env.CHANNEL_ID || '';
const PORT = parseInt(process.env.PORT || '7125', 10);

if (!TOKEN || !CHANNEL_ID) {
    console.error('Error: DISCORD_TOKEN and CHANNEL_ID are required in .env');
    process.exit(1);
}

let resolvedChannelId: string | null = null;

async function resolveChannelId(client: Client, identifier: string): Promise<string> {
    // Check if identifier is already a snowflake
    if (/^\d{17,19}$/.test(identifier)) {
        return identifier;
    }

    if (!GUILD_ID) {
        throw new Error('GUILD_ID is required when using channel names for resolution');
    }

    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) {
        throw new Error(`Guild with ID ${GUILD_ID} not found`);
    }

    const channel = guild.channels.cache.find(c => c.name === identifier && c.isTextBased());
    if (!channel) {
        throw new Error(`Text channel with name "${identifier}" not found in guild ${guild.name}`);
    }

    return channel.id;
}


// Discord Client Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


client.on('clientReady', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    try {
        resolvedChannelId = await resolveChannelId(client, CHANNEL_ID);
        console.log(`Resolved channel ID: ${resolvedChannelId}`);
    } catch (error) {
        console.error('Failed to resolve channel ID:', error);
        process.exit(1);
    }
});

client.on('messageCreate', async (message) => {
    // Only track messages from the designated channel
    if (message.channelId === resolvedChannelId) {
        console.log(`[Discord] ${message.author.username}: ${message.content}`);


    }
});

// Express Server Setup
const app = express();
app.use(express.json());

// POST /send - Send message to Discord
app.post('/send', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message content is required' });
    }

    try {
        if (!resolvedChannelId) {
            return res.status(503).json({ error: 'Bot is not ready; channel resolution pending' });
        }
        const channel = await client.channels.fetch(resolvedChannelId);
        if (!channel || !channel.isTextBased()) {
            return res.status(404).json({ error: 'Target channel not found or is not a text channel' });
        }


        await (channel as TextChannel).send(message);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message to Discord' });
    }
});


const server = createServer(app);
server.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`);
});

client.login(TOKEN).catch((err) => {
    console.error('Failed to login to Discord:', err);
});
