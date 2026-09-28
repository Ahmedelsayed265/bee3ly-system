import requests
from app.config import settings

def fetch_live_products(bearer_token: str) -> list:
    """
    Fetch live products list directly from the partner catalog API using Bearer Auth.
    """
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "true"
    }
    
    try:
        response = requests.get(
            settings.PRODUCTS_API_URL,
            headers=headers,
            timeout=15
        )

        print(f"DEBUG - Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"DEBUG - Raw Response: {data}")

            if isinstance(data, list):
                return data
            return data.get("products") or data.get("data") or []
        else:
            print(f"[API Error] Status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[Connection Error] Failed to fetch products: {e}")
        
    return []


def update_product_stock(bearer_token: str, product_id: str, quantity_ordered: int) -> dict:
    """
    Updates or decreases the product stock quantity in the partner catalog API after a customer places an order.
    """
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
    }
    
    # نفترض أن رابط التحديث يتكون من رابط المنتجات + ID المنتج
    # مثل: https://partner-domain.com/products/{product_id}/stock
    # أو يتم إرساله كـ payload حسب الاتفاق مع الشريك
    endpoint = f"{settings.PRODUCTS_API_URL}/{product_id}/stock"
    payload = {
        "quantity_ordered": quantity_ordered
    }
    
    try:
        response = requests.patch(
            endpoint,
            headers=headers,
            json=payload,
            timeout=15
        )
        if response.status_code in [200, 201, 204]:
            return {"status": "success", "message": f"Stock updated for product {product_id}"}
        else:
            print(f"[Stock Update Error] Status {response.status_code}: {response.text}")
            return {"status": "error", "message": response.text}
    except Exception as e:
        print(f"[Connection Error] Failed to update stock: {e}")
        return {"status": "error", "message": str(e)}


def trigger_human_handoff(reason: str = "Customer requested human support") -> dict:
    """
    Triggers a handoff to a human customer support agent when the AI cannot fulfill the request 
    or when the customer explicitly asks to talk to a human.
    """
    return {
        "status": "handoff_triggered",
        "action": "human_handoff",
        "reason": reason
    }


def format_products_for_prompt(products: list) -> str:
    """
    Convert raw product JSON items into readable context for Gemini.
    """
    if not products:
        return "No products currently available in the catalog."
        
    lines = []
    for item in products:
        p_id = item.get("id") or item.get("_id", "N/A")
        p_name = item.get("name", "Unknown")
        p_price = item.get("priceEgp", item.get("price", 0))
        p_stock = "In Stock" if item.get("inStock", True) else "Out of Stock"
        qty = item.get("stockQuantity", item.get("quantity"))
        qty_str = f", Quantity: {qty}" if qty is not None else ""
        
        lines.append(f"- ID: {p_id} | Name: {p_name} | Price: {p_price} EGP | Status: {p_stock}{qty_str}")
        
    return "\n".join(lines)