import json
from typing import Dict

import redis

from app.config import settings

# Fast fail when Redis is not running locally (avoids multi-second hangs on Windows).
redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=1,
    socket_timeout=1,
)

_memory_fallback: Dict[str, str] = {}


def get_session_history(conversation_id: str, customer_id: str) -> list:
    key = f"chat_history:{conversation_id}:{customer_id}"
    try:
        history_json = redis_client.get(key)
        if history_json:
            return json.loads(history_json)
    except Exception as e:
        print(f"[Redis Error] Failed to get session history: {e}")
    raw = _memory_fallback.get(key)
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            return []
    return []


def save_session_history(conversation_id: str, customer_id: str, history: list):
    key = f"chat_history:{conversation_id}:{customer_id}"
    payload = json.dumps(history)
    try:
        redis_client.set(name=key, value=payload)
        return
    except Exception as e:
        print(f"[Redis Error] Failed to save session history: {e}")
    _memory_fallback[key] = payload


def clear_session_history(conversation_id: str, customer_id: str):
    key = f"chat_history:{conversation_id}:{customer_id}"
    _memory_fallback.pop(key, None)
    try:
        redis_client.delete(key)
    except Exception as e:
        print(f"[Redis Error] Failed to delete session history: {e}")
