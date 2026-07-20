import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  SOURCE_CHANNEL_IDS: process.env.SOURCE_CHANNEL_IDS,
  NGROK_AUTH_TOKEN: process.env.NGROK_AUTH_TOKEN,
  NGROK_DOMAIN: process.env.NGROK_DOMAIN,
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development"
};

// Validate required
const required = ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "DISCORD_BOT_TOKEN"];
for (const req of required) {
  if (!ENV[req]) {
    console.warn(`[WARNING] Missing required environment variable: ${req}`);
  }
}
