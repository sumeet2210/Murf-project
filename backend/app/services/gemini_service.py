import os
import google.generativeai as genai
from typing import List, Optional
from datetime import datetime
from app.models.chat_models import ChatMessage

class GeminiService:
    def __init__(self):
        # Configure Gemini API
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        
        # Initialize model with fallback options
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        
        # Try to initialize the model, with fallback options
        try:
            self.model = genai.GenerativeModel(self.model_name)
        except Exception as e:
            print(f"Failed to load {self.model_name}, trying fallback models...")
            fallback_models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
            
            for fallback in fallback_models:
                try:
                    self.model = genai.GenerativeModel(fallback)
                    self.model_name = fallback
                    print(f"Successfully loaded fallback model: {fallback}")
                    break
                except Exception as fe:
                    print(f"Failed to load {fallback}: {fe}")
                    continue
            else:
                raise ValueError(f"Could not load any Gemini model. Last error: {e}")
        
        # Model settings
        self.generation_config = genai.types.GenerationConfig(
            temperature=float(os.getenv("TEMPERATURE", 0.7)),
            top_p=0.8,
            top_k=40,
            max_output_tokens=int(os.getenv("MAX_TOKENS", 1000))
        )
        
        # Safety settings
        self.safety_settings = [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    
    async def generate_summary(self, text: str, max_length: int = 300) -> str:
        """Generate a summary of the PDF content using Gemini"""
        try:
            # Truncate text if too long
            if len(text) > 15000:  # Gemini can handle longer texts than GPT
                text = text[:15000] + "..."
            
            prompt = f"""
            Please provide a concise summary of the following document. 
            Focus on the main topics, key points, and overall content structure.
            Keep the summary under {max_length} words.
            
            Document content:
            {text}
            
            Summary:
            """
            
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            if response.text:
                return response.text.strip()
            else:
                return "Unable to generate summary due to content policy restrictions."
        
        except Exception as e:
            raise ValueError(f"Error generating summary with Gemini: {str(e)}")
    
    async def generate_chat_response(
        self, 
        message: str, 
        context: str = "", 
        language: str = "en-US",
        chat_history: List[ChatMessage] = []
    ) -> str:
        """Generate AI response for chat with PDF using Gemini"""
        try:
            # Build the complete prompt with context and history
            full_prompt = self._build_chat_prompt(message, context, language, chat_history)
            
            response = self.model.generate_content(
                full_prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            if response.text:
                return response.text.strip()
            else:
                return "I apologize, but I couldn't generate a response due to content policy restrictions. Please try rephrasing your question."
        
        except Exception as e:
            raise ValueError(f"Error generating chat response with Gemini: {str(e)}")
    
    def _build_chat_prompt(self, message: str, context: str, language: str, chat_history: List[ChatMessage]) -> str:
        """Build complete prompt with context and chat history"""
        language_instruction = self._get_language_instruction(language)
        
        prompt_parts = []
        
        # System instruction
        if context:
            # Truncate context if too long
            if len(context) > 10000:
                context = context[:10000] + "\n\n[Document truncated for length...]"
            
            prompt_parts.append(f"""
You are an AI assistant helping users understand and discuss a document.
{language_instruction}

Here is the document content for reference:

{context}

Instructions:
- Answer questions based on the document content when possible
- If information isn't in the document, clearly state that
- Be helpful, accurate, and conversational
- Provide specific references to document sections when relevant
- If asked about topics not in the document, provide general helpful information but note it's not from the document
- Format your responses clearly with proper paragraphs
- Use **bold** for important terms and *italics* for emphasis
- Use bullet points with - when listing items
- Highlight numbers and percentages for better readability
- Structure longer responses with clear sections
""")
        else:
            prompt_parts.append(f"""
You are a helpful AI assistant.
{language_instruction}

Instructions:
- Provide helpful and accurate responses
- Be conversational and friendly
- If you don't know something, admit it honestly
- Format your responses clearly with proper paragraphs
- Use **bold** for important terms and *italics* for emphasis
- Use bullet points with - when listing items
- Highlight key numbers and information
- Structure longer responses with clear sections
""")
        
        # Add chat history
        if chat_history:
            prompt_parts.append("\nPrevious conversation:")
            for msg in chat_history[-10:]:  # Keep last 10 messages
                role = "Human" if msg.role == "user" else "Assistant"
                prompt_parts.append(f"{role}: {msg.content}")
        
        # Add current message
        prompt_parts.append(f"\nHuman: {message}")
        prompt_parts.append("Assistant:")
        
        return "\n".join(prompt_parts)
    
    def _get_language_instruction(self, language: str) -> str:
        """Get language-specific instructions for Gemini"""
        language_map = {
            'en-US': 'Please respond in English.',
            'es-ES': 'Por favor responde en español.',
            'fr-FR': 'Veuillez répondre en français.',
            'de-DE': 'Bitte antworten Sie auf Deutsch.',
            'it-IT': 'Si prega di rispondere in italiano.',
            'pt-BR': 'Por favor, responda em português.',
            'ru-RU': 'Пожалуйста, отвечайте на русском языке.',
            'ja-JP': '日本語で回答してください。',
            'ko-KR': '한국어로 답변해 주세요.',
            'zh-CN': '请用中文回答。',
            'ar-SA': 'يرجى الرد باللغة العربية.',
            'hi-IN': 'कृपया हिंदी में उत्तर दें।'
        }
        
        return language_map.get(language, 'Please respond in English.')
    
    async def test_connection(self) -> bool:
        """Test if Gemini API is working"""
        try:
            response = self.model.generate_content(
                "Hello, this is a test message. Please respond with 'Hello, Gemini is working!'",
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            return bool(response.text and "working" in response.text.lower())
        except Exception as e:
            print(f"Gemini connection test failed: {e}")
            return False
    
    async def get_model_info(self) -> dict:
        """Get information about the current Gemini model"""
        try:
            # Get available models
            models = []
            for model in genai.list_models():
                if 'generateContent' in model.supported_generation_methods:
                    models.append({
                        'name': model.name,
                        'display_name': model.display_name,
                        'description': getattr(model, 'description', 'No description available')
                    })
            
            return {
                'current_model': self.model_name,
                'available_models': models,
                'generation_config': {
                    'temperature': self.generation_config.temperature,
                    'top_p': self.generation_config.top_p,
                    'top_k': self.generation_config.top_k,
                    'max_output_tokens': self.generation_config.max_output_tokens
                }
            }
        except Exception as e:
            return {
                'current_model': self.model_name,
                'error': str(e),
                'available_models': []
            }
