from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class CustomerChatRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    customerId: Optional[str] = None
    businessId: Optional[str] = None


class CustomerChatResponse(BaseModel):
    reply: str
    action_taken: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    toolsUsed: Optional[List[str]] = None
    order: Optional[Dict[str, Any]] = None
    lead: Optional[Dict[str, Any]] = None
    needsHuman: Optional[bool] = None
    handoffReason: Optional[str] = None


class MerchantChatRequest(BaseModel):
    message: str


class MerchantChatResponse(BaseModel):
    reply: str
