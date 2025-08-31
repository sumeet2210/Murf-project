import os
import openai
from typing import List, Optional
from datetime import datetime
from app.models.chat_models import ChatMessage

class OpenAIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("GPT_MODEL", "gpt-3.5-turbo")
        self.max_tokens = int(os.getenv("MAX_TOKENS", 1000))
        self.temperature = float(os.getenv("TEMPERATURE", 0.7))
    
    async def generate_summary(self, text: str, max_length: int = 300) -> str:
        """Generate a summary of the PDF content"""
        try:
            # Truncate text if too long for API
            if len(text) > 8000:  # Leave room for prompt
                text = text[:8000] + "..."
            
            prompt = f"""
            Please provide a concise summary of the following document. 
            Focus on the main topics, key points, and overall content structure.
            Keep the summary under {max_length} words.
            
            Document content:
            {text}
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that creates clear and informative document summaries."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            raise ValueError(f"Error generating summary: {str(e)}")
    
    async def generate_chat_response(
        self, 
        message: str, 
        context: str = "", 
        language: str = "en-US",
        chat_history: List[ChatMessage] = []
    ) -> str:
        """Generate AI response for chat with PDF"""
        try:
            # Prepare system message with context
            system_message = self._build_system_message(context, language)
            
            # Build conversation history
            messages = [{"role": "system", "content": system_message}]
            
            # Add chat history
            for msg in chat_history[-10:]:  # Keep last 10 messages for context
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Add current user message
            messages.append({"role": "user", "content": message})
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            raise ValueError(f"Error generating chat response: {str(e)}")
    
    def _build_system_message(self, context: str, language: str) -> str:
        """Build system message with document context and language instructions"""
        language_instruction = self._get_language_instruction(language)
        
        if context:
            # Truncate context if too long
            if len(context) > 6000:
                context = context[:6000] + "\n\n[Document truncated for length...]"
            
            system_message = f"""
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
            """
        else:
            system_message = f"""
            You are a helpful AI assistant. 
            {language_instruction}
            
            Instructions:
            - Provide helpful and accurate responses
            - Be conversational and friendly
            - If you don't know something, admit it honestly
            """
        
        return system_message
    
    def _get_language_instruction(self, language: str) -> str:
        """Get language-specific instructions"""
        language_map = {
            "en-US": "Respond in clear, natural English.",
            "en-GB": "Respond in British English.",
            "es-ES": "Responde en español claro y natural.",
            "es-MX": "Responde en español mexicano claro y natural.",
            "fr-FR": "Répondez en français clair et naturel.",
            "de-DE": "Antworten Sie in klarem, natürlichem Deutsch.",
            "it-IT": "Rispondi in italiano chiaro e naturale.",
            "pt-BR": "Responda em português brasileiro claro e natural.",
            "ja-JP": "自然で明確な日本語で答えてください。",
            "ko-KR": "명확하고 자연스러운 한국어로 답변해주세요.",
            "zh-CN": "请用清晰、自然的中文回答。",
            "hi-IN": "स्पष्ट और प्राकृतिक हिंदी में जवाब दें।",
            "ar-SA": "أجب باللغة العربية الواضحة والطبيعية."
        }
        
        return language_map.get(language, "Respond in clear, natural English.")
    
    async def extract_key_topics(self, text: str) -> List[str]:
        """Extract key topics from document"""
        try:
            if len(text) > 8000:
                text = text[:8000] + "..."
            
            prompt = f"""
            Analyze the following document and extract the main topics and themes.
            Return a list of 5-10 key topics, each as a brief phrase or keyword.
            Format as a simple comma-separated list.
            
            Document content:
            {text}
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing documents and identifying key topics."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.5
            )
            
            # Parse the response into a list
            topics_text = response.choices[0].message.content.strip()
            topics = [topic.strip() for topic in topics_text.split(',')]
            return topics[:10]  # Limit to 10 topics
        
        except Exception as e:
            return []  # Return empty list if extraction fails
    
    async def generate_questions(self, text: str) -> List[str]:
        """Generate suggested questions based on document content"""
        try:
            if len(text) > 8000:
                text = text[:8000] + "..."
            
            prompt = f"""
            Based on the following document, generate 5 thoughtful questions that readers might want to ask.
            Make the questions specific to the document content and varied in type (factual, analytical, clarifying).
            Format as a numbered list.
            
            Document content:
            {text}
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert at creating insightful questions about documents."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            
            # Parse questions from response
            questions_text = response.choices[0].message.content.strip()
            questions = []
            
            for line in questions_text.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                    # Remove numbering/bullets and clean up
                    question = line.split('.', 1)[-1].strip() if '.' in line else line
                    question = question.lstrip('- •').strip()
                    if question:
                        questions.append(question)
            
            return questions[:5]  # Limit to 5 questions
        
        except Exception as e:
            return []  # Return empty list if generation fails
    
    async def translate_text(self, text: str, target_language: str) -> str:
        """Translate text to target language"""
        try:
            language_names = {
                "es-ES": "Spanish",
                "fr-FR": "French", 
                "de-DE": "German",
                "it-IT": "Italian",
                "pt-BR": "Portuguese",
                "ja-JP": "Japanese",
                "ko-KR": "Korean",
                "zh-CN": "Chinese",
                "hi-IN": "Hindi",
                "ar-SA": "Arabic"
            }
            
            target_lang_name = language_names.get(target_language, "English")
            
            if target_language.startswith("en"):
                return text  # No translation needed for English
            
            prompt = f"Translate the following text to {target_lang_name}:\n\n{text}"
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": f"You are a professional translator. Translate text accurately to {target_lang_name}."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            return text  # Return original if translation fails
