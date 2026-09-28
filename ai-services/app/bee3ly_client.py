"""HTTP client for NestJS bee3ly APIs (session context + sales tools)."""
from __future__ import annotations

import requests

from app.config import settings


def _headers(bearer_token: str) -> dict:
    return {
        "Authorization": f"Bearer {bearer_token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
    }


def fetch_session_context(
    bearer_token: str,
    conversation_id: str,
    customer_id: str,
    message: str,
) -> dict:
    url = f"{settings.BEE3LY_API_URL.rstrip('/')}/ai/session-context"
    res = requests.post(
        url,
        headers=_headers(bearer_token),
        json={
            "conversationId": conversation_id,
            "customerId": customer_id,
            "message": message,
        },
        timeout=20,
    )
    if res.status_code != 200:
        print(f"[bee3ly] session-context {res.status_code}: {res.text[:300]}")
        return {"contextBlock": "", "governorateIds": []}
    return res.json()


def run_tool(
    bearer_token: str,
    conversation_id: str,
    customer_id: str,
    tool: str,
    args: dict | None,
    message: str,
) -> dict:
    url = f"{settings.BEE3LY_API_URL.rstrip('/')}/ai/run-tool"
    res = requests.post(
        url,
        headers=_headers(bearer_token),
        json={
            "conversationId": conversation_id,
            "customerId": customer_id,
            "tool": tool,
            "args": args or {},
            "message": message,
        },
        timeout=30,
    )
    try:
        body = res.json()
    except Exception:
        body = {"error": res.text}
    if res.status_code >= 400:
        err = body.get("message") if isinstance(body, dict) else res.text
        if isinstance(body, dict) and isinstance(body.get("message"), list):
            err = "; ".join(str(x) for x in body["message"])
        return {"error": err or f"HTTP {res.status_code}"}
    return body if isinstance(body, dict) else {"result": body}
