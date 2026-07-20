# Slack to Discord Bot Refactoring Design

## Goal
Rebuild the existing slack-to-discord-bot project to use a professional ES Modules architecture, migrate to `pnpm`, and integrate `ngrok` for local development forwarding.

## Architecture & Setup
- **Package Manager:** `pnpm`
- **Module System:** ES Modules (`type: "module"`)
- **Dependencies:** 
  - `dotenv` for environment variables.
  - `@slack/bolt` for Slack bot integration.
  - `axios` for Discord webhooks.
  - `ngrok` for exposing the local server to internet during development.
  - `nodemon` (devDependency) for auto-restarting.

## Directory Structure
- `src/config/env.js`: Reads, validates, and exports environment variables.
- `src/services/discord.js`: Handles communication with the Discord webhook.
- `src/handlers/message.js`: Processes incoming Slack messages and invokes the Discord service.
- `src/index.js`: Main entry point. Initializes the Slack app, attaches message handlers, starts the server, and conditionally establishes an ngrok tunnel.

## Workflow
1. Initialize the project with `pnpm`.
2. Restructure files into the `src/` directory.
3. Update `package.json` with new scripts and module type.
4. Implement the components according to the defined structure.
5. Verify functionality.
