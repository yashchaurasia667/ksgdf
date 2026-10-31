from datetime import datetime, timedelta
from typing import Any

cache: dict[str, dict] = {}


def get(key: str) -> Any | None:
    entry = cache.get(key)

    if entry is None:
        return None

    if datetime.now() > entry["expires_at"]:
        del cache[key]
        return None

    return entry["data"]


def set(key: str, data: Any, ttl_seconds: int = 600):
    cache[key] = {
        "data": data,
        "expires_at": datetime.now() + timedelta(seconds=ttl_seconds)
    }
