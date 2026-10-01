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
            "احسب سعر SKU + الشحن + الإجمالي. "
            "أونلاين: governorate id. توصيل محلي: deliveryArea (مدينة نصر، فيصل…)."
        ),
        parameters=types.Schema(
            type=T.OBJECT,
            properties={
                **_VARIANT_PROPS,
                "governorate": types.Schema(
                    type=T.STRING,
                    description="Governorate id e.g. cairo, giza, alexandria",
                ),
                "deliveryArea": types.Schema(
                    type=T.STRING,
                    description="Local area / district when zones list مناطق not محافظات",
                ),
                "address": types.Schema(
                    type=T.STRING,
                    description="Street address (helps match local zones)",
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
        name="addOrderItem",
        description=(
            "إضافة منتج لطلب مفتوح (#…) على نفس المحادثة — لا تستخدم createOrder مرة ثانية. "
            "يرجع balanceDueEgp: المبلغ المطلوب تحويله فقط بعد خصم المدفوع المُؤكَّد."
        ),
        parameters=types.Schema(
            type=T.OBJECT,
            properties={**_VARIANT_PROPS},
        ),
    ),
    types.FunctionDeclaration(
        name="createOrder",
        description=(
            "إنشاء طلب (سطر أو أكثر) بعد اكتمال العنوان والتأكيد. "
            "كاش عند الاستلام: مباشرة. دفع مسبق (InstaPay/فودافون/تحويل): "
            "فقط بعد ما السياق يقول merchant CONFIRMED transfer — "
            "مش بعد صورة العميل ولا قبل تأكيد التاجر."
        ),
        parameters=types.Schema(
            type=T.OBJECT,
            properties={
                **_VARIANT_PROPS,
                "additionalItems": types.Schema(
                    type=T.ARRAY,
                    description=(
                        "منتجات إضافية في نفس الطلب (نفس حقول المنتج: "
                        "productId/name, quantity, size, variantOptions…)"
                    ),
                    items=types.Schema(
                        type=T.OBJECT,
                        properties={**_VARIANT_PROPS},
                    ),
                ),
                "customerName": types.Schema(type=T.STRING),
                "customerPhone": types.Schema(type=T.STRING),
                "governorate": types.Schema(type=T.STRING),
                "deliveryArea": types.Schema(
                    type=T.STRING,
                    description="City/district for local delivery zones",
                ),
                "address": types.Schema(type=T.STRING),
                "paymentMethod": types.Schema(
                    type=T.STRING,
                    description=(
                        "طريقة الدفع التي اختارها العميل صراحةً من سطر Payment "
                        "(مثلاً كاش عند الاستلام / إنستاباي — لا تفترض COD)"
                    ),
                ),
                "notes": types.Schema(
                    type=T.STRING,
                    description="ملاحظات: إثبات تحويل، مراجعة دفع، …",
                ),
            },
            required=["customerName", "customerPhone", "paymentMethod"],
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
            "طلب موظف، شكوى، خصم، ORDER_CANCEL_REQUEST (إلغاء أوردر)، "
            "أو PAYMENT_REVIEW بعد صورة تحويل (دفع مسبق)."
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
