import { findChannelsByKeyword } from "../services/db.js";
import { sendToDiscordChannels } from "../services/discord-bot.js";

// Helper để format link của Slack sang Markdown của Discord
function formatSlackText(text) {
  if (typeof text !== 'string') return text;
  
  let formatted = text.replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>');
                       
  formatted = formatted.replace(/<([^|>]+)\|([^>]+)>/g, '[$2]($1)'); // <URL|Text> -> [Text](URL)
  formatted = formatted.replace(/<([^|>]+)>/g, '$1'); // <URL> -> URL
                       
  return formatted;
}

export async function handleSlackMessage({ message, client }) {
  try {
    let username = "Unknown";
    let avatarUrl = "";

    // 1. Nếu tin nhắn gửi từ Webhook/Bot
    if (message.bot_id || message.subtype === 'bot_message') {
      username = message.username || "Bot/Webhook";
      avatarUrl = message.icons?.image_512 || message.icons?.image_72 || message.icons?.image_48 || "";
    } 
    // 2. Nếu tin nhắn gửi từ người dùng thật
    else if (message.user) {
      const userInfo = await client.users.info({ user: message.user });
      username = userInfo.user.profile.display_name || userInfo.user.profile.real_name;
      avatarUrl = userInfo.user.profile.image_512;
    } 
    // 3. Các loại tin nhắn hệ thống khác thì bỏ qua (ví dụ: channel_join)
    else {
      return;
    }

    let embeds = [];
    if (message.attachments && message.attachments.length > 0) {
      embeds = message.attachments.map(att => {
        const embed = {};
        if (att.title) embed.title = formatSlackText(att.title);
        if (att.text) embed.description = formatSlackText(att.text);
        
        // Không dùng fallback làm description nếu đã có fields, vì Slack cũng ẩn fallback khi có fields
        // Điều này giúp tránh bị lặp nội dung với content của message
        if (att.fallback && !att.text && (!att.fields || att.fields.length === 0)) {
          embed.description = formatSlackText(att.fallback);
        }
        
        if (att.color) {
          let colorHex = att.color;
          if (colorHex === 'good') colorHex = '#2eb886';
          else if (colorHex === 'warning') colorHex = '#daa038';
          else if (colorHex === 'danger') colorHex = '#a30200';
          
          if (colorHex.startsWith('#')) {
            embed.color = parseInt(colorHex.slice(1), 16);
          }
        }
        
        if (att.fields && att.fields.length > 0) {
          const newFields = [];
          let inlineCount = 0;
          for (const f of att.fields) {
            const isInline = f.short !== undefined ? f.short : false;
            
            if (isInline) {
              if (inlineCount === 2) {
                // Đã có 2 field trên cùng 1 hàng, chèn một field trống để ép Discord xuống dòng (vì Discord hiển thị max 3 inline field 1 hàng)
                newFields.push({ name: "\u200b", value: "\u200b", inline: true });
                inlineCount = 0;
              }
              inlineCount++;
            } else {
              inlineCount = 0;
            }
            
            newFields.push({
              name: formatSlackText(f.title) || "\u200b",
              value: formatSlackText(f.value) || "\u200b",
              inline: isInline
            });
          }
          embed.fields = newFields;
        }
        return embed;
      });
    }

    let fullTextToSearch = message.text || "";
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach(att => {
        if (att.title) fullTextToSearch += " " + att.title;
        if (att.text) fullTextToSearch += " " + att.text;
        if (att.fallback) fullTextToSearch += " " + att.fallback;
        if (att.fields) {
          att.fields.forEach(f => {
            fullTextToSearch += " " + (f.title || "") + " " + (f.value || "");
          });
        }
      });
    }

    const payload = {
      content: formatSlackText(message.text) || "",
      username: `${username} (từ Slack)`,
      avatar_url: avatarUrl, // Discord.js expects avatar_url or icon_url for webhooks, but send() uses slightly different format. Wait, send() doesn't support custom username/avatar_url on normal messages unless using a WebhookClient! 
      embeds
    };
    
    // Wait, discord.js channel.send() doesn't allow overriding username/avatar_url for the bot!
    // We should either keep using webhooks or just send standard bot messages without fake username/avatar.
    // Let's use standard bot message but prepend the username to the content.
    payload.content = `**Từ Slack (${username})**:\n${payload.content}`;
    delete payload.username;
    delete payload.avatar_url;

    const targetChannelIds = findChannelsByKeyword(fullTextToSearch);
    
    if (targetChannelIds.length > 0) {
      await sendToDiscordChannels(targetChannelIds, payload);
    } else {
      console.log(`[Slack] Message from ${username} had no matching keyword subscriptions.`);
    }
  } catch (error) {
    console.error("[Slack] Error processing message:", error.message);
  }
}
