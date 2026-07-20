import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { ENV } from '../config/env.js';
import { handleDiscordInteraction } from '../handlers/discord-commands.js';
import { handleDiscordMessage } from '../handlers/discord-message.js';

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Đăng ký nhận thông báo theo từ khóa')
    .addStringOption(option => 
      option.setName('keyword').setDescription('Từ khóa nhận diện').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Hủy đăng ký nhận thông báo')
    .addStringOption(option => 
      option.setName('keyword').setDescription('Từ khóa nhận diện').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('subscriptions')
    .setDescription('Xem danh sách từ khóa đang đăng ký')
];

export async function startDiscordBot() {
  if (!ENV.DISCORD_BOT_TOKEN) {
    console.warn('[Discord] No DISCORD_BOT_TOKEN provided, skipping bot start.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(ENV.DISCORD_BOT_TOKEN);

  discordClient.on('ready', async () => {
    console.log(`[Discord] Bot is online as ${discordClient.user.tag}`);
    try {
      await rest.put(
        Routes.applicationCommands(discordClient.user.id),
        { body: commands },
      );
      console.log('[Discord] Registered slash commands.');
    } catch (error) {
      console.error('[Discord] Failed to register commands:', error);
    }
  });

  discordClient.on('interactionCreate', handleDiscordInteraction);
  discordClient.on('messageCreate', handleDiscordMessage);

  await discordClient.login(ENV.DISCORD_BOT_TOKEN);
}

export async function sendToDiscordChannels(channelIds, payload) {
  for (const channelId of channelIds) {
    try {
      const channel = await discordClient.channels.fetch(channelId);
      if (channel) {
        await channel.send(payload);
      }
    } catch (error) {
      console.error(`[Discord] Error sending to channel ${channelId}:`, error.message);
    }
  }
}
