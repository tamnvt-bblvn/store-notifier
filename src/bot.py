"""Forward messages from a source channel to target channels by keyword match."""

from __future__ import annotations

import logging
import sys

import discord
from discord.ext import commands

from src.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("store-notifier")


def _build_search_text(message: discord.Message) -> str:
    parts: list[str] = []
    if message.content:
        parts.append(message.content)
    if message.embeds:
        e = message.embeds[0]
        if e.title:
            parts.append(e.title)
        if e.description:
            parts.append(e.description)
        for f in e.fields:
            parts.append(f.name)
            parts.append(f.value)
        if e.footer and e.footer.text:
            parts.append(e.footer.text)
    return " ".join(parts).lower()


def _clone_embed(embed: discord.Embed) -> discord.Embed:
    return discord.Embed.from_dict(embed.to_dict())


def main() -> None:
    token, source_channel_id, channel_map = get_settings()

    intents = discord.Intents.default()
    intents.message_content = True
    bot = commands.Bot(command_prefix="!", intents=intents)

    @bot.event
    async def on_ready() -> None:
        log.info("Bot online: %s (%s)", bot.user, bot.user.id if bot.user else "?")

    @bot.event
    async def on_message(message: discord.Message) -> None:
        if message.author == bot.user:
            return
        if message.channel.id != source_channel_id:
            return

        content_lower = _build_search_text(message)

        for keyword, target_id in channel_map.items():
            if keyword.lower() not in content_lower:
                continue

            target_channel = bot.get_channel(target_id)
            if target_channel is None:
                log.warning(
                    "Channel id %s not in cache (keyword %r). Check id and bot membership.",
                    target_id,
                    keyword,
                )
                continue

            try:
                if message.embeds:
                    embed_copy = _clone_embed(message.embeds[0])
                    await target_channel.send(
                        content=f"📢 Thông báo mới cho **{keyword}**:",
                        embed=embed_copy,
                    )
                else:
                    await target_channel.send(
                        f"📢 **{keyword}**: {message.content}"
                    )
            except discord.Forbidden:
                log.exception(
                    "Missing permission to send in channel %s (keyword %r)",
                    target_id,
                    keyword,
                )
            except discord.HTTPException:
                log.exception(
                    "Discord API error sending to channel %s (keyword %r)",
                    target_id,
                    keyword,
                )
            break

    bot.run(token)


if __name__ == "__main__":
    main()
