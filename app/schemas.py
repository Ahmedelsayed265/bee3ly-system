from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class CustomerChatRequest(BaseModel):
    message: str

class CustomerChatResponse(BaseModel):
    reply: str
    action_taken: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None

class MerchantChatRequest(BaseModel):
    message: str

class MerchantChatResponse(BaseModel):
    reply: str