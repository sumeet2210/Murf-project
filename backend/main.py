from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our custom modules
from app.services.pdf_service import PDFService
from app.services.gemini_service import GeminiService
from app.services.murf_service import MurfService
from app.services.voice_service import VoiceService
from app.models.chat_models import ChatRequest, ChatResponse, VoiceRequest

app = FastAPI(
    title="Talk to PDF API",
    description="AI-powered PDF chat with voice synthesis using Murf API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for audio files
app.mount("/audio", StaticFiles(directory="../audio_files"), name="audio")

# Initialize services
pdf_service = PDFService()
gemini_service = GeminiService()
murf_service = MurfService()
voice_service = VoiceService()

# Health check
@app.get("/")
async def root():
    return {"message": "Talk to PDF API is running!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Check the health of all services"""
    try:
        gemini_status = await gemini_service.test_connection()
        return {
            "status": "healthy",
            "services": {
                "gemini": "connected" if gemini_status else "disconnected",
                "pdf_processor": "ready",
                "murf_api": "configured",
                "voice_service": "ready"
            }
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
            "services": {
                "gemini": "error",
                "pdf_processor": "ready",
                "murf_api": "configured",
                "voice_service": "ready"
            }
        }

@app.get("/gemini-info")
async def get_gemini_info():
    """Get information about the Gemini model being used"""
    try:
        return await gemini_service.get_model_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting Gemini info: {str(e)}")

# PDF Upload and Processing
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload and process a PDF file"""
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Save uploaded file
        file_path = await pdf_service.save_uploaded_file(file)
        
        # Extract text from PDF
        extracted_text = await pdf_service.extract_text(file_path)
        
        # Generate document summary using Gemini
        summary = await gemini_service.generate_summary(extracted_text)
        
        return {
            "filename": file.filename,
            "file_id": os.path.basename(file_path).split('.')[0],
            "text_length": len(extracted_text),
            "summary": summary,
            "status": "processed"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

# Chat with PDF
@app.post("/chat", response_model=ChatResponse)
async def chat_with_pdf(request: ChatRequest):
    """Chat with the uploaded PDF using AI"""
    try:
        # Get PDF context if file_id provided
        context = ""
        if request.file_id:
            context = await pdf_service.get_pdf_context(request.file_id)
        
        # Generate AI response
        ai_response = await gemini_service.generate_chat_response(
            message=request.message,
            context=context,
            language=request.language,
            chat_history=request.chat_history
        )
        
        return ChatResponse(
            response=ai_response,
            language=request.language,
            timestamp=request.timestamp or "",
            file_id=request.file_id
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")

# Voice synthesis with Murf
@app.post("/synthesize-voice")
async def synthesize_voice(request: VoiceRequest):
    """Convert text to speech using Murf API"""
    try:
        audio_file_path = await murf_service.text_to_speech(
            text=request.text,
            voice_id=request.voice_id,
            language=request.language,
            speed=request.speed
        )
        
        return {
            "audio_url": f"/audio/{os.path.basename(audio_file_path)}",
            "status": "success",
            "voice_id": request.voice_id,
            "language": request.language
        }
    
    except Exception as e:
        print(f"Voice synthesis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "status": "error",
                "message": str(e),
                "voice_id": request.voice_id,
                "language": request.language
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error synthesizing voice: {str(e)}")

# Voice input (Speech to Text)
@app.post("/transcribe-audio")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Convert speech to text"""
    try:
        # Save audio file temporarily
        audio_path = await voice_service.save_audio_file(audio)
        
        # Transcribe audio to text
        transcription = await voice_service.transcribe_audio(audio_path)
        
        # Clean up temporary file
        os.remove(audio_path)
        
        return {
            "transcription": transcription,
            "status": "success"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

# Complete voice chat (combines chat + voice synthesis)
@app.post("/voice-chat")
async def voice_chat(request: ChatRequest):
    """Complete voice chat pipeline: text input -> AI response -> voice synthesis"""
    try:
        # Generate AI response
        chat_response = await chat_with_pdf(request)
        
        # Synthesize voice response
        try:
            audio_file_path = await murf_service.text_to_speech(
                text=chat_response.response,
                voice_id=request.voice_id or "en-US-julia",
                language=request.language
            )
            
            return {
                "text_response": chat_response.response,
                "audio_url": f"/audio/{os.path.basename(audio_file_path)}",
                "status": "success",
                "language": request.language,
                "voice_id": request.voice_id or "en-US-julia"
            }
            
        except Exception as voice_error:
            # If voice synthesis fails, still return the text response
            return {
                "text_response": chat_response.response,
                "audio_url": None,
                "status": "voice_synthesis_failed",
                "error": str(voice_error),
                "language": request.language,
                "voice_id": request.voice_id or "en-US-julia"
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in voice chat: {str(e)}")

# Call with PDF - Continuous voice conversation
@app.post("/call-with-pdf")
async def call_with_pdf(audio: UploadFile = File(...), file_id: str = None, language: str = "en-US", voice_id: str = "en-US-julia"):
    """Call with PDF: Complete pipeline - audio input -> transcribe -> AI response -> voice synthesis"""
    try:
        # Step 1: Transcribe audio input to text
        audio_path = await voice_service.save_audio_file(audio)
        user_message = await voice_service.transcribe_audio(audio_path)
        os.remove(audio_path)  # Clean up
        
        if not user_message or user_message.strip() == "":
            raise HTTPException(status_code=400, detail="Could not transcribe audio or audio is empty")
        
        # Step 2: Get PDF context if file_id provided
        context = ""
        if file_id:
            context = await pdf_service.get_pdf_context(file_id)
        
        # Step 3: Generate AI response using the transcribed text
        ai_response = await gemini_service.generate_chat_response(
            message=user_message,
            context=context,
            language=language,
            chat_history=[]
        )
        
        # Step 4: Synthesize AI response to voice
        try:
            audio_file_path = await murf_service.text_to_speech(
                text=ai_response,
                voice_id=voice_id,
                language=language
            )
            
            return {
                "user_message": user_message,
                "ai_response": ai_response,
                "audio_url": f"/audio/{os.path.basename(audio_file_path)}",
                "status": "success",
                "language": language,
                "voice_id": voice_id
            }
            
        except Exception as voice_error:
            return {
                "user_message": user_message,
                "ai_response": ai_response,
                "audio_url": None,
                "status": "voice_synthesis_failed",
                "error": str(voice_error),
                "language": language,
                "voice_id": voice_id
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in call with PDF: {str(e)}")

# Get available voices from Murf
@app.get("/voices")
async def get_available_voices():
    """Get list of available voices from Murf API"""
    try:
        voices = await murf_service.get_available_voices()
        return {"voices": voices}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching voices: {str(e)}")

# Test endpoint to fetch real Murf voices
@app.get("/voices/real")
async def get_real_murf_voices():
    """Test endpoint to fetch actual voices from Murf API"""
    try:
        if not murf_service.client:
            return {"error": "Murf API not configured", "voices": []}
        
        # Try to get real voices
        def get_voices():
            return murf_service.client.voices.list()
        
        import asyncio
        loop = asyncio.get_event_loop()
        voices_response = await loop.run_in_executor(None, get_voices)
        
        return {"voices": voices_response}
    
    except Exception as e:
        return {"error": str(e), "voices": []}

# Get supported languages
@app.get("/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "languages": [
            {"code": "en-US", "name": "English (US)"},
            {"code": "en-GB", "name": "English (UK)"},
            {"code": "es-ES", "name": "Spanish (Spain)"},
            {"code": "es-MX", "name": "Spanish (Mexico)"},
            {"code": "fr-FR", "name": "French"},
            {"code": "de-DE", "name": "German"},
            {"code": "it-IT", "name": "Italian"},
            {"code": "pt-BR", "name": "Portuguese (Brazil)"},
            {"code": "ja-JP", "name": "Japanese"},
            {"code": "ko-KR", "name": "Korean"},
            {"code": "zh-CN", "name": "Chinese (Simplified)"},
            {"code": "hi-IN", "name": "Hindi"},
            {"code": "ar-SA", "name": "Arabic"},
            {"code": "nl-NL", "name": "Dutch"},
            {"code": "ru-RU", "name": "Russian"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
