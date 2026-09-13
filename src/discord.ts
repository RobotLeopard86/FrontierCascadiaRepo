import { Client, GatewayIntentBits, TextChannel, SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, PermissionOverwrites } from 'discord.js';
import { processAgentRequest } from './agent.js';
import { getSession, createSession, deleteSession } from './sessions.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const TOKEN = process.env.DISCORD_TOKEN || '';
const GUILD_ID = process.env.GUILD_ID || '';
const CHANNEL_ID = process.env.CHANNEL_ID || '';

let client: Client;
let resolvedChannelId: string | null = null;

async function registerCommands(client: Client) {
    const commands = [
        new SlashCommandBuilder()
            .setName('create')
            .setDescription('Create a new agent session from a Git repository')
            .addStringOption(opt => opt.setName('url').setDescription('URL to the Git repository').setRequired(true))
            .addStringOption(opt => opt.setName('branch').setDescription('Optional branch to check out')),
        new SlashCommandBuilder()
            .setName('invite')
            .setDescription('Invite a user to the session channel')
            .addUserOption(opt => opt.setName('user').setDescription('User to invite').setRequired(true)),
        new SlashCommandBuilder()
            .setName('kick')
            .setDescription('Remove a user from the session channel')
            .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true)),
        new SlashCommandBuilder()
            .setName('end')
            .setDescription('End the session and merge changes'),
        new SlashCommandBuilder()
            .setName('shell')
            .setDescription('Run a shell command in the agent directory')
            .addStringOption(opt => opt.setName('command').setDescription('Shell command to run').setRequired(true)),
    ];

    try {
        await client.application?.commands.set(commands);
        console.log('Successfully registered slash commands');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
}

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
                await registerCommands(client);
                resolvedChannelId = await resolveChannelId(client, CHANNEL_ID);
                console.log(`Resolved channel ID: ${resolvedChannelId}`);
                resolve(true);
            } catch (error) {
                console.error('Failed to resolve channel ID:', error);
                reject(error);
            }
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const { commandName, options, guild, user, channel } = interaction;

            try {
                if (commandName === 'create') {
                    const url = options.getString('url', true);
                    const branch = options.getString('branch') || 'main';

                    await interaction.deferReply();

                    const agentRoot = path.join(process.cwd(), 'agent');
                    if (!fs.existsSync(agentRoot)) fs.mkdirSync(agentRoot, { recursive: true });

                    const sessionDir = path.join(agentRoot, `session-${Date.now()}`);

                    console.log(`[Create] Cloning ${url} into ${sessionDir}...`);
                    execSync(`git clone ${url} ${sessionDir}`);

                    process.chdir(sessionDir); // Need to be in dir for checkout
                    execSync(`git checkout ${branch}`);
                    const workBranch = `${branch}-dh`;
                    execSync(`git checkout -b ${workBranch}`);
                    process.chdir(process.cwd()); // Go back

                    if (!guild) throw new Error('Command must be used in a guild');

                    const sessionChannel = await guild.channels.create({
                        name: `session-${branch}`,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                                id: user.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                            },
                            {
                                id: client.user!.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                            },
                        ],
                    });

                    createSession(sessionChannel.id, {
                        agentDir: sessionDir,
                        initialBranch: branch,
                        workBranch: workBranch,
                        creatorId: user.id,
                    });

                    await interaction.editReply(`Session created! Join here: <#${sessionChannel.id}>`);
                } else if (commandName === 'invite') {
                    const targetUser = options.getUser('user', true);
                    const session = getSession(channel?.id || '');
                    if (!session) return interaction.reply({ content: 'Not in a session channel', ephemeral: true });

                    await interaction.deferReply();
                    const discordChannel = await client.channels.fetch(channel!.id) as TextChannel;
                    await discordChannel.permissionOverwrites.create(targetUser.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                    });

                    await interaction.editReply(`Invited ${targetUser.username} to the session.`);
                } else if (commandName === 'kick') {
                    const targetUser = options.getUser('user', true);
                    const session = getSession(channel?.id || '');
                    if (!session) return interaction.reply({ content: 'Not in a session channel', ephemeral: true });
                    if (targetUser.id === session.creatorId) return interaction.reply({ content: 'Cannot kick the session creator', ephemeral: true });

                    await interaction.deferReply();
                    const discordChannel = await client.channels.fetch(channel!.id) as TextChannel;
                    await discordChannel.permissionOverwrites.delete(targetUser.id);

                    await interaction.editReply(`Kicked ${targetUser.username} from the session.`);
                } else if (commandName === 'shell') {
                    const command = options.getString('command', true);
                    const session = getSession(channel?.id || '');
                    if (!session) return interaction.reply({ content: 'Not in a session channel', ephemeral: true });

                    await interaction.deferReply();
                    try {
                        const output = execSync(command, { cwd: session.agentDir, encoding: 'utf8' });
                        await interaction.editReply(`**Shell Output:**\n\`\`\`\n${output || 'No output'}\n\`\`\``);
                    } catch (e: any) {
                        await interaction.editReply(`**Shell Error:**\n\`\`\`\n${e.stderr?.toString() || e.message}\n\`\`\``);
                    }
                } else if (commandName === 'end') {
                    const session = getSession(channel?.id || '');
                    if (!session) return interaction.reply({ content: 'Not in a session channel', ephemeral: true });

                    await interaction.deferReply();
                    try {
                        const { agentDir, initialBranch, workBranch } = session;
                        execSync(`git checkout ${initialBranch}`, { cwd: agentDir });
                        execSync(`git merge ${workBranch}`, { cwd: agentDir });
                        execSync(`git branch -d ${workBranch}`, { cwd: agentDir });
                        execSync(`git push origin ${initialBranch}`, { cwd: agentDir });

                        const discordChannel = await client.channels.fetch(channel!.id);
                        if (discordChannel) await discordChannel.delete();

                        deleteSession(channel!.id);

                        await interaction.editReply('Session ended, changes merged and channel deleted.');
                    } catch (e: any) {
                        await interaction.editReply(`**Error ending session:**\n${e.message}`);
                    }
                }
            } catch (error) {
                console.error('Error handling interaction:', error);
                if (interaction.deferred) {
                    await interaction.editReply('An error occurred while processing the command.');
                } else {
                    await interaction.reply({ content: 'An error occurred while processing the command.', ephemeral: true });
                }
            }
        });
        client.on('messageCreate', async (message) => {
            if (message.author.bot) return;

            const session = getSession(message.channelId);

            if (session) {
                // Session channel: no prefix needed
                console.log(`[Session] ${message.author.username}: ${message.content}`);
                try {
                    await processAgentRequest(message.content || '', async (formatted) => {
                        await sendMessage(formatted, message.channelId);
                    }, session.agentDir, session.workBranch);
                } catch (error) {
                    console.error('Error processing session agent request:', error);
                    await sendMessage(`AGENT REPLY\nType: error\nBody:\nFailed to process session request.`, message.channelId);
                }
                return;
            }

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

export async function sendMessage(text: string, channelId?: string) {
    const targetId = channelId || resolvedChannelId;
    if (!targetId) {
        throw new Error('Bot is not ready; channel resolution pending');
    }
    const channel = await client.channels.fetch(targetId);
    if (!channel || !channel.isTextBased()) {
        throw new Error('Target channel not found or is not a text channel');
    }

    await (channel as TextChannel).send(text);
}
