# from google import genai
# from google.genai import types
# from app.config import settings
# from app.memory import get_session_history, save_session_history
# from app.tools import fetch_live_products, format_products_for_prompt

# def execute_customer_chat(business_id: str, customer_id: str, message: str, bearer_token: str) -> dict:
#     """
#     Process customer messages using dynamic product catalog data and permanent chat memory.
#     """
#     # 1. Retrieve persistent conversation history
#     history = get_session_history(business_id, customer_id)
    
#     # 2. Fetch latest live products from partner API using Bearer Token
#     products_list = fetch_live_products(bearer_token)
#     catalog_context = format_products_for_prompt(products_list)

#   # System prompt definition in Arabic
#     system_instruction = f"""
#     أنت مساعد مبيعات ذكي، ودود ومحترف لمتجرنا في مصر.
#     مهمتك مساعدة العملاء، الرد على استفساراتهم حول المنتجات والأسعار والتوافر، وتشجيعهم على إتمام الطلب بلباقة.

#     قائمة المنتجات المتاحة حالياً في المتجر:
#     {catalog_context}

#     تعليمات وقواعد الرد:
#     1. تحدث باللهجة المصرية الودودة والمحترمة (أسلوب خدمة عملاء احترافي مثل: "أهلاً بك يا فندم"، "تحت أمرك"، "السعر الحالي").
#     2. التزم تماماً بالمنتجات المذكورة في القائمة أعلاه فقط. لو العميل سأل عن منتج غير موجود، وضح له بذوق إنه غير متاح حالياً واقترح بديل من القائمة لو مناسب.
#     3. إذا أبدى العميل رغبة في الشراء، اطلب منه البيانات اللازمة بلباقة (الاسم، رقم الموبايل، العنوان بالتفصيل، وتأكيد الكمية).
#     4. اجعل إجاباتك مختصرة ومباشرة ومناسبة لرسائل الشات والماسنجر، وتجنب الإطالة غير الضرورية.
#     5. لا تذكر أي تفاصيل تقنية داخلية أو أسماء برمجية في ردودك.
#     """

#     # 4. Reconstruct Gemini conversation contents
#     contents = []
#     for turn in history:
#         contents.append(
#             types.Content(
#                 role=turn["role"],
#                 parts=[types.Part.from_text(text=turn["text"])]
#             )
#         )
#     contents.append(
#         types.Content(
#             role="user",
#             parts=[types.Part.from_text(text=message)]
#         )
#     )

#     # 5. Call Gemini API
#     client = genai.Client()
#     response = client.models.generate_content(
#         model=settings.GEMINI_MODEL,
#         contents=contents,
#         config=types.GenerateContentConfig(
#             system_instruction=system_instruction,
#             temperature=0.7,
#         ),
#     )

#     reply_text = response.text or "عفواً، واجهت مشكلة في معالجة طلبك، برجاء المحاولة مرة أخرى."

#     # 6. Append new turns and save history permanently
#     history.append({"role": "user", "text": message})
#     history.append({"role": "model", "text": reply_text})
#     save_session_history(business_id, customer_id, history)

#     return {"reply": reply_text}




from google import genai
from google.genai import types
from app.config import settings
from app.memory import get_session_history, save_session_history
from app.tools import (
    fetch_live_products,
    format_products_for_prompt,
    update_product_stock,
    trigger_human_handoff
)

def execute_customer_chat(business_id: str, customer_id: str, message: str, bearer_token: str) -> dict:
    """
    Process customer messages using dynamic product catalog data and permanent chat memory.
    Supports ordering/stock reduction and human handoff.
    """
    # 1. Retrieve persistent conversation history
    history = get_session_history(business_id, customer_id)
    
    # 2. Fetch latest live products from partner API using Bearer Token
    products_list = fetch_live_products(bearer_token)
    catalog_context = format_products_for_prompt(products_list)

    # 3. System prompt definition in Arabic
    system_instruction = f"""
    أنت مساعد مبيعات ذكي، ودود ومحترف لمتجرنا في مصر.
    مهمتك مساعدة العملاء، الرد على استفساراتهم حول المنتجات والأسعار والتوافر، وتشجيعهم على إتمام الطلب بلباقة.

    قائمة المنتجات المتاحة حالياً في المتجر:
    {catalog_context}

    تعليمات وقواعد مهمة جداً لاستخدام الأدوات (Tools):
    1. تحدث باللهجة المصرية الودودة والمحترمة (أسلوب خدمة عملاء احترافي مثل: "أهلاً بك يا فندم"، "تحت أمرك").
    2. التزم تماماً بالمنتجات المذكورة في القائمة أعلاه فقط. لو العميل سأل عن منتج غير موجود، وضح له بذوق إنه غير متاح حالياً واقترح بديل من القائمة لو مناسب.
    3. إذا أبدى العميل رغبة صريحة في الشراء وقام بتأكيد الطلب لمنتج معين وتحديد الكمية:
       -> يجب عليك فوراً استدعاء أداة `update_product_stock` لتحديث المخزون.
    4. إذا طلب العميل صراحة التحدث مع شخص حقيقي، أو موظف، أو خدمة العملاء، أو كان لديه مشكلة/شكوى (مثل: "عايز اكلم حد"):
       -> يجب عليك فوراً استدعاء أداة `trigger_human_handoff`. لا تكتفِ بطلب الانتظار بل استدعِ الأداة فوراً!
    5. اجعل إجاباتك مختصرة ومباشرة ومناسبة لرسائل الشات والماسنجر، وتجنب الإطالة غير الضرورية.
    6. لا تذكر أي تفاصيل تقنية داخلية أو أسماء برمجية في ردودك.
    """

    # 4. Reconstruct Gemini conversation contents
    contents = []
    for turn in history:
        contents.append(
            types.Content(
                role=turn["role"],
                parts=[types.Part.from_text(text=turn["text"])]
            )
        )
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)]
        )
    )

    # 5. Call Gemini API with Function Declarations (Tools) & Fallback
    client = genai.Client()
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,  # درجة حرارة منخفضة لضمان الالتزام باستدعاء الأدوات
                tools=[update_product_stock, trigger_human_handoff]
            ),
        )
        reply_text = response.text or "تحت أمرك يا فندم، كيف يمكنني مساعدتك؟"
    except Exception as e:
        print(f"[Gemini API Error]: {e}")
        return {
            "reply": "عفواً يا فندم، يوجد ضغط حالياً على الخدمة، برجاء إعادة إرسال رسالتك مرة أخرى.",
            "action_taken": None,
            "extracted_data": None
        }

    action_taken = None
    extracted_data = None

    # 6. Check for Tool/Function Calls
    if response.function_calls:
        for call in response.function_calls:
            if call.name == "trigger_human_handoff":
                action_taken = "human_handoff"
                extracted_data = dict(call.args) if call.args else {}
            elif call.name == "update_product_stock":
                action_taken = "order_placed"
                extracted_data = dict(call.args) if call.args else {}

    # 7. Append new turns and save history permanently
    history.append({"role": "user", "text": message})
    history.append({"role": "model", "text": reply_text})
    save_session_history(business_id, customer_id, history)

    return {
        "reply": reply_text,
        "action_taken": action_taken,
        "extracted_data": extracted_data
    }