# ⚡️ Slack to Discord Forwarding Bot

A professional, lightweight Node.js bot that automatically forwards messages from a Slack Workspace to a Discord Server using Webhooks. Built with modern ES Modules, `@slack/bolt`, and automatic `ngrok` tunneling for a seamless local development experience.

---

## 🚀 Features

- **Real-time Forwarding**: Instantly forwards any message from Slack channels where the bot is invited to a designated Discord channel.
- **User Identity Preservation**: Captures the sender's Slack display name and avatar, presenting them beautifully on Discord.
- **Bot/System Filtering**: Automatically ignores messages from itself or other bots to prevent infinite loops.
- **Ngrok Auto-Tunneling**: Automatically exposes your local development server to the internet, providing a ready-to-use Public URL for Slack's Event Subscriptions.
- **Modern Architecture**: Built with `pnpm` and ES Modules for fast, clean, and maintainable code.

---

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Libraries**:
  - [`@slack/bolt`](https://slack.dev/bolt-js/): Official Slack framework for building apps.
  - [`axios`](https://axios-http.com/): Promise-based HTTP client for calling Discord Webhooks.
  - [`ngrok`](https://www.npmjs.com/package/ngrok): Automatically exposes local port 3000 to the internet.
  - [`dotenv`](https://www.npmjs.com/package/dotenv): Environment variable management.

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following:

1. **Node.js** installed (v16 or higher recommended).
2. **pnpm** installed (`npm install -g pnpm`).
3. A **Slack App** created at [api.slack.com/apps](https://api.slack.com/apps).
4. A **Discord Webhook URL** created in your Discord server's channel settings.

---

## 📦 Installation

1. **Clone or download** this repository.
2. **Navigate** to the project directory:
   ```bash
   cd slack-to-discord-bot
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```

---

## 🔑 Environment Setup

Create a `.env` file in the root directory and add the following configuration:

```env
# 1. Slack Credentials (Lấy từ phần Basic Information & OAuth & Permissions)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# 2. Discord Webhook
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id/your-webhook-token

# 3. App Settings
PORT=3000
NODE_ENV=development

# (Optional) Ngrok Auth Token để tránh bị giới hạn session
NGROK_AUTH_TOKEN=your-ngrok-auth-token
```

---

## 💻 Running the App

### Development Mode (with Hot Reload & Ngrok)
```bash
pnpm run dev
```
*In development mode, the app will auto-restart when files change and automatically start an `ngrok` tunnel, printing a Public URL to your console.*

### Production Mode
```bash
pnpm run start
```
*In production mode, `ngrok` is disabled. Ensure you deploy the app to a hosting provider and update your Slack Request URL accordingly.*

---

## 🔗 Slack Configuration Guide

Once your local server is running via `pnpm run dev`, follow these steps to connect Slack:

1. Look at your terminal for the generated **Ngrok Forwarding URL** (e.g., `https://xxxx.ngrok-free.app`).
2. Go to your Slack App configuration dashboard.
3. Navigate to **Event Subscriptions** and turn on **Enable Events**.
4. In the **Request URL** field, paste your Ngrok URL and append `/slack/events` at the end:
   ```text
   https://xxxx.ngrok-free.app/slack/events
   ```
   *Wait for the green `Verified` checkmark to appear.*
5. Under **Subscribe to bot events**, add the `message.channels` event (and `message.groups` if using private channels).
6. **Save Changes** and reinstall your app to the workspace if prompted.
7. **Invite the bot** to the Slack channels you want it to listen to (`/invite @YourBotName`).

---

## 📂 Project Structure

```text
slack-to-discord-bot/
├── src/
│   ├── config/
│   │   └── env.js           # Environment variable validation & exports
│   ├── handlers/
│   │   └── message.js       # Slack message event logic
│   ├── services/
│   │   └── discord.js       # Discord Webhook communication
│   └── index.js             # Main entry point & Ngrok initialization
├── package.json             # Project metadata & scripts
├── pnpm-lock.yaml           # Dependency tree
└── .env                     # (Ignored) Secrets and configs
```
