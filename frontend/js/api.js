// API configuration
const API_BASE_URL = 'http://localhost:8001';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.currentFileId = null;
    }

    // Helper method to handle API responses
    async handleResponse(response) {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = `HTTP error! status: ${response.status}`;
            
            if (errorData.detail) {
                // Handle both string and object error details
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (typeof errorData.detail === 'object') {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }
            
            throw new Error(errorMessage);
        }
        return response.json();
    }

    // Upload PDF file
    async uploadPDF(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/upload-pdf`, {
            method: 'POST',
            body: formData
        });

        const result = await this.handleResponse(response);
        this.currentFileId = result.file_id;
        return result;
    }

    // Send chat message
    async sendChatMessage(message, language = 'en-US', chatHistory = [], voiceId = null) {
        const payload = {
            message: message,
            file_id: this.currentFileId,
            language: language,
            chat_history: chatHistory,
            voice_id: voiceId,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(`${this.baseURL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        return this.handleResponse(response);
    }

    // Synthesize voice from text
    async synthesizeVoice(text, voiceId = 'en-US-julia', language = 'en-US', speed = 1.0) {
        const payload = {
            text: text,
            voice_id: voiceId,
            language: language,
            speed: speed
        };

        const response = await fetch(`${this.baseURL}/synthesize-voice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        return this.handleResponse(response);
    }

    // Transcribe audio to text
    async transcribeAudio(audioFile) {
        const formData = new FormData();
        formData.append('audio', audioFile);

        const response = await fetch(`${this.baseURL}/transcribe-audio`, {
            method: 'POST',
            body: formData
        });

        return this.handleResponse(response);
    }

    // Voice chat (combines chat + voice synthesis)
    async voiceChat(message, language = 'en-US', chatHistory = [], voiceId = 'en-US-julia') {
        const payload = {
            message: message,
            file_id: this.currentFileId,
            language: language,
            chat_history: chatHistory,
            voice_id: voiceId,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(`${this.baseURL}/voice-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        return this.handleResponse(response);
    }

    // Get available voices
    async getAvailableVoices() {
        const response = await fetch(`${this.baseURL}/voices`);
        return this.handleResponse(response);
    }

    // Get supported languages
    async getSupportedLanguages() {
        const response = await fetch(`${this.baseURL}/languages`);
        return this.handleResponse(response);
    }

    // Call with PDF - Full audio pipeline
    async callWithPDF(audioBlob, fileId, language = 'en-US', voiceId = 'en-US-julia') {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice_input.wav');
        
        // Add query parameters
        const params = new URLSearchParams({
            file_id: fileId || '',
            language: language,
            voice_id: voiceId
        });
        
        const response = await fetch(`${this.baseURL}/call-with-pdf?${params}`, {
            method: 'POST',
            body: formData
        });
        
        return this.handleResponse(response);
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Get current file ID
    getCurrentFileId() {
        return this.currentFileId;
    }

    // Clear current file
    clearCurrentFile() {
        this.currentFileId = null;
    }
}
