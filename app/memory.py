import json
import redis
from app.config import settings

# Initialize Redis client using Upstash Cloud URL
redis_client = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True
)

def get_session_history(business_id: str, customer_id: str) -> list:
    """Retrieve full conversation history for a given session without truncation."""
    key = f"chat_history:{business_id}:{customer_id}"
    try:
        history_json = redis_client.get(key)
        if history_json:
            return json.loads(history_json)
    except Exception as e:
        print(f"[Redis Error] Failed to get session history: {e}")
    return []

def save_session_history(business_id: str, customer_id: str, history: list):
    """
    Save the updated conversation history permanently.
    No TTL applied so history remains permanently on Upstash.
    """
    key = f"chat_history:{business_id}:{customer_id}"
    try:
        redis_client.set(name=key, value=json.dumps(history))
    except Exception as e:
        print(f"[Redis Error] Failed to save session history: {e}")

def clear_session_history(business_id: str, customer_id: str):
    """Delete conversation history if a reset is requested."""
    key = f"chat_history:{business_id}:{customer_id}"
    try:
        redis_client.delete(key)
    except Exception as e:
        print(f"[Redis Error] Failed to delete session history: {e}")