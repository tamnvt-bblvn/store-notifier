import { findChannelsByKeyword } from '../services/db.js';
import { sendToDiscordChannels } from '../services/discord-bot.js';
import { ENV } from '../config/env.js';

export async function handleDiscordMessage(message) {
  if (message.author.bot) return;

  const sourceChannelIds = (ENV.SOURCE_CHANNEL_IDS || "").split(',').map(id => id.trim());
  const isSource = sourceChannelIds.includes(message.channelId) || 
                   (message.channel.parentId && sourceChannelIds.includes(message.channel.parentId));

  if (!isSource) return;

  // Build text to search (content + embeds)
  let fullTextToSearch = message.content || "";
  message.embeds.forEach(e => {
    if (e.title) fullTextToSearch += " " + e.title;
    if (e.description) fullTextToSearch += " " + e.description;
    e.fields.forEach(f => {
      fullTextToSearch += " " + f.name + " " + f.value;
    });
  });

  const targetChannelIds = findChannelsByKeyword(fullTextToSearch);
  if (targetChannelIds.length === 0) return;

  // Xóa channel nguồn ra khỏi đích đến để tránh loop (phòng hờ)
  const safeTargetIds = targetChannelIds.filter(id => id !== message.channelId);
  if (safeTargetIds.length === 0) return;

  const intro = "📢 **Thông báo mới**:";
  
  // Clean embeds to be sent (discord.js allows passing existing embed objects)
  const payload = {
    content: message.content ? `${intro}\n${message.content}` : intro,
    embeds: message.embeds
  };

  await sendToDiscordChannels(safeTargetIds, payload);
}
