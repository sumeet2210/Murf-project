import os
import speech_recognition as sr
import aiofiles
from fastapi import UploadFile
import uuid
from pydub import AudioSegment
import io
from typing import Optional
import tempfile

class VoiceService:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.temp_dir = tempfile.gettempdir()
        
        # Configure recognition settings
        self.recognizer.energy_threshold = 300
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8
        self.recognizer.operation_timeout = 10
    
    async def save_audio_file(self, audio: UploadFile) -> str:
        """Save uploaded audio file temporarily"""
        # Generate unique filename
        audio_filename = f"temp_audio_{uuid.uuid4()}.wav"
        temp_path = os.path.join(self.temp_dir, audio_filename)
        
        # Read and save audio content
        content = await audio.read()
        
        # Convert to WAV if needed (speech recognition works best with WAV)
        if not audio.filename.lower().endswith('.wav'):
            temp_path = await self._convert_to_wav(content, temp_path)
        else:
            async with aiofiles.open(temp_path, 'wb') as f:
                await f.write(content)
        
        return temp_path
    
    async def _convert_to_wav(self, audio_content: bytes, output_path: str) -> str:
        """Convert audio content to WAV format"""
        try:
            # Create audio segment from bytes
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_content))
            
            # Convert to WAV format with specific parameters for better speech recognition
            audio_segment = audio_segment.set_frame_rate(16000)  # 16kHz sample rate
            audio_segment = audio_segment.set_channels(1)  # Mono
            audio_segment = audio_segment.set_sample_width(2)  # 16-bit
            
            # Export as WAV
            audio_segment.export(output_path, format="wav")
            
            return output_path
        
        except Exception as e:
            raise ValueError(f"Error converting audio to WAV: {str(e)}")
    
    async def transcribe_audio(self, audio_path: str, language: str = "en-US") -> str:
        """Transcribe audio file to text using speech recognition"""
        try:
            with sr.AudioFile(audio_path) as source:
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                
                # Record the audio
                audio_data = self.recognizer.record(source)
            
            # Try Google Speech Recognition first (most accurate)
            try:
                # Map language codes to what Google expects
                google_language = self._map_language_for_google(language)
                text = self.recognizer.recognize_google(audio_data, language=google_language)
                return text
            
            except sr.RequestError:
                # Fallback to offline recognition if Google API is unavailable
                try:
                    text = self.recognizer.recognize_sphinx(audio_data)
                    return text
                except sr.RequestError:
                    # Final fallback - return a placeholder
                    return "Could not transcribe audio - speech recognition service unavailable"
            
            except sr.UnknownValueError:
                return "Could not understand the audio clearly"
        
        except Exception as e:
            raise ValueError(f"Error transcribing audio: {str(e)}")
    
    def _map_language_for_google(self, language: str) -> str:
        """Map our language codes to Google Speech Recognition language codes"""
        language_map = {
            "en-US": "en-US",
            "en-GB": "en-GB", 
            "es-ES": "es-ES",
            "es-MX": "es-MX",
            "fr-FR": "fr-FR",
            "de-DE": "de-DE",
            "it-IT": "it-IT",
            "pt-BR": "pt-BR",
            "ja-JP": "ja-JP",
            "ko-KR": "ko-KR",
            "zh-CN": "zh-CN",
            "hi-IN": "hi-IN",
            "ar-SA": "ar-SA"
        }
        
        return language_map.get(language, "en-US")
    
    async def transcribe_with_confidence(self, audio_path: str, language: str = "en-US") -> dict:
        """Transcribe audio and return confidence score if available"""
        try:
            with sr.AudioFile(audio_path) as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_data = self.recognizer.record(source)
            
            # Use Google Speech Recognition with show_all=True to get confidence
            try:
                google_language = self._map_language_for_google(language)
                result = self.recognizer.recognize_google(
                    audio_data, 
                    language=google_language, 
                    show_all=True
                )
                
                if result and 'alternative' in result:
                    best_result = result['alternative'][0]
                    return {
                        'text': best_result.get('transcript', ''),
                        'confidence': best_result.get('confidence', 0.0)
                    }
                else:
                    return {'text': 'No speech detected', 'confidence': 0.0}
            
            except sr.RequestError:
                # Fallback without confidence score
                text = await self.transcribe_audio(audio_path, language)
                return {'text': text, 'confidence': None}
        
        except Exception as e:
            return {'text': f'Error: {str(e)}', 'confidence': 0.0}
    
    def detect_speech_activity(self, audio_path: str) -> dict:
        """Detect if there's speech activity in the audio"""
        try:
            with sr.AudioFile(audio_path) as source:
                audio_data = self.recognizer.record(source)
            
            # Simple energy-based voice activity detection
            audio_segment = AudioSegment.from_wav(audio_path)
            
            # Calculate audio statistics
            avg_db = audio_segment.dBFS
            max_db = audio_segment.max_dBFS
            duration = len(audio_segment) / 1000.0  # Convert to seconds
            
            # Simple heuristics for speech detection
            has_speech = (
                avg_db > -40 and  # Not too quiet
                max_db > -20 and  # Has some peaks
                duration > 0.5    # Minimum duration
            )
            
            return {
                'has_speech': has_speech,
                'duration_seconds': duration,
                'average_db': avg_db,
                'max_db': max_db
            }
        
        except Exception as e:
            return {
                'has_speech': False,
                'duration_seconds': 0,
                'average_db': -60,
                'max_db': -60,
                'error': str(e)
            }
    
    async def process_voice_command(self, audio_path: str, language: str = "en-US") -> dict:
        """Process voice command and return structured result"""
        try:
            # First check if there's speech activity
            activity = self.detect_speech_activity(audio_path)
            
            if not activity['has_speech']:
                return {
                    'success': False,
                    'text': '',
                    'message': 'No speech detected in audio',
                    'activity': activity
                }
            
            # Transcribe with confidence
            transcription = await self.transcribe_with_confidence(audio_path, language)
            
            # Determine if transcription was successful
            success = (
                transcription['text'] and 
                not transcription['text'].startswith('Could not') and
                not transcription['text'].startswith('Error:')
            )
            
            return {
                'success': success,
                'text': transcription['text'],
                'confidence': transcription.get('confidence'),
                'language': language,
                'activity': activity,
                'message': 'Speech successfully transcribed' if success else 'Transcription failed'
            }
        
        except Exception as e:
            return {
                'success': False,
                'text': '',
                'message': f'Error processing voice command: {str(e)}',
                'activity': {'has_speech': False}
            }
    
    def get_supported_formats(self) -> list:
        """Get list of supported audio formats"""
        return [
            'wav', 'mp3', 'flac', 'aac', 'm4a', 'ogg', 'wma'
        ]
    
    def get_optimal_settings(self) -> dict:
        """Get optimal audio settings for speech recognition"""
        return {
            'sample_rate': 16000,  # 16kHz
            'channels': 1,         # Mono
            'bit_depth': 16,       # 16-bit
            'format': 'wav',       # WAV format
            'max_duration': 60,    # Maximum 60 seconds
            'min_duration': 0.5    # Minimum 0.5 seconds
        }
    
    async def cleanup_temp_files(self):
        """Clean up temporary audio files"""
        try:
            temp_files = [f for f in os.listdir(self.temp_dir) if f.startswith('temp_audio_')]
            for filename in temp_files:
                file_path = os.path.join(self.temp_dir, filename)
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error removing temp file {filename}: {e}")
        except Exception as e:
            print(f"Error during temp file cleanup: {e}")
