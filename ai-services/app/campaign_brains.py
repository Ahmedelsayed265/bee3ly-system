"""Campaign Content Creator + Analysis & Decisions brains (Gemini)."""
from __future__ import annotations

import json
import re
from typing import Any

from google.genai import types

from app.gemini_client import gemini_client, generate_content
from app.tools import fetch_live_products, format_products_for_prompt

VALID_VERDICTS = frozenset(
    {
        "SCALE",
        "HOLD",
        "REDUCE_SPEND",
        "PAUSE",
        "STOP",
        "NEEDS_DATA",
    }
)


def _parse_json(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    cleaned = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None


def execute_content_brain(payload: dict[str, Any], bearer_token: str) -> dict[str, Any]:
    products = fetch_live_products(bearer_token)
    catalog = format_products_for_prompt(products)
    product_id = payload.get("productId")
    product_line = ""
    if product_id:
        for p in products:
            pid = p.get("id") if isinstance(p, dict) else None
            if pid == product_id:
                product_line = json.dumps(p, ensure_ascii=False)[:1200]
                break

    locale = payload.get("locale") or "ar"
    lang = "Egyptian Arabic" if locale == "ar" else "English"

    system = f"""
You are the Bee3ly Campaign Content Creator brain for Egyptian social commerce.
Write in {lang}. Use ONLY facts from the product and campaign inputs — no invented discounts or specs.
Return a single JSON object (no markdown) with keys:
ad_copy (string, 3-5 short lines),
ad_copy_variations (array of 2 strings),
headline (string),
value_proposition (string),
cta (string),
creative_brief (string, image/video idea),
audience_hint (string).
Store catalog context:
{catalog}
"""

    user = f"""
Campaign name: {payload.get("name", "")}
Objective: {payload.get("objective", "MORE_ORDERS")}
Audience: {payload.get("audienceDescription") or "general Egypt buyers"}
Budget EGP: {payload.get("budget") or "unknown"}
Selected product JSON: {product_line or "use catalog"}
Extra value prop: {payload.get("valueProposition") or ""}
"""

    client = gemini_client()
    response = generate_content(
        client,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.75,
            response_mime_type="application/json",
        ),
    )
    raw = response.text or ""
    data = _parse_json(raw)
    if not data or not str(data.get("ad_copy", "")).strip():
        return {"ok": False, "error": "empty_content"}

    return {
        "ok": True,
        "brain": "content_creator",
        "mode": "gemini",
        "ad_copy": str(data.get("ad_copy", "")).strip(),
        "ad_copy_variations": [
            str(x).strip() for x in (data.get("ad_copy_variations") or [])[:2]
        ],
        "headline": str(data.get("headline", "")).strip(),
        "value_proposition": str(data.get("value_proposition", "")).strip(),
        "cta": str(data.get("cta", "")).strip(),
        "creative_brief": str(data.get("creative_brief", "")).strip(),
        "audience_hint": str(data.get("audience_hint", "")).strip(),
    }


def execute_analysis_brain(payload: dict[str, Any], bearer_token: str) -> dict[str, Any]:
    _ = bearer_token  # reserved for future merchant-specific context
    locale = payload.get("locale") or "ar"
    lang = "Egyptian Arabic" if locale == "ar" else "English"
    rules = payload.get("rules") or {}
    verdict = str(rules.get("verdict", "NEEDS_DATA"))
    if verdict not in VALID_VERDICTS:
        verdict = "NEEDS_DATA"

    system = f"""
You are the Bee3ly Analysis & Decisions brain for ad campaigns.
The RULES ENGINE already chose verdict="{verdict}" — you MUST keep this exact verdict.
Do NOT invent numbers; use only figures in the payload.
Write in {lang}.
Return JSON only with keys:
verdict (same as input),
summary (2-3 sentences for the merchant),
bullets (array of 2-4 actionable strings),
merchant_tone (encouraging, direct, no jargon).
"""

    user = json.dumps(
        {
            "campaign": payload.get("campaign"),
            "figures": rules.get("figures"),
            "risks": rules.get("risks"),
            "actions": rules.get("actions"),
            "confidence": rules.get("confidence"),
        },
        ensure_ascii=False,
    )

    client = gemini_client()
    response = generate_content(
        client,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.4,
            response_mime_type="application/json",
        ),
    )
    data = _parse_json(response.text or "")
    if not data:
        return {"ok": False, "error": "empty_analysis"}

    out_verdict = str(data.get("verdict", verdict))
    if out_verdict not in VALID_VERDICTS:
        out_verdict = verdict

    bullets = [str(b).strip() for b in (data.get("bullets") or []) if str(b).strip()]

    return {
        "ok": True,
        "brain": "analysis_decisions",
        "mode": "gemini",
        "verdict": out_verdict,
        "summary": str(data.get("summary", "")).strip(),
        "bullets": bullets[:5],
    }
