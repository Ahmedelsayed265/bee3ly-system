from google.genai import types

from app.bee3ly_client import fetch_session_context, run_tool
from app.gemini_client import gemini_client, generate_content
from app.gemini_tools import SALES_TOOLS
from app.memory import get_session_history, save_session_history
from app.tools import resolve_handoff_after_tool

MAX_TOOL_ROUNDS = 4


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

    history = get_session_history(conversation_id, customer_id)

    system_instruction = f"""
أنت مساعد مبيعات ذكي لمتجر مصري. تكلم باللهجة المصرية الودودة والمحترفة.

بيانات المتجر والكتالوج (مصدر الحقيقة — لا تخترع أسعاراً أو مخزوناً):
{context_block}

محافظات الشحن (استخدم الـ id في الأدوات): {", ".join(governorates)}

قواعد مهمة:
1. الكتالوج يعرض كل SKU: محاور + سعر + stock. للتأكد استخدم checkStock — لا تخمّن.
2. لو المنتج فيه محاور غير size/color مرّر variantOptions بنفس أسماء المحاور في الكتالوج.
3. عند سؤال "الشحن كام؟" أو "الإجمالي كام؟": استخدم quoteCheckout واشرح: سعر المنتج + الشحن = الإجمالي.
4. اذكر طرق الدفع من بيانات المتجر (Payment) واسأل العميل طريقته قبل createOrder.
5. createOrder فقط بعد: اسم، موبايل مصري (01…)، محافظة، عنوان، منتج/متغير، كمية، وموافقة العميل.
6. اهتمام بدون طلب → createLead.
7. طلب موظف/شكوى → transferToHuman فوراً.
8. لا تذكر أسماء أدوات أو APIs للعميل.
"""

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
                reply_text = (
                    response.text or "تحت أمرك يا فندم، إزاي أقدر أساعدك؟"
                )
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

                if name == "createOrder" and "error" not in tool_result:
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
                reply_text = (
                    closing.text
                    or "حاضر يا فندم، هحوّلك لحد من الفريق يخدمك في أقرب وقت."
                )
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
            reply_text = final.text or "تمام يا فندم، تحت أمرك."

    except Exception as e:
        print(f"[Gemini API Error]: {e}")
        return {
            "reply": "عفواً يا فندم، في ضغط على الخدمة. جرّب تبعت رسالتك تاني.",
            "toolsUsed": tools_used,
            "order": order,
            "lead": lead,
            "needsHuman": needs_human,
            "handoffReason": handoff_reason,
        }

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
