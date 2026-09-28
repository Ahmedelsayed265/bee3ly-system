# import uvicorn
# import jwt
# from fastapi import FastAPI, Depends, HTTPException, Security
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# from app.schemas import (
#     CustomerChatRequest,
#     CustomerChatResponse,
#     MerchantChatRequest,
#     MerchantChatResponse,
# )
# from app.agent import execute_customer_chat
# from app.merchant_agent import execute_merchant_chat
# from app.tools import fetch_live_products

# app = FastAPI(title="AI Social Sales & Merchant Consultant API")

# security = HTTPBearer()

# def extract_auth_info(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
#     """
#     Decode incoming Bearer Token to obtain customer_id (sub) and business context.
#     """
#     token = credentials.credentials
#     try:
#         # Decode without verification as validation is handled by partner API server
#         payload = jwt.decode(token, options={"verify_signature": False})
#         customer_id = payload.get("sub") or "anonymous_customer"
        
#         return {
#             "token": token,
#             "customer_id": customer_id,
#             "email": payload.get("email")
#         }
#     except Exception as e:
#         raise HTTPException(status_code=401, detail=f"Invalid Authorization Token: {str(e)}")


# @app.post("/api/v1/chat", response_model=CustomerChatResponse)
# async def handle_customer_message(
#     payload: CustomerChatRequest,
#     auth_data: dict = Depends(extract_auth_info)
# ):
#     """
#     Customer Chat Endpoint:
#     Receives customer message, extracts customer_id from Bearer Token,
#     retrieves live catalog via partner API, and runs sales assistant.
#     """
#     token = auth_data["token"]
#     customer_id = auth_data["customer_id"]

#     # Retrieve live products to extract businessId dynamically
#     products = fetch_live_products(token)
#     business_id = products[0].get("businessId", "default_business") if products else "default_business"

#     try:
#         res = execute_customer_chat(
#             business_id=business_id,
#             customer_id=customer_id,
#             message=payload.message,
#             bearer_token=token
#         )
#         return res
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/v1/merchant/chat", response_model=MerchantChatResponse)
# async def handle_merchant_message(
#     payload: MerchantChatRequest,
#     auth_data: dict = Depends(extract_auth_info)
# ):
#     """
#     Merchant Chat Endpoint:
#     Assists merchants with inventory inquiries and generates targeted ad campaigns.
#     """
#     token = auth_data["token"]

#     products = fetch_live_products(token)
#     business_id = products[0].get("businessId", "default_business") if products else "default_business"

#     try:
#         res = execute_merchant_chat(
#             business_id=business_id,
#             message=payload.message,
#             bearer_token=token
#         )
#         return res
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


# if __name__ == "__main__":
#     uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


import uvicorn
import jwt
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.schemas import (
    CustomerChatRequest,
    CustomerChatResponse,
    MerchantChatRequest,
    MerchantChatResponse,
)
from app.agent import execute_customer_chat
from app.merchant_agent import execute_merchant_chat
from app.tools import fetch_live_products

app = FastAPI(title="AI Social Sales & Merchant Consultant API")

security = HTTPBearer()

def extract_auth_info(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Decode incoming Bearer Token to obtain customer_id (sub) and business context.
    """
    token = credentials.credentials
    try:
        # Decode without verification as validation is handled by partner API server
        payload = jwt.decode(token, options={"verify_signature": False})
        customer_id = payload.get("sub") or "anonymous_customer"
        
        return {
            "token": token,
            "customer_id": customer_id,
            "email": payload.get("email")
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Authorization Token: {str(e)}")


@app.post("/api/v1/chat", response_model=CustomerChatResponse)
async def handle_customer_message(
    payload: CustomerChatRequest,
    auth_data: dict = Depends(extract_auth_info)
):
    """
    Customer Chat Endpoint:
    Receives customer message, extracts customer_id from Bearer Token,
    retrieves live catalog via partner API, and runs sales assistant.
    """
    token = auth_data["token"]
    customer_id = auth_data["customer_id"]

    # Retrieve live products to extract businessId dynamically
    products = fetch_live_products(token)
    business_id = products[0].get("businessId", "default_business") if products else "default_business"

    try:
        res = execute_customer_chat(
            business_id=business_id,
            customer_id=customer_id,
            message=payload.message,
            bearer_token=token
        )
        return CustomerChatResponse(
            reply=res.get("reply"),
            action_taken=res.get("action_taken"),
            extracted_data=res.get("extracted_data")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/merchant/chat", response_model=MerchantChatResponse)
async def handle_merchant_message(
    payload: MerchantChatRequest,
    auth_data: dict = Depends(extract_auth_info)
):
    """
    Merchant Chat Endpoint:
    Assists merchants with inventory inquiries and generates targeted ad campaigns.
    """
    token = auth_data["token"]

    products = fetch_live_products(token)
    business_id = products[0].get("businessId", "default_business") if products else "default_business"

    try:
        res = execute_merchant_chat(
            business_id=business_id,
            message=payload.message,
            bearer_token=token
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)