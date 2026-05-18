"""Load environment and channel keyword → destination channel mapping."""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv


def _load_dotenv() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(env_path)


def _parse_channel_map(raw: str) -> dict[str, int]:
    raw = raw.strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(
            "CHANNEL_MAP_JSON must be valid JSON object, e.g. "
            '{"App_A":"111...","pkg":"222..."}'
        ) from e
    if not isinstance(data, dict):
        raise ValueError("CHANNEL_MAP_JSON must be a JSON object (key -> channel id).")
    out: dict[str, int] = {}
    for key, val in data.items():
        if not isinstance(key, str):
            raise ValueError(f"Keyword keys must be strings, got {type(key).__name__}")
        try:
            out[key] = int(val)
        except (TypeError, ValueError) as e:
            raise ValueError(
                f"Channel id for keyword {key!r} must be an integer or numeric string."
            ) from e
    return out


_load_dotenv()

DISCORD_TOKEN: str | None = os.getenv("DISCORD_TOKEN")
SOURCE_CHANNEL_ID_RAW: str | None = os.getenv("SOURCE_CHANNEL_ID")
CHANNEL_MAP_JSON_RAW: str | None = os.getenv("CHANNEL_MAP_JSON")


def get_settings() -> tuple[str, int, dict[str, int]]:
    if not DISCORD_TOKEN or not DISCORD_TOKEN.strip():
        raise RuntimeError("Missing DISCORD_TOKEN in environment or .env")
    if not SOURCE_CHANNEL_ID_RAW or not SOURCE_CHANNEL_ID_RAW.strip():
        raise RuntimeError("Missing SOURCE_CHANNEL_ID in environment or .env")
    try:
        source_id = int(SOURCE_CHANNEL_ID_RAW.strip())
    except ValueError as e:
        raise RuntimeError("SOURCE_CHANNEL_ID must be an integer.") from e
    if not CHANNEL_MAP_JSON_RAW or not CHANNEL_MAP_JSON_RAW.strip():
        raise RuntimeError("Missing CHANNEL_MAP_JSON in environment or .env")
    channel_map = _parse_channel_map(CHANNEL_MAP_JSON_RAW)
    if not channel_map:
        raise RuntimeError("CHANNEL_MAP_JSON parsed to an empty map; add at least one entry.")
    return DISCORD_TOKEN.strip(), source_id, channel_map
