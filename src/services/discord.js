import axios from "axios";
import { ENV } from "../config/env.js";

export async function sendToDiscord({ content, username, avatarUrl, embeds }) {
  if (!ENV.DISCORD_WEBHOOK_URL) return;
  
  const payload = {
    content,
    username: `${username} (from Slack)`,
    avatar_url: avatarUrl,
  };

  if (embeds && embeds.length > 0) {
    payload.embeds = embeds;
  }

  try {
    await axios.post(ENV.DISCORD_WEBHOOK_URL, payload);
    console.log(`[Discord] Message forwarded for ${username}`);
  } catch (error) {
    console.error("[Discord] Error forwarding message:", error.message);
  }
}
