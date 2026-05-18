"""Forward messages from a source channel to target channels by keyword match."""

from __future__ import annotations

import logging
import re
import sys

import discord
from discord.ext import commands

from src.config import get_settings

_fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

log = logging.getLogger("store-notifier")
log.setLevel(logging.DEBUG)
if not log.handlers:
    _h = logging.StreamHandler(sys.stdout)
    _h.setFormatter(_fmt)
    _h.setLevel(logging.DEBUG)
    log.addHandler(_h)
log.propagate = False

# Ký tự không hiển thị hay gặp trong webhook → làm lệch substring match (vd. com​.package).
_INVISIBLE_RE = re.compile(r"[\u200b\u200c\u200d\u2060\ufeff]")


def _append_embed_parts(parts: list[str], e: discord.Embed) -> None:
    if e.title:
        parts.append(e.title)
    if e.description:
        parts.append(e.description)
    if e.url:
        parts.append(e.url)
    if e.author and e.author.name:
        parts.append(e.author.name)
    for f in e.fields:
        parts.append(f.name)
        parts.append(f.value)
    if e.footer and e.footer.text:
        parts.append(e.footer.text)


def _normalize_match_text(blob: str) -> str:
    blob = _INVISIBLE_RE.sub("", blob)
    return re.sub(r"\s+", " ", blob).strip().lower()


def _build_search_text(message: discord.Message) -> str:
    parts: list[str] = []
    if message.content:
        parts.append(message.content)
    if message.author:
        parts.append(message.author.name)
        if isinstance(message.author, discord.Member) and message.author.nick:
            parts.append(message.author.nick)
    for e in message.embeds:
        _append_embed_parts(parts, e)
    for snap in message.message_snapshots:
        if snap.content:
            parts.append(snap.content)
        for e in snap.embeds:
            _append_embed_parts(parts, e)
    return _normalize_match_text(" ".join(parts))


def _message_matches_source_channel(
    message: discord.Message, source_channel_ids: frozenset[int]
) -> bool:
    channel_ids: set[int] = {message.channel.id}
    if isinstance(message.channel, discord.Thread):
        if message.channel.parent_id is not None:
            channel_ids.add(message.channel.parent_id)
    return not source_channel_ids.isdisjoint(channel_ids)


def _clone_embed(embed: discord.Embed) -> discord.Embed:
    return discord.Embed.from_dict(embed.to_dict())


def main() -> None:
    token, source_channel_ids, channel_map = get_settings()

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
        if not _message_matches_source_channel(message, source_channel_ids):
            return

        content_lower = _build_search_text(message)

        matched = False
        for keyword, target_id in channel_map.items():
            if _normalize_match_text(keyword) not in content_lower:
                continue
            matched = True

            target_channel = bot.get_channel(target_id)
            if target_channel is None:
                log.warning(
                    "Channel id %s not in cache (keyword %r). Check id and bot membership.",
                    target_id,
                    keyword,
                )
                continue

            try:
                intro = f"📢 Thông báo mới cho **{keyword}**:"
                if message.embeds:
                    embeds_copy = [_clone_embed(e) for e in message.embeds[:10]]
                    await target_channel.send(content=intro, embeds=embeds_copy)
                elif message.message_snapshots:
                    snap = message.message_snapshots[0]
                    snap_embeds = [_clone_embed(e) for e in snap.embeds[:10]]
                    extra = (snap.content or "").strip()
                    if snap_embeds:
                        await target_channel.send(
                            content=intro + (f"\n{extra}" if extra else ""),
                            embeds=snap_embeds,
                        )
                    elif extra:
                        await target_channel.send(f"{intro}\n{extra}")
                    else:
                        await target_channel.send(intro)
                elif message.content:
                    await target_channel.send(f"📢 **{keyword}**: {message.content}")
                else:
                    await target_channel.send(intro)
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

        if not matched and (message.embeds or message.message_snapshots):
            log.debug(
                "No keyword match (channel_id=%s parent=%s). Search preview: %s",
                message.channel.id,
                getattr(message.channel, "parent_id", None),
                content_lower[:500],
            )

    bot.run(token)


if __name__ == "__main__":
    main()
