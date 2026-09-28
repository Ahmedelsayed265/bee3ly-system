# app/merchant_tools.py
from google.genai import types
from app.db_store import add_products_to_catalog, update_stock_or_status

def save_products_to_db(business_id: str, products: list) -> dict:
    saved = add_products_to_catalog(business_id, products)
    print(f"📦 [Merchant DB Event] Saved {len(saved)} product(s) for {business_id}")
    return {
        "status": "success",
        "business_id": business_id,
        "message": f"تم تسجيل {len(saved)} منتج بنجاح في الكتالوج وتحديث المخزون.",
        "count": len(saved),
        "products": saved
    }

def update_product_stock_tool(
    business_id: str,
    product_name: str,
    attributes: dict = None,
    delta_stock: int = None,
    new_stock: int = None,
    is_active: bool = None
) -> dict:
    res = update_stock_or_status(
        business_id=business_id,
        product_name=product_name,
        attributes=attributes,
        delta_stock=delta_stock,
        new_stock=new_stock,
        is_active=is_active
    )
    print(f"🔄 [Merchant DB Event] Updated: {res.get('message')}")
    return res

merchant_tools_declaration = [
    types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="save_products_to_db",
            description="حفظ منتج جديد أو مجموعة منتجات دفعة واحدة في كتالوج المتجر بعد اكتمال البيانات وموافقة التاجر.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "business_id": types.Schema(type="STRING", description="معرف المتجر"),
                    "products": types.Schema(
                        type="ARRAY",
                        description="قائمة بالمنتجات وتفاصيلها",
                        items=types.Schema(
                            type="OBJECT",
                            properties={
                                "name": types.Schema(type="STRING", description="اسم المنتج"),
                                "category": types.Schema(type="STRING", description="تصنيف المنتج"),
                                "description": types.Schema(type="STRING", description="وصف مختصر"),
                                "variants": types.Schema(
                                    type="ARRAY",
                                    description="المتغيرات والأسعار والمخزون",
                                    items=types.Schema(
                                        type="OBJECT",
                                        properties={
                                            "price": types.Schema(type="NUMBER", description="السعر بالجنيه"),
                                            "stock": types.Schema(type="INTEGER", description="المخزون المتاح"),
                                            "attributes": types.Schema(type="OBJECT", description="الخصائص key-value")
                                        },
                                        required=["price", "stock", "attributes"]
                                    )
                                )
                            },
                            required=["name", "category", "variants"]
                        )
                    )
                },
                required=["business_id", "products"]
            )
        ),
        types.FunctionDeclaration(
            name="update_product_stock",
            description="تعديل كمية المخزون لمنتج/متغير موجود، أو زيادة/نقصان الكمية، أو إيقاف/تفعيل المنتج من الكتالوج.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "business_id": types.Schema(type="STRING", description="معرف المتجر"),
                    "product_name": types.Schema(type="STRING", description="اسم المنتج المراد تعديله"),
                    "attributes": types.Schema(type="OBJECT", description="الخصائص المستهدفة مثل {'size': 'L'} إن وجدت"),
                    "delta_stock": types.Schema(type="INTEGER", description="الكمية المراد زيادتها (+5) أو إنقاصها (-2)"),
                    "new_stock": types.Schema(type="INTEGER", description="القيمة الجديدة للمخزون لو حدد رقماً ثابتاً"),
                    "is_active": types.Schema(type="BOOLEAN", description="false لإيقاف المنتج مؤقتاً أو true لإعادة تفعيله")
                },
                required=["business_id", "product_name"]
            )
        )
    ])
]