import { addSubscription, removeSubscription, getSubscriptions } from '../services/db.js';

export async function handleDiscordInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const channelId = interaction.channelId;

  if (commandName === 'subscribe') {
    const keyword = interaction.options.getString('keyword');
    addSubscription(channelId, keyword);
    await interaction.reply(`✅ Đã đăng ký nhận thông báo cho từ khóa: **${keyword}**`);
  } else if (commandName === 'unsubscribe') {
    const keyword = interaction.options.getString('keyword');
    removeSubscription(channelId, keyword);
    await interaction.reply(`🚫 Đã hủy đăng ký từ khóa: **${keyword}**`);
  } else if (commandName === 'subscriptions') {
    const subs = getSubscriptions(channelId);
    if (subs.length === 0) {
      await interaction.reply('Kênh này chưa đăng ký từ khóa nào.');
    } else {
      await interaction.reply(`📋 Các từ khóa đang đăng ký:\n${subs.map(k => `- **${k}**`).join('\n')}`);
    }
  }
}
