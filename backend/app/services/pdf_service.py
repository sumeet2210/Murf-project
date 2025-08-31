import os
import aiofiles
from fastapi import UploadFile
import PyPDF2
import pdfplumber
from typing import Optional
import uuid
from datetime import datetime

class PDFService:
    def __init__(self):
        self.upload_dir = os.getenv("UPLOAD_DIR", "../uploads")
        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", 10485760))  # 10MB
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Store extracted text in memory (in production, use a database)
        self.pdf_texts = {}
    
    async def save_uploaded_file(self, file: UploadFile) -> str:
        """Save uploaded PDF file to disk"""
        # Check file size
        contents = await file.read()
        if len(contents) > self.max_file_size:
            raise ValueError("File too large")
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.pdf"
        file_path = os.path.join(self.upload_dir, filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(contents)
        
        return file_path
    
    async def extract_text(self, file_path: str) -> str:
        """Extract text from PDF using pdfplumber (more accurate than PyPDF2)"""
        try:
            extracted_text = ""
            
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n\n"
            
            # If pdfplumber fails, fallback to PyPDF2
            if not extracted_text.strip():
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        extracted_text += page.extract_text() + "\n\n"
            
            # Store extracted text in memory
            file_id = os.path.basename(file_path).split('.')[0]
            self.pdf_texts[file_id] = {
                'text': extracted_text,
                'extracted_at': datetime.now(),
                'file_path': file_path
            }
            
            return extracted_text
        
        except Exception as e:
            raise ValueError(f"Error extracting text from PDF: {str(e)}")
    
    async def get_pdf_context(self, file_id: str) -> str:
        """Get extracted text for a specific PDF"""
        # Handle both full path and just file_id
        if file_id.startswith(self.upload_dir):
            # If it's a full path, extract just the file_id
            file_id = os.path.basename(file_id).split('.')[0]
        
        if file_id in self.pdf_texts:
            return self.pdf_texts[file_id]['text']
        else:
            # Try to find by checking if file_id is part of the path
            for stored_id, data in self.pdf_texts.items():
                if stored_id == file_id or file_id in data.get('file_path', ''):
                    return data['text']
            
            raise ValueError(f"PDF with ID {file_id} not found")
    
    def get_pdf_info(self, file_id: str) -> Optional[dict]:
        """Get information about a processed PDF"""
        if file_id in self.pdf_texts:
            pdf_data = self.pdf_texts[file_id]
            return {
                'file_id': file_id,
                'text_length': len(pdf_data['text']),
                'extracted_at': pdf_data['extracted_at'],
                'file_path': pdf_data['file_path']
            }
        return None
    
    def chunk_text(self, text: str, chunk_size: int = 4000, overlap: int = 200) -> list:
        """Split text into chunks for processing large documents"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at sentence or paragraph boundary
            if end < len(text):
                # Look for paragraph break
                last_para = text.rfind('\n\n', start, end)
                if last_para > start:
                    end = last_para
                else:
                    # Look for sentence break
                    last_sentence = text.rfind('.', start, end)
                    if last_sentence > start:
                        end = last_sentence + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = max(start + 1, end - overlap)
        
        return chunks
    
    async def search_in_pdf(self, file_id: str, query: str) -> list:
        """Search for specific content in PDF"""
        if file_id not in self.pdf_texts:
            raise ValueError(f"PDF with ID {file_id} not found")
        
        text = self.pdf_texts[file_id]['text']
        query_lower = query.lower()
        results = []
        
        # Split into sentences for context
        sentences = text.split('.')
        
        for i, sentence in enumerate(sentences):
            if query_lower in sentence.lower():
                # Get some context around the match
                start_idx = max(0, i - 1)
                end_idx = min(len(sentences), i + 2)
                context = '. '.join(sentences[start_idx:end_idx])
                
                results.append({
                    'context': context.strip(),
                    'sentence_index': i,
                    'match': sentence.strip()
                })
        
        return results
    
    def cleanup_old_files(self, max_age_hours: int = 24):
        """Clean up old uploaded files"""
        current_time = datetime.now()
        to_remove = []
        
        for file_id, data in self.pdf_texts.items():
            age = current_time - data['extracted_at']
            if age.total_seconds() > (max_age_hours * 3600):
                to_remove.append(file_id)
        
        for file_id in to_remove:
            # Remove from memory
            pdf_data = self.pdf_texts.pop(file_id)
            
            # Remove file from disk
            try:
                if os.path.exists(pdf_data['file_path']):
                    os.remove(pdf_data['file_path'])
            except Exception as e:
                print(f"Error removing file {pdf_data['file_path']}: {e}")
    
    def get_text_statistics(self, file_id: str) -> dict:
        """Get statistics about the extracted text"""
        if file_id not in self.pdf_texts:
            raise ValueError(f"PDF with ID {file_id} not found")
        
        text = self.pdf_texts[file_id]['text']
        
        word_count = len(text.split())
        char_count = len(text)
        paragraph_count = text.count('\n\n') + 1
        
        # Estimate reading time (average 200 words per minute)
        reading_time_minutes = word_count / 200
        
        return {
            'word_count': word_count,
            'character_count': char_count,
            'paragraph_count': paragraph_count,
            'estimated_reading_time_minutes': round(reading_time_minutes, 1),
            'text_preview': text[:500] + ('...' if len(text) > 500 else '')
        }
