# Unified Bot Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the Python `store-notifier` bot into `slack-to-discord-bot` (Node.js) to route messages from Slack and Discord source channels to dynamic target channels using SQLite and slash commands.

**Architecture:** We will add `discord.js` and `better-sqlite3` to the Node.js project. We will create a database service to manage channel subscriptions, a Discord service to handle bot login and slash commands, and refactor the Slack handler to route messages via the Discord bot instead of webhooks.

**Tech Stack:** Node.js, `@slack/bolt`, `discord.js`, `better-sqlite3`.

## Global Constraints

- Must keep existing Slack `formatSlackText` logic intact.
- Use ES modules (`import`/`export`).
- SQLite DB file must be saved as `database.sqlite` in project root.

---

### Task 1: Database Setup

**Files:**
- Create: `src/services/db.js`

**Interfaces:**
- Produces: `initDb()`, `addSubscription(channelId, keyword)`, `removeSubscription(channelId, keyword)`, `getSubscriptions(channelId)`, `findChannelsByKeyword(text)`

- [ ] **Step 1: Install `better-sqlite3`**
```bash
pnpm add better-sqlite3
```

- [ ] **Step 2: Write minimal implementation for `db.js`**
```javascript
import Database from 'better-sqlite3';
import path from 'path';

let db;

export function initDb() {
  db = new Database('database.sqlite');
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      UNIQUE(channel_id, keyword)
    )
  `);
}

export function addSubscription(channelId, keyword) {
  const stmt = db.prepare('INSERT OR IGNORE INTO subscriptions (channel_id, keyword) VALUES (?, ?)');
  stmt.run(channelId, keyword);
}

export function removeSubscription(channelId, keyword) {
  const stmt = db.prepare('DELETE FROM subscriptions WHERE channel_id = ? AND keyword = ?');
  stmt.run(channelId, keyword);
}

export function getSubscriptions(channelId) {
  const stmt = db.prepare('SELECT keyword FROM subscriptions WHERE channel_id = ?');
  return stmt.all(channelId).map(row => row.keyword);
}

export function findChannelsByKeyword(text) {
  const stmt = db.prepare('SELECT channel_id, keyword FROM subscriptions');
  const allSubs = stmt.all();
  
  const matches = new Set();
  const lowerText = text.toLowerCase();
  
  for (const sub of allSubs) {
    if (lowerText.includes(sub.keyword.toLowerCase())) {
      matches.add(sub.channel_id);
    }
  }
  return Array.from(matches);
}
```

### Task 2: Discord Bot Service & Slash Commands

**Files:**
- Create: `src/services/discord-bot.js`
- Create: `src/handlers/discord-commands.js`

**Interfaces:**
- Consumes: `ENV.DISCORD_BOT_TOKEN`, Database functions
- Produces: `startDiscordBot()`, `sendToDiscordChannels(channelIds, payload)`

- [ ] **Step 1: Install `discord.js`**
```bash
pnpm add discord.js
```

- [ ] **Step 2: Write `src/handlers/discord-commands.js`**
```javascript
import { addSubscription, removeSubscription, getSubscriptions } from '../services/db.js';

