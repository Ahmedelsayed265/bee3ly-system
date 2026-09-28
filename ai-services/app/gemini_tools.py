"""Gemini function declarations — executed via Nest /ai/run-tool."""
from google.genai import types

_VARIANT_PROPS = {
    "productId": types.Schema(type="STRING"),
    "name": types.Schema(type="STRING", description="اسم المنتج"),
    "size": types.Schema(type="STRING", description="مقاس أو size"),
    "color": types.Schema(type="STRING", description="لون"),
    "flavor": types.Schema(type="STRING", description="نكهة إن وُجدت"),
    "quantity": types.Schema(type="INTEGER"),
    "variantOptions": types.Schema(
        type="OBJECT",
        description=(
            "محاور variants إضافية بنفس اسم المحور في الكتالوج "
            'مثل {"مقاس":"XL","لون":"أسود"}'
        ),
    ),
}

SALES_TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="checkStock",
        description="تحقق من توفر SKU (كل المحاور) + السعر والكمية من قاعدة البيانات.",
        parameters=types.Schema(type="OBJECT", properties=_VARIANT_PROPS),
    ),
    types.FunctionDeclaration(
        name="quoteCheckout",
        description=(
            "احسب سعر SKU + الشحن + الإجمالي. governorate id: cairo, giza, …"
        ),
        parameters=types.Schema(
            type="OBJECT",
            properties={
                **_VARIANT_PROPS,
                "governorate": types.Schema(
                    type="STRING",
                    description="Governorate id e.g. cairo, giza, alexandria",
                ),
            },
        ),
    ),
    types.FunctionDeclaration(
        name="getDeliveryInfo",
        description="معلومات الشحن والتوصيل وساعات العمل وطرق الدفع.",
        parameters=types.Schema(type="OBJECT", properties={}),
    ),
    types.FunctionDeclaration(
        name="createOrder",
        description="إنشاء طلب بعد تأكيد كل محاور المتغير والعنوان والدفع.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                **_VARIANT_PROPS,
                "customerName": types.Schema(type="STRING"),
                "customerPhone": types.Schema(type="STRING"),
                "governorate": types.Schema(type="STRING"),
                "address": types.Schema(type="STRING"),
                "paymentMethod": types.Schema(type="STRING"),
            },
            required=["customerName", "customerPhone"],
        ),
    ),
    types.FunctionDeclaration(
        name="createLead",
        description="تسجيل lead عند اهتمام بدون طلب فوري.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "intent": types.Schema(type="STRING"),
                "notes": types.Schema(type="STRING"),
            },
        ),
    ),
    types.FunctionDeclaration(
        name="transferToHuman",
        description="تحويل لموظف بشري عند طلب العميل أو شكوى.",
        parameters=types.Schema(
            type="OBJECT",
            properties={
                "reason": types.Schema(type="STRING"),
                "summary": types.Schema(type="STRING"),
            },
        ),
    ),
]

SALES_TOOLS = types.Tool(function_declarations=SALES_TOOL_DECLARATIONS)
