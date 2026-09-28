import uvicorn
import jwt
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.schemas import (
    CustomerChatRequest,
    CustomerChatResponse,
    MerchantChatRequest,
    MerchantChatResponse,
)
from app.agent import execute_customer_chat
from app.merchant_agent import execute_merchant_chat

app = FastAPI(title="AI Social Sales & Merchant Consultant API")

security = HTTPBearer()


def extract_auth_info(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        return {
            "token": token,
            "business_id": payload.get("businessId") or payload.get("merchantId"),
            "email": payload.get("email"),
        }
    except Exception as e:
        raise HTTPException(
            status_code=401, detail=f"Invalid Authorization Token: {str(e)}"
        )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/v1/chat", response_model=CustomerChatResponse)
async def handle_customer_message(
    payload: CustomerChatRequest,
    auth_data: dict = Depends(extract_auth_info),
):
    if not payload.conversationId or not payload.customerId:
        raise HTTPException(
            status_code=400,
            detail="conversationId and customerId are required (sent by bee3ly backend)",
        )

    token = auth_data["token"]

    try:
        res = execute_customer_chat(
            conversation_id=payload.conversationId,
            customer_id=payload.customerId,
            message=payload.message,
            bearer_token=token,
        )
        return CustomerChatResponse(
            reply=res.get("reply") or "",
            action_taken=res.get("action_taken"),
            toolsUsed=res.get("toolsUsed"),
            order=res.get("order"),
            lead=res.get("lead"),
            needsHuman=res.get("needsHuman"),
            handoffReason=res.get("handoffReason"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/merchant/chat", response_model=MerchantChatResponse)
async def handle_merchant_message(
    payload: MerchantChatRequest,
    auth_data: dict = Depends(extract_auth_info),
):
    token = auth_data["token"]
    try:
        res = execute_merchant_chat(
            business_id=auth_data.get("business_id") or "default",
            message=payload.message,
            bearer_token=token,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
