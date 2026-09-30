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


class CampaignContentBrainRequest(BaseModel):
    name: str
    productId: Optional[str] = None
    objective: Optional[str] = "MORE_ORDERS"
    audienceDescription: Optional[str] = None
    budget: Optional[int] = None
    valueProposition: Optional[str] = None
    locale: Optional[str] = "ar"


class CampaignContentBrainResponse(BaseModel):
    ok: bool = True
    brain: str = "content_creator"
    mode: str = "gemini"
    ad_copy: str = ""
    ad_copy_variations: List[str] = Field(default_factory=list)
    headline: str = ""
    value_proposition: str = ""
    cta: str = ""
    creative_brief: str = ""
    audience_hint: str = ""
    error: Optional[str] = None


class CampaignAnalysisBrainRequest(BaseModel):
    locale: Optional[str] = "ar"
    campaign: Dict[str, Any]
    rules: Dict[str, Any]


class CampaignAnalysisBrainResponse(BaseModel):
    ok: bool = True
    brain: str = "analysis_decisions"
    mode: str = "gemini"
    verdict: str = "NEEDS_DATA"
    summary: str = ""
    bullets: List[str] = Field(default_factory=list)
    error: Optional[str] = None
