from typing import Literal, Optional
from pydantic import BaseModel, Field

class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"] = Field(
        ...,
        description="Sender role in conversation",
        examples=["user"]
    )
    content: str = Field(
        ...,
        min_length=1,
        description="Message content",
        examples=["What is this chatbot?"]
    )

class ChatRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User question or prompt",
        examples=["How do I embed this chatbot widget on my website?"]
    )
    history: list[HistoryMessage] = Field(
        default_factory=list,
        description="Previous conversation turns for contextual continuity"
    )

class SourceItem(BaseModel):
    id: str = Field(..., description="Document identifier", examples=["doc-embed-quickstart"])
    title: str = Field(..., description="Document title", examples=["Quickstart Guide: Embedding the Chatbot"])
    url: Optional[str] = Field(None, description="External or internal URL reference", examples=["https://example.com/docs/embed"])
    category: Optional[str] = Field(None, description="Category classification", examples=["Embedding"])

class ChatResponse(BaseModel):
    response: str = Field(..., description="AI-generated response grounded in knowledge base")
    sources: list[SourceItem] = Field(default_factory=list, description="Citations and referenced source documents")

class HealthResponse(BaseModel):
    status: str = Field(..., examples=["healthy"])
    documents_indexed: int = Field(..., examples=[8])
    gemini_configured: bool = Field(..., examples=[True])
    model: str = Field(..., examples=["gemini-3.5-flash-lite"])

