# app/db_store.py
import json
import os
import uuid
from typing import Dict, List, Optional
import json
import requests

DB_FILE_PATH = "catalog_data.json"

def _load_data() -> dict:
    if not os.path.exists(DB_FILE_PATH):
        return {"catalog": {}, "orders": []}
    try:
        with open(DB_FILE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"catalog": {}, "orders": []}

def _save_data(data: dict):
    with open(DB_FILE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def add_products_to_catalog(business_id: str, new_products: list) -> List[dict]:
    data = _load_data()
    catalog = data["catalog"]

    if business_id not in catalog:
        catalog[business_id] = []

    saved = []
    for p in new_products:
        prod_data = {
            "id": p.get("id") or str(uuid.uuid4())[:8],
            "name": p.get("name"),
            "category": p.get("category", "عام"),
            "description": p.get("description", ""),
            "is_active": True,
            "variants": p.get("variants", [])
        }
        catalog[business_id].append(prod_data)
        saved.append(prod_data)

    _save_data(data)
    return saved


def get_business_catalog(business_id: str, include_inactive: bool = False) -> List[dict]:



    URL = "https://trolling-engross-underpaid.ngrok-free.dev/products"
    ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3NjNkYzNiMy1kYzdlLTQ3OWItYThiZS1hNjg4MDJkYTg4ZjUiLCJlbWFpbCI6ImxuYXNoYXI1MEBnbWFpbC5jb20iLCJpYXQiOjE3OTAxNjk3NTQsImV4cCI6MTc5MDE3MDY1NH0.Qla0YmLofytbeg5FzwI-Xy20LEaXbIB0Gdh3E2E8uaI"       
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Accept": "application/json",
        # لتخطي صفحة التحذير الخاصة بنسخة ngrok المجانية واستقبال الـ JSON مباشرة
        "ngrok-skip-browser-warning": "true"
    }

    params = {
        "page": 1,
        "limit": 10
    }

    try:
        response = requests.get(URL, headers=headers, params=params, timeout=15)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ تم جلب المنتجات بنجاح:")
            print(json.dumps(data, ensure_ascii=False, indent=2))
            return data
        elif response.status_code == 401:
            print("❌ Unauthorized: التوكن غير صالح أو انتهت صلاحيته.")
        else:
            print(f"❌ خطأ من السيرفر: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"❌ خطأ في الاتصال: {e}")


    data = _load_data()
    all_products = data["catalog"].get(business_id, [])
    if include_inactive:
        return all_products
    return [p for p in all_products if p.get("is_active", True)]

def update_stock_or_status(
    business_id: str,
    product_name: str,
    attributes: Optional[dict] = None,
    delta_stock: Optional[int] = None,
    new_stock: Optional[int] = None,
    is_active: Optional[bool] = None
) -> dict:
    data = _load_data()
    products = data["catalog"].get(business_id, [])
    target_prod = None

    for p in products:
        if product_name.strip().lower() in p["name"].strip().lower():
            target_prod = p
            break

    if not target_prod:
        return {"status": "error", "message": f"المنتج '{product_name}' غير موجود بالكتالوج."}

    if is_active is not None:
        target_prod["is_active"] = is_active
        _save_data(data)
        action = "تفعيل" if is_active else "إيقاف"
        return {"status": "success", "message": f"تم {action} المنتج '{target_prod['name']}' بنجاح."}

    updated_variants = 0
    for variant in target_prod.get("variants", []):
        match = True
        if attributes:
            for k, v in attributes.items():
                if str(variant.get("attributes", {}).get(k, "")).lower() != str(v).lower():
                    match = False
                    break
        if match:
            if new_stock is not None:
                variant["stock"] = max(0, new_stock)
            elif delta_stock is not None:
                variant["stock"] = max(0, variant.get("stock", 0) + delta_stock)
            updated_variants += 1

    _save_data(data)
    return {
        "status": "success",
        "message": f"تم تحديث المخزون لـ ({updated_variants}) متغير للمنتج '{target_prod['name']}'.",
        "product": target_prod
    }

def record_order(
    business_id: str,
    customer_name: str,
    customer_phone: str,
    address: str,
    product_name: str,
    selected_attributes: dict,
    quantity: int = 1
) -> dict:
    data = _load_data()
    catalog = data["catalog"].get(business_id, [])
    matched_product = None

    for p in catalog:
        if product_name.strip().lower() in p["name"].strip().lower() and p.get("is_active", True):
            matched_product = p
            break

    unit_price = 0
    if matched_product and matched_product.get("variants"):
        unit_price = matched_product["variants"][0].get("price", 0)
        deducted = False

        # مطابقة تامة
        for v in matched_product.get("variants", []):
            match = True
            for k, val in selected_attributes.items():
                v_val = str(v.get("attributes", {}).get(k, "")).strip().lower()
                req_val = str(val).strip().lower()
                if v_val != req_val:
                    match = False
                    break
            if match:
                unit_price = v.get("price", unit_price)
                v["stock"] = max(0, v.get("stock", 0) - quantity)
                deducted = True
                break

        # مطابقة مرنة للطلبات المزدوجة مثل ألوان مجمعة
        if not deducted:
            req_size = str(selected_attributes.get("size", "")).strip().lower()
            req_color = str(selected_attributes.get("color", "")).strip().lower()
            matching_variants = []

            for v in matched_product.get("variants", []):
                v_size = str(v.get("attributes", {}).get("size", "")).strip().lower()
                v_color = str(v.get("attributes", {}).get("color", "")).strip().lower()

                if (not req_size or req_size == v_size) and (not req_color or v_color in req_color or req_color in v_color):
                    matching_variants.append(v)

            if matching_variants:
                unit_price = matching_variants[0].get("price", unit_price)
                qty_per_var = max(1, quantity // len(matching_variants))
                for mv in matching_variants:
                    mv["stock"] = max(0, mv.get("stock", 0) - qty_per_var)

    total_price = unit_price * quantity
    order_id = f"ORD-{uuid.uuid4().hex[:6].upper()}"

    order_payload = {
        "order_id": order_id,
        "business_id": business_id,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "address": address,
        "product_name": product_name,
        "selected_attributes": selected_attributes,
        "quantity": quantity,
        "unit_price": unit_price,
        "total_price": total_price,
        "status": "pending"
    }

    data["orders"].append(order_payload)
    _save_data(data)
    return order_payload