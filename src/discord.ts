import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { processAgentRequest } from './agent.js';

const TOKEN = process.env.DISCORD_TOKEN || '';
const GUILD_ID = process.env.GUILD_ID || '';
const CHANNEL_ID = process.env.CHANNEL_ID || '';

let client: Client;
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

export async function initDiscord() {
    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });

    return new Promise((resolve, reject) => {
        client.once('clientReady', async () => {
            console.log(`Logged in as ${client.user?.tag}!`);
            try {
                resolvedChannelId = await resolveChannelId(client, CHANNEL_ID);
                console.log(`Resolved channel ID: ${resolvedChannelId}`);
                resolve(true);
            } catch (error) {
                console.error('Failed to resolve channel ID:', error);
                reject(error);
            }
        });

        client.on('messageCreate', async (message) => {
            if (message.channelId === resolvedChannelId) {
                console.log(`[Discord] ${message.author.username}: ${message.content}`);

                if (message.content?.startsWith('AGENT REQUEST: ')) {
                    const prompt = message.content.slice('AGENT REQUEST: '.length).trim();
                    try {
                        await processAgentRequest(prompt, async (formatted) => {
                            await sendMessage(formatted);
                        });
                    } catch (error) {
                        console.error('Error processing agent request:', error);
                        await sendMessage(`AGENT REPLY\nType: error\nBody:\nFailed to process agent request.`);
                    }
                }
            }
        });

        client.login(TOKEN).catch((err) => {
            console.error('Failed to login to Discord:', err);
            reject(err);
        });
    });
}

export async function sendMessage(text: string) {
    if (!resolvedChannelId) {
        throw new Error('Bot is not ready; channel resolution pending');
    }
    const channel = await client.channels.fetch(resolvedChannelId);
    if (!channel || !channel.isTextBased()) {
        throw new Error('Target channel not found or is not a text channel');
    }

    await (channel as TextChannel).send(text);
}
