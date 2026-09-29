import re

from google.genai import types

from app.bee3ly_client import fetch_session_context, run_tool
from app.gemini_client import gemini_client, generate_content
from app.gemini_tools import SALES_TOOLS
from app.memory import get_session_history, save_session_history
from app.tools import resolve_handoff_after_tool

MAX_TOOL_ROUNDS = 4
MERCHANT_PAYMENT_CONFIRMED = "[PAYMENT_CONFIRMED_BY_MERCHANT]"

_ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
_LATIN_RE = re.compile(r"[A-Za-z]")


def _text_prefers_english(text: str) -> bool:
    if not text or not text.strip():
        return False
    ar = len(_ARABIC_RE.findall(text))
    lat = len(_LATIN_RE.findall(text))
    if lat == 0:
        return False
    if ar == 0:
        return True
    return lat > ar


def _customer_prefers_english(message: str, history: list) -> bool:
    if _text_prefers_english(message):
        return True
    for turn in reversed(history):
        if turn.get("role") == "user":
            return _text_prefers_english(turn.get("text") or "")
    return False


def _fallbacks(english: bool) -> dict[str, str]:
    if english:
        return {
            "idle": "How can I help you today?",
            "handoff": "Got it — I'll connect you with a team member shortly.",
            "done": "All set — let me know if you need anything else.",
            "error": "Sorry, we're a bit busy right now. Please send your message again.",
        }
    return {
        "idle": "تحت أمرك يا فندم، إزاي أقدر أساعدك؟",
        "handoff": "حاضر يا فندم، هحوّلك لحد من الفريق يخدمك في أقرب وقت.",
        "done": "تمام يا فندم، تحت أمرك.",
        "error": "عفواً يا فندم، في ضغط على الخدمة. جرّب تبعت رسالتك تاني.",
    }


def _build_system_instruction(
    *,
    context_block: str,
    governorates: list,
    handoff_enabled: bool,
) -> str:
    payment_review_rule = (
        "transferToHuman(reason: PAYMENT_REVIEW, summary: method & amount) — "
        "tell the customer the team will verify the payment and continue / "
        "بلّغ العميل إن الفريق هيراجع التحويل ويكمل."
        if handoff_enabled
        else "thank customer; order stays pending merchant payment review — do not createOrder / شكر فقط بدون createOrder."
    )
    discount_rule = (
        "Discount request → transferToHuman / طلب خصم → transferToHuman."
        if handoff_enabled
        else "Brief apology, no discount / اعتذر باختصار."
    )
    gov_list = ", ".join(governorates)
    return f"""
You are a smart sales assistant for an Egyptian store.

Language (follow strictly):
- Reply in the same language as the customer's latest message.
- Arabic → friendly professional Egyptian Arabic.
- English → clear, friendly English.
- Mixed or unclear → use the language of their most recent full sentence; default Egyptian Arabic.
- Never mention tool names or APIs to the customer (any language).

Store & catalog (source of truth — do not invent prices or stock):
{context_block}

Shipping governorates (ONLY when Shipping block has no «LOCAL DELIVERY ONLY»): ids for tools — {gov_list}
If Shipping says «LOCAL DELIVERY ONLY»: pricing is per city/district name only — ask area, pass **deliveryArea**; never ask governorate ids.

Rules (apply for Arabic or English messages — same tools & flow):
1. Catalog lists every SKU: axes + price + stock. Use checkStock to confirm — never guess.
2. Non size/color axes → pass variantOptions with exact axis names from the catalog.
3. Shipping/total questions (e.g. «الشحن كام؟», «how much is shipping?», «total?») → quoteCheckout with governorate **or** deliveryArea per Shipping in context; explain product + shipping = total.
4. Payment methods from the Payment line in context (collection numbers if present).
5. Cash on delivery only: createOrder after address and confirmation — no transfer proof. If customer chose InstaPay/Vodafone/bank, that is NOT COD — do not createOrder until merchant confirms transfer.
6. Vodafone Cash / InstaPay / bank: quoteCheckout → total + collection number from Payment only → ask for transfer screenshot. **Never createOrder** for prepaid until context says merchant CONFIRMED transfer. If they send a screenshot or message contains [IMAGE_ATTACHMENT:): **only** {payment_review_rule} — thank them and say the team will verify; **never** say the order is officially confirmed or give a new order number on that turn. While payment review is pending: do not createOrder or addOrderItem. If context shows an open order, do not createOrder — use **addOrderItem** when the customer confirms another product; then ask for transfer of **balanceDueEgp** from the tool result only (not the full grand total again).
7. createOrder needs: name, mobile (01…), governorate id, address, product/variant, quantity, paymentMethod. **Multiple products:** put the first in createOrder and the rest in **additionalItems** (same variant fields per line), OR call **addOrderItem** once per extra line before the customer reply — never confirm items in text that are not in the tool result. addOrderItem needs product/variant + quantity only (open order must exist).
8. Interest without order → createLead.
9. Human agent or complaint → transferToHuman immediately.
10. Merchant extra instructions override. Discount: two sentences + transferToHuman if enabled.
11. {discount_rule}
12. Do not repeat the full order confirmation if they asked something new.
13. Keep replies short (2–4 sentences).
14. Internal only: if the message is exactly `[PAYMENT_CONFIRMED_BY_MERCHANT]`, do NOT echo that tag. Step 1 (tools): if open order Lines omit products the customer agreed to in chat, call **addOrderItem** for each before any customer reply. Step 2 (reply): confirm payment approved in the customer's language; mention **only** products in open order Lines (after tools). Do **not** createOrder if an open order exists. If no open order, createOrder when details are in chat. Give order number + delivery window from business delivery info. Never say «fully paid» unless balance due is 0 in context/tool results.
15. When the customer agrees to add another item to an existing open order (e.g. «ضيفها», «add it»), call **addOrderItem** immediately — never claim the item was added without calling the tool. For prepaid, request transfer of **balanceDueEgp** from the tool output; shipping was already included in the first payment unless context says otherwise.
16. Never describe order contents (product names/qty) that are not in open order Lines and were not returned by createOrder/addOrderItem in the current turn.
"""


