from google.genai import types

from app.config import settings
from app.gemini_client import gemini_client, generate_content
from app.tools import fetch_live_products, format_products_for_prompt

def execute_merchant_chat(business_id: str, message: str, bearer_token: str) -> dict:
    """
    Merchant assistant specialized in answering inventory/product queries and designing ad campaigns.
    """
    # 1. Fetch current live store products
    products_list = fetch_live_products(bearer_token)
    catalog_context = format_products_for_prompt(products_list)

    # 2. System prompt configured for business consulting and copy creation
    system_instruction = f"""
    أنت مستشار تسويق وتجارة إلكترونية وخبير إعلانات للمتجر.
    التاجر يقوم بإدارة وإضافة منتجاته عبر لوحة التحكم، ودورك معه هو:
    1. الإجابة على أي أسئلة تخص منتجاته الحالية ومخزونها وأسعارها.
    2. تصميم وكتابة حملات إعلانية احترافية وبوستات تسويقية (فيسبوك، إنستجرام، واتساب) لمنتجات معينة يحددها.

    قائمة منتجات المتجر الحالية:
    {catalog_context}

    إرشادات صياغة الحملات الإعلانية:
    - اكتب محتوى إعلاني جذاب باللهجة المصرية التسويقية (Copywriting مقنع ومناسب للسوق المحلي).
    - نسق الإعلان ليشمل: Hook قوي يخطف الانتباه، المزايا التنافسية والسعر، ودعوة واضحة لاتخاذ إجراء (Call To Action / اطلب الآن).
    - اقترح مع الإعلان: الفئة المستهدفة المناسبة (Target Audience) وأفكار للصور/الفيديو وهاشتاجات مناسبة.
    """

    client = gemini_client()
    response = generate_content(
        client,
        contents=message,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.8,
        ),
    )

    return {"reply": response.text or "عفواً، تعذر توليد الرد المطلوب حالياً."}