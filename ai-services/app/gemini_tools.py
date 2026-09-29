"""Gemini function declarations — executed via Nest /ai/run-tool."""
from google.genai import types

T = types.Type

_VARIANT_PROPS = {
    "productId": types.Schema(type=T.STRING),
    "name": types.Schema(type=T.STRING, description="اسم المنتج"),
    "size": types.Schema(type=T.STRING, description="مقاس أو size"),
    "color": types.Schema(type=T.STRING, description="لون"),
    "flavor": types.Schema(type=T.STRING, description="نكهة إن وُجدت"),
    "quantity": types.Schema(type=T.INTEGER),
    "variantOptions": types.Schema(
        type=T.OBJECT,
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
        parameters=types.Schema(type=T.OBJECT, properties=_VARIANT_PROPS),
    ),
    types.FunctionDeclaration(
        name="quoteCheckout",
        description=(
            "احسب سعر SKU + الشحن + الإجمالي. governorate id: cairo, giza, …"
        ),
        parameters=types.Schema(
            type=T.OBJECT,
            properties={
                **_VARIANT_PROPS,
                "governorate": types.Schema(
                    type=T.STRING,
                    description="Governorate id e.g. cairo, giza, alexandria",
                ),
            },
        ),
    ),
    types.FunctionDeclaration(
        name="getDeliveryInfo",
        description="معلومات الشحن والتوصيل وساعات العمل وطرق الدفع.",
        parameters=types.Schema(type=T.OBJECT, properties={}),
    ),
    types.FunctionDeclaration(
        name="createOrder",
        description=(
            "إنشاء طلب بعد تأكيد المتغير والعنوان. "
            "دفع مسبق: بعد quoteCheckout + إثبات تحويل (صورة) من العميل."
        ),
        parameters=types.Schema(
            type=T.OBJECT,
            properties={
                **_VARIANT_PROPS,
                "customerName": types.Schema(type=T.STRING),
                "customerPhone": types.Schema(type=T.STRING),
                "governorate": types.Schema(type=T.STRING),
                "address": types.Schema(type=T.STRING),
                "paymentMethod": types.Schema(type=T.STRING),
                "notes": types.Schema(
                    type=T.STRING,
                    description="ملاحظات: إثبات تحويل، مراجعة دفع، …",
                ),
            },
            required=["customerName", "customerPhone"],
        ),
    ),
    types.FunctionDeclaration(
        name="createLead",
        description="تسجيل lead عند اهتمام بدون طلب فوري.",
        parameters=types.Schema(
            type=T.OBJECT,
            properties={
                "intent": types.Schema(type=T.STRING),
                "notes": types.Schema(type=T.STRING),
            },
        ),
    ),
    types.FunctionDeclaration(
        name="transferToHuman",
        description=(
            "طلب موظف، شكوى، خصم، أو PAYMENT_REVIEW بعد ما العميل أرسل/وعد "
            "بصورة تحويل (دفع مسبق)."
        ),
        parameters=types.Schema(
            type=T.OBJECT,
            properties={
                "reason": types.Schema(type=T.STRING),
                "summary": types.Schema(type=T.STRING),
            },
        ),
    ),
]

SALES_TOOLS = types.Tool(function_declarations=SALES_TOOL_DECLARATIONS)