def execute_customer_chat(
    *,
    conversation_id: str,
    customer_id: str,
    message: str,
    bearer_token: str,
) -> dict:
    session = fetch_session_context(
        bearer_token, conversation_id, customer_id, message
    )
    context_block = session.get("contextBlock") or ""
    governorates = session.get("governorateIds") or []
    handoff_enabled = session.get("handoffEnabled") is not False

    history = get_session_history(conversation_id, customer_id)
    internal_merchant = message.strip() == MERCHANT_PAYMENT_CONFIRMED
    english = (
        False
        if internal_merchant
        else _customer_prefers_english(message, history)
    )
    fb = _fallbacks(english)

    system_instruction = _build_system_instruction(
        context_block=context_block,
        governorates=governorates,
        handoff_enabled=handoff_enabled,
    )
    if internal_merchant:
        system_instruction += (
            "\n\n[PAYMENT CONFIRMED TURN] Mandatory tool pass first: "
            "compare recent chat to open order Lines; addOrderItem for every "
            "agreed catalog product missing from Lines. Then reply using Lines only."
        )

    contents = []
    for turn in history:
        contents.append(
            types.Content(
                role=turn["role"],
                parts=[types.Part.from_text(text=turn["text"])],
            )
        )
    contents.append(
        types.Content(role="user", parts=[types.Part.from_text(text=message)])
    )

    client = gemini_client()
    tools_used: list[str] = []
    order = None
    lead = None
    needs_human = False
    handoff_reason = None
    reply_text = ""
    handoff_done = False

    try:
        for _ in range(MAX_TOOL_ROUNDS):
            response = generate_content(
                client,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.25,
                    tools=[SALES_TOOLS],
                ),
            )

            if not response.function_calls:
                reply_text = response.text or fb["idle"]
                break

            if response.candidates and response.candidates[0].content:
                contents.append(response.candidates[0].content)

            for call in response.function_calls:
                name = call.name
                if not name:
                    continue
                args = dict(call.args) if call.args else {}
                tools_used.append(name)

                if name == "transferToHuman":
                    raw = run_tool(
                        bearer_token,
                        conversation_id,
                        customer_id,
                        name,
                        args,
                        message,
                    )
                    tool_result, flagged, reason = resolve_handoff_after_tool(
                        raw, args
                    )
                    if flagged:
                        needs_human = True
                        handoff_reason = reason
                        handoff_done = True
                else:
                    tool_result = run_tool(
                        bearer_token,
                        conversation_id,
                        customer_id,
                        name,
                        args,
                        message,
                    )

                if (
                    name in ("createOrder", "addOrderItem")
                    and "error" not in tool_result
                ):
                    order = tool_result
                if name == "createLead" and "error" not in tool_result:
                    lead = tool_result

                contents.append(
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_function_response(
                                name=name,
                                response={"result": tool_result},
                            )
                        ],
                    )
                )

            if handoff_done:
                closing = generate_content(
                    client,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.3,
                    ),
                )
                reply_text = closing.text or fb["handoff"]
                break

        if not reply_text:
            final = generate_content(
                client,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.3,
                ),
            )
            reply_text = final.text or fb["done"]

    except Exception as e:
        print(f"[Gemini API Error]: {e}")
        return {
            "reply": fb["error"],
            "toolsUsed": tools_used,
            "order": order,
            "lead": lead,
            "needsHuman": needs_human,
            "handoffReason": handoff_reason,
        }

    if not internal_merchant:
        history.append({"role": "user", "text": message})
    history.append({"role": "model", "text": reply_text})
    save_session_history(conversation_id, customer_id, history)

    action = None
    if order:
        action = "order_placed"
    elif needs_human:
        action = "human_handoff"
    elif lead:
        action = "lead_created"

    return {
        "reply": reply_text,
        "action_taken": action,
        "toolsUsed": tools_used,
        "order": order,
        "lead": lead,
        "needsHuman": needs_human,
        "handoffReason": handoff_reason,
    }
