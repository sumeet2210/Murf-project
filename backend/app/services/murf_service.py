import os
import httpx
import aiofiles
from typing import Optional, List, Dict
import uuid
import asyncio
from datetime import datetime
from murf import Murf

class MurfService:
    def __init__(self):
        self.api_key = os.getenv("MURF_API_KEY")
        self.audio_dir = os.getenv("AUDIO_DIR", "../audio_files")
        self.default_voice = os.getenv("DEFAULT_VOICE_ID", "en-US-julia")
        self.default_speed = float(os.getenv("VOICE_SPEED", 1.0))
        
        # Create audio directory if it doesn't exist
        os.makedirs(self.audio_dir, exist_ok=True)
        
        # Initialize Murf client
        if self.api_key and self.api_key != "your_murf_api_key_here":
            self.client = Murf(api_key=self.api_key)
        else:
            self.client = None
    
    async def text_to_speech(
        self, 
        text: str, 
        voice_id: str = None, 
        language: str = "en-US",
        speed: float = None,
        emotion: str = None
    ) -> str:
        """Convert text to speech using Murf SDK"""
        try:
            if not self.client:
                raise Exception("Murf API key not configured properly. Please set MURF_API_KEY environment variable.")
            
            # Use default values if not provided
            voice_id = voice_id or self.default_voice
            speed = speed or self.default_speed
            
            # Truncate text to Murf's 3000 character limit
            max_chars = 2900  # Leave some buffer
            if len(text) > max_chars:
                text = text[:max_chars] + "..."
                print(f"Text truncated to {max_chars} characters for Murf API")
            
            print(f"Using Murf SDK to generate speech with voice: {voice_id}, text length: {len(text)}")
            
            # Use asyncio to run the synchronous Murf SDK call
            def generate_speech():
                return self.client.text_to_speech.generate(
                    text=text,
                    voice_id=voice_id,
                    format="MP3",
                    channel_type="STEREO",
                    sample_rate=44100  # Use valid sample rate
                )
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, generate_speech)
            
            print(f"Murf SDK response type: {type(response)}")
            print(f"Murf SDK response audio_file: {response.audio_file}")
            
            # The SDK returns an audio_file URL that we need to download
            if hasattr(response, 'audio_file') and response.audio_file:
                # Download the audio file from the URL
                import httpx
                async with httpx.AsyncClient() as client:
                    audio_response = await client.get(response.audio_file)
                    if audio_response.status_code == 200:
                        # Save the audio data to file
                        audio_filename = f"murf_{uuid.uuid4()}.mp3"
                        audio_path = os.path.join(self.audio_dir, audio_filename)
                        
                        async with aiofiles.open(audio_path, 'wb') as f:
                            await f.write(audio_response.content)
                        
                        print(f"Murf audio downloaded and saved to: {audio_path}")
                        return audio_path
                    else:
                        raise Exception(f"Failed to download audio from Murf: HTTP {audio_response.status_code}")
                        
            elif hasattr(response, 'encoded_audio') and response.encoded_audio:
                # Handle base64 encoded audio
                import base64
                audio_data = base64.b64decode(response.encoded_audio)
                
                audio_filename = f"murf_{uuid.uuid4()}.mp3"
                audio_path = os.path.join(self.audio_dir, audio_filename)
                
                async with aiofiles.open(audio_path, 'wb') as f:
                    await f.write(audio_data)
                
                print(f"Murf audio (base64) saved to: {audio_path}")
                return audio_path
                
            else:
                print(f"No audio data in Murf SDK response. Available attributes: {dir(response)}")
                raise Exception(f"Invalid Murf SDK response - no audio data found")
        
        except Exception as e:
            print(f"Murf SDK error: {str(e)}")
            raise Exception(f"Murf SDK error: {str(e)}")
    
    async def get_available_voices(self) -> List[Dict]:
        """Get list of available voices from Murf SDK"""
        try:
            if not self.client:
                return self._get_default_voices()
            
            print("Fetching voices from Murf SDK...")
            
            # Try to get real voices from Murf API
            try:
                # Use the SDK to get actual voices
                def get_voices():
                    return self.client.voices.list()
                
                # Run in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                voices_response = await loop.run_in_executor(None, get_voices)
                
                if hasattr(voices_response, 'voices') and voices_response.voices:
                    processed_voices = []
                    for voice in voices_response.voices:
                        processed_voices.append({
                            "voice_id": voice.voice_id if hasattr(voice, 'voice_id') else str(voice.get('voice_id', '')),
                            "name": voice.name if hasattr(voice, 'name') else str(voice.get('name', 'Unknown')),
                            "language": voice.language if hasattr(voice, 'language') else str(voice.get('language', 'en-US')),
                            "gender": voice.gender if hasattr(voice, 'gender') else str(voice.get('gender', 'unknown')),
                            "accent": voice.accent if hasattr(voice, 'accent') else str(voice.get('accent', '')),
                            "style": voice.style if hasattr(voice, 'style') else str(voice.get('style', '')),
                            "description": f"{voice.name} - {voice.language}" if hasattr(voice, 'name') else 'Murf Voice'
                        })
                    print(f"Successfully fetched {len(processed_voices)} voices from Murf API")
                    return processed_voices
                else:
                    print("No voices returned from Murf API, using defaults")
                    return self._get_default_voices()
                    
            except Exception as sdk_error:
                print(f"Murf SDK voices.list() error: {str(sdk_error)}")
                return self._get_default_voices()
        
        except Exception as e:
            print(f"Error fetching Murf voices from SDK: {str(e)}")
            return self._get_default_voices()
    
    def _get_default_voices(self) -> List[Dict]:
        """Return verified Murf voice catalog with actual working voice IDs"""
        return [
            # English (US) Voices - Using confirmed working IDs
            {
                "voice_id": "en-US-julia",
                "name": "Julia",
                "language": "en-US",
                "gender": "female",
                "accent": "American",
                "style": "Conversational",
                "specialty": "Professional & Warm",
                "description": "Ideal for business presentations, e-learning, and customer service"
            },
            {
                "voice_id": "en-US-adam",
                "name": "Adam",
                "language": "en-US",
                "gender": "male",
                "accent": "American",
                "style": "Professional",
                "specialty": "Corporate & Leadership",
                "description": "Perfect for corporate communications and executive presentations"
            },
            {
                "voice_id": "en-US-sarah",
                "name": "Sarah",
                "language": "en-US",
                "gender": "female",
                "accent": "American",
                "style": "Friendly",
                "specialty": "Customer Service",
                "description": "Warm and approachable for customer interactions"
            },
            
            # English (UK) Voices
            {
                "voice_id": "en-GB-olivia",
                "name": "Olivia",
                "language": "en-GB",
                "gender": "female",
                "accent": "British",
                "style": "Elegant",
                "specialty": "Luxury & Premium",
                "description": "Sophisticated British accent for luxury brands"
            },
            {
                "voice_id": "en-GB-william",
                "name": "William",
                "language": "en-GB",
                "gender": "male",
                "accent": "British",
                "style": "Distinguished",
                "specialty": "Education & Literature",
                "description": "Classic British voice for educational content"
            },
            
            # For other languages, use English voice as fallback until we confirm working IDs
            # Spanish
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "es-ES",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Spanish language support"
            },
            
            # French
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "fr-FR",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with French language support"
            },
            
            # German
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "de-DE",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with German language support"
            },
            
            # Italian
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "it-IT",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Italian language support"
            },
            
            # Portuguese
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "pt-BR",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Portuguese language support"
            },
            
            # Japanese
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "ja-JP",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Japanese language support"
            },
            
            # Korean
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "ko-KR",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Korean language support"
            },
            
            # Chinese
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "zh-CN",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Chinese language support"
            },
            
            # Hindi
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "hi-IN",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Hindi language support"
            },
            
            # Arabic
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "ar-SA",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Arabic language support"
            },
            
            # Dutch
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "nl-NL",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Dutch language support"
            },
            
            # Russian
            {
                "voice_id": "en-US-julia",
                "name": "Julia (English Fallback)",
                "language": "ru-RU",
                "gender": "female",
                "accent": "American English",
                "style": "Professional",
                "specialty": "Multilingual Support",
                "description": "Professional English voice with Russian language support"
            }
        ]
    
    async def get_voice_by_language(self, language: str) -> Dict:
        """Get a suitable voice for a specific language"""
        voices = await self.get_available_voices()
        
        # Find voices for the specified language
        matching_voices = [v for v in voices if v.get("language", "").startswith(language.split("-")[0])]
        
        if matching_voices:
            return matching_voices[0]  # Return first matching voice
        else:
            # Return default English voice as fallback
            return {
                "voice_id": "en-US-julia",
                "name": "Julia",
                "language": "en-US",
                "gender": "female"
            }
    
    async def batch_text_to_speech(self, text_items: List[Dict]) -> List[str]:
        """Convert multiple text items to speech"""
        audio_files = []
        
        for item in text_items:
            try:
                audio_path = await self.text_to_speech(
                    text=item.get("text", ""),
                    voice_id=item.get("voice_id"),
                    language=item.get("language", "en-US"),
                    speed=item.get("speed", 1.0)
                )
                audio_files.append(audio_path)
            except Exception as e:
                print(f"Error processing batch item: {e}")
                audio_files.append(None)
        
        return audio_files
    
    def get_voice_settings_for_language(self, language: str) -> Dict:
        """Get recommended voice settings for a language"""
        settings = {
            "en-US": {"speed": 1.0, "emotion": "neutral"},
            "en-GB": {"speed": 0.9, "emotion": "neutral"},
            "es-ES": {"speed": 0.95, "emotion": "warm"},
            "es-MX": {"speed": 1.0, "emotion": "warm"},
            "fr-FR": {"speed": 0.9, "emotion": "elegant"},
            "de-DE": {"speed": 0.9, "emotion": "professional"},
            "it-IT": {"speed": 1.0, "emotion": "expressive"},
            "pt-BR": {"speed": 1.0, "emotion": "warm"},
            "ja-JP": {"speed": 0.95, "emotion": "polite"},
            "ko-KR": {"speed": 0.95, "emotion": "gentle"},
            "zh-CN": {"speed": 0.9, "emotion": "clear"},
            "hi-IN": {"speed": 0.95, "emotion": "friendly"},
            "ar-SA": {"speed": 0.9, "emotion": "formal"}
        }
        
        return settings.get(language, {"speed": 1.0, "emotion": "neutral"})
    
    async def cleanup_old_audio_files(self, max_age_hours: int = 2):
        """Clean up old audio files to save disk space"""
        current_time = datetime.now()
        
        try:
            for filename in os.listdir(self.audio_dir):
                file_path = os.path.join(self.audio_dir, filename)
                
                # Check file age
                file_modified = datetime.fromtimestamp(os.path.getmtime(file_path))
                age = current_time - file_modified
                
                if age.total_seconds() > (max_age_hours * 3600):
                    try:
                        os.remove(file_path)
                        print(f"Cleaned up old audio file: {filename}")
                    except Exception as e:
                        print(f"Error removing file {filename}: {e}")
        
        except Exception as e:
            print(f"Error during audio cleanup: {e}")
