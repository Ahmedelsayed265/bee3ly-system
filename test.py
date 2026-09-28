import requests

url = "http://localhost:8000/api/v1/chat"
payload = {
    "business_id": "b12",
    "customer_id": "test_direct_py1",
    "message": "عايز أطلب تيشيرت أسود مقاس XL، واسمي أحمد النشار ورقمي 01012345678 والعنوان مدينة نصر الحي السابع"
}

res = requests.post(url, json=payload)
print("Status Code:", res.status_code)
print("Response:", res.json())