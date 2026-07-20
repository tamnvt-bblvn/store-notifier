import pkg from "@slack/bolt";
const { App } = pkg;
import ngrok from "ngrok";
import { ENV } from "./config/env.js";
import { handleSlackMessage } from "./handlers/message.js";
import { initDb } from './services/db.js';
import { startDiscordBot } from './services/discord-bot.js';

const app = new App({
  token: ENV.SLACK_BOT_TOKEN,
  signingSecret: ENV.SLACK_SIGNING_SECRET,
  logLevel: 'debug', // Bật debug để xem toàn bộ request từ Slack
});

app.message(handleSlackMessage);

(async () => {
  try {
    initDb();
    await startDiscordBot();
    
    await app.start(ENV.PORT);
    console.log(`⚡️ Slack-to-Discord Bot is running on port ${ENV.PORT}!`);

    // Only start ngrok in development
    if (ENV.NODE_ENV !== "production") {
      console.log("Starting ngrok tunnel...");
      const ngrokConfig = { addr: ENV.PORT };
      if (ENV.NGROK_AUTH_TOKEN) {
        ngrokConfig.authtoken = ENV.NGROK_AUTH_TOKEN;
      }
      if (ENV.NGROK_DOMAIN) {
        ngrokConfig.domain = ENV.NGROK_DOMAIN;
      }
      
      const url = await ngrok.connect(ngrokConfig);
      console.log(`[Ngrok] Forwarding URL: ${url}`);
      console.log(`[Ngrok] Please copy this URL to your Slack App configuration.`);
    }
  } catch (error) {
    console.error("Failed to start app:", error);
  }
})();