export async function handleDiscordInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const channelId = interaction.channelId;

  if (commandName === 'subscribe') {
    const keyword = interaction.options.getString('keyword');
    addSubscription(channelId, keyword);
    await interaction.reply(\`✅ Đã đăng ký nhận thông báo cho từ khóa: **\${keyword}**\`);
  } else if (commandName === 'unsubscribe') {
    const keyword = interaction.options.getString('keyword');
    removeSubscription(channelId, keyword);
    await interaction.reply(\`🚫 Đã hủy đăng ký từ khóa: **\${keyword}**\`);
  } else if (commandName === 'subscriptions') {
    const subs = getSubscriptions(channelId);
    if (subs.length === 0) {
      await interaction.reply('Kênh này chưa đăng ký từ khóa nào.');
    } else {
      await interaction.reply(\`📋 Các từ khóa đang đăng ký:\n\${subs.map(k => \`- **\${k}**\`).join('\\n')}\`);
    }
  }
}
```

- [ ] **Step 3: Write `src/services/discord-bot.js`**
```javascript
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { ENV } from '../config/env.js';
import { handleDiscordInteraction } from '../handlers/discord-commands.js';

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
    console.log(\`[Discord] Bot is online as \${discordClient.user.tag}\`);
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
      console.error(\`[Discord] Error sending to channel \${channelId}:\`, error.message);
    }
  }
}
```

### Task 3: Slack to Discord Routing Update

**Files:**
- Modify: `src/handlers/message.js`

**Interfaces:**
- Consumes: `findChannelsByKeyword(text)` and `sendToDiscordChannels(channelIds, payload)`
- Produces: Updated Slack handling without hardcoded webhooks

- [ ] **Step 1: Replace axios webhook with Database + Discord Bot logic**
Modify `src/handlers/message.js` to search for keyword and send via `sendToDiscordChannels`.

```javascript
// Extract text content from message to search for keywords
import { findChannelsByKeyword } from '../services/db.js';
import { sendToDiscordChannels } from '../services/discord-bot.js';

// (keep existing formatSlackText)

export async function handleSlackMessage({ message, client }) {
  try {
    let username = "Unknown";
    let avatarUrl = "";
    // ... keep user identification code ...

    let embeds = [];
    let fullTextToSearch = message.text || "";

    if (message.attachments && message.attachments.length > 0) {
      // ... keep embed mapping code ...
      // Add attachment text to search scope
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
      username: \`\${username} (từ Slack)\`,
      avatar_url: avatarUrl,
      embeds
    };

    // Find subscribed channels
    const targetChannelIds = findChannelsByKeyword(fullTextToSearch);
    
    if (targetChannelIds.length > 0) {
      await sendToDiscordChannels(targetChannelIds, payload);
    } else {
      console.log(\`[Slack] Message from \${username} had no matching keyword subscriptions.\`);
    }

  } catch (error) {
    console.error("[Slack] Error processing message:", error.message);
  }
}
```

### Task 4: Discord to Discord Forwarding (Python Port)

**Files:**
- Create: `src/handlers/discord-message.js`
- Modify: `src/services/discord-bot.js`

**Interfaces:**
- Consumes: `ENV.SOURCE_CHANNEL_IDS`

- [ ] **Step 1: Write `src/handlers/discord-message.js`**
```javascript
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
  const payload = {
    content: message.content ? \`\${intro}\\n\${message.content}\` : intro,
    embeds: message.embeds
  };

  await sendToDiscordChannels(safeTargetIds, payload);
}
```

- [ ] **Step 2: Bind to discordClient in `src/services/discord-bot.js`**
Add this near the end of `startDiscordBot()`:
```javascript
  import { handleDiscordMessage } from '../handlers/discord-message.js';
  discordClient.on('messageCreate', handleDiscordMessage);
```

### Task 5: Integration & Bootstrapping

**Files:**
- Modify: `src/index.js`
- Modify: `src/config/env.js`

- [ ] **Step 1: Update `src/config/env.js` required fields**
Remove `DISCORD_WEBHOOK_URL` from required array, add `DISCORD_BOT_TOKEN`.
```javascript
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  SOURCE_CHANNEL_IDS: process.env.SOURCE_CHANNEL_IDS
```
Update required validation to require `DISCORD_BOT_TOKEN`.

- [ ] **Step 2: Initialize DB and Bot in `src/index.js`**
```javascript
import { initDb } from './services/db.js';
import { startDiscordBot } from './services/discord-bot.js';

(async () => {
  try {
    initDb();
    await startDiscordBot();
    
    await app.start(ENV.PORT);
    console.log(\`⚡️ Slack-to-Discord Bot is running on port \${ENV.PORT}!\`);
    // ... ngrok logic ...
  } catch (error) {
    console.error("Failed to start app:", error);
  }
})();
```
