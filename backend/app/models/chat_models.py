from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    file_id: Optional[str] = None
    language: str = "en-US"
    chat_history: List[ChatMessage] = []
    voice_id: Optional[str] = None
    timestamp: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    language: str
    timestamp: str
    file_id: Optional[str] = None

class VoiceRequest(BaseModel):
    text: str
    voice_id: str = "en-US-julia"
    language: str = "en-US"
    speed: float = 1.0
    emotion: Optional[str] = None

class PDFInfo(BaseModel):
    filename: str
    file_id: str
    upload_time: datetime
    text_length: int
    summary: str
    status: str

class VoiceInfo(BaseModel):
    voice_id: str
    name: str
    language: str
    gender: str
    accent: Optional[str] = None
    description: Optional[str] = None

class TranscriptionRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    language: Optional[str] = "en-US"

class VoiceChatSession(BaseModel):
    session_id: str
    file_id: Optional[str] = None
    language: str = "en-US"
    voice_id: str = "en-US-julia"
    chat_history: List[ChatMessage] = []
    created_at: datetime
    updated_at: datetime
