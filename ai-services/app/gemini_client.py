"""Shared Gemini client — short HTTP deadline, no 60s SDK retry backoff."""
from __future__ import annotations

from google import genai
from google.genai import types

from app.config import settings


def gemini_client() -> genai.Client:
    return genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=types.HttpOptions(
            timeout=settings.GEMINI_HTTP_TIMEOUT_MS,
            retry_options=types.HttpRetryOptions(
                attempts=1,
            ),
        ),
    )


def model_candidates() -> list[str]:
    primary = settings.GEMINI_MODEL.strip()
    extra = [
        m.strip()
        for m in settings.GEMINI_MODEL_FALLBACKS.split(",")
        if m.strip()
    ]
    out: list[str] = []
    for name in [primary, *extra]:
        if name and name not in out:
            out.append(name)
    return out or ["gemini-flash-latest"]


def _try_next_model(exc: Exception) -> bool:
    text = str(exc).lower()
    return (
        "503" in text
        or "unavailable" in text
        or "404" in text
        or "not found" in text
        or "high demand" in text
    )


def generate_content(
    client: genai.Client,
    *,
    contents,
    config: types.GenerateContentConfig | None = None,
):
    last_exc: Exception | None = None
    for model in model_candidates():
        try:
            kwargs: dict = {"model": model, "contents": contents}
            if config is not None:
                kwargs["config"] = config
            return client.models.generate_content(**kwargs)
        except Exception as e:
            last_exc = e
            if _try_next_model(e):
                print(f"[Gemini] model {model} unavailable, trying next…")
                continue
            raise
    if last_exc:
        raise last_exc
    raise RuntimeError("No Gemini model configured")
