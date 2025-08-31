// Main application logic
class TalkToPDFApp {
    constructor() {
        this.isVoiceMode = false;
        this.currentLanguage = 'en-US';
        this.currentVoiceId = 'en-US-julia'; // Use confirmed working voice ID
        this.availableVoices = [];
        this.modalConfirmCallback = null;
        
        this.initializeApp();
    }

    // Initialize the application
    async initializeApp() {
        this.setupEventListeners();
        this.checkAPIHealth();
        await this.loadVoicesAndLanguages();
    }

    // Setup all event listeners
    setupEventListeners() {
        // File input change
        document.getElementById('pdfInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop functionality
        const uploadArea = document.getElementById('uploadArea');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                this.handleFileUpload(files[0]);
            } else {
                showToast('Please drop a valid PDF file', 'error');
            }
        });

        // Language selection change
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            voiceService.setLanguage(this.currentLanguage);
            this.updateVoiceOptions();
        });

        // Voice selection change
        document.getElementById('voiceSelect').addEventListener('change', (e) => {
            this.currentVoiceId = e.target.value;
        });

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC key to stop audio
            if (e.key === 'Escape' && window.audioPlayer && window.audioPlayer.isPlaying()) {
                stopAllAudio();
            }
        });

        // Message input enter key
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Sidebar toggle for mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = e.target.closest('.sidebar-toggle');
            
            if (sidebarToggle) {
                sidebar.classList.toggle('open');
            } else if (!sidebar.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Check if API is healthy
    async checkAPIHealth() {
        try {
            const isHealthy = await apiService.healthCheck();
            if (!isHealthy) {
                showToast('Backend API is not accessible. Please ensure the server is running.', 'warning');
            }
        } catch (error) {
            console.error('API health check failed:', error);
            showToast('Cannot connect to backend server', 'error');
        }
    }

    // Load available voices and languages
    async loadVoicesAndLanguages() {
        try {
            // Load voices
            const voicesData = await apiService.getAvailableVoices();
            this.availableVoices = voicesData.voices || [];
            this.updateVoiceOptions();
            
            showToast('Voice options loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading voices:', error);
            showToast('Using default voice options', 'info');
        }
    }

    // Update voice options based on selected language
    updateVoiceOptions() {
        const voiceSelect = document.getElementById('voiceSelect');
        const selectedLanguage = this.currentLanguage;
        
        // Clear current options
        voiceSelect.innerHTML = '';
        
        // Filter voices by language
        const languageVoices = this.availableVoices.filter(voice => 
            voice.language === selectedLanguage || 
            voice.language.startsWith(selectedLanguage.split('-')[0])
        );
        
        // Add voice options
        if (languageVoices.length > 0) {
            languageVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voice_id;
                option.textContent = `${voice.name} (${voice.gender})`;
                voiceSelect.appendChild(option);
            });
            this.currentVoiceId = languageVoices[0].voice_id;
        } else {
            // Use only confirmed working Murf voice IDs - fallback to julia for all languages
            // We'll provide native language support only for voices we know work
            const fallbackVoices = {
                'en-US': [
                    { id: 'en-US-julia', name: 'Julia (Female)' }
                ],
                'en-GB': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'es-ES': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'fr-FR': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'de-DE': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'it-IT': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'pt-BR': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'ja-JP': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'ko-KR': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'zh-CN': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'hi-IN': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ],
                'ar-SA': [
                    { id: 'en-US-julia', name: 'Julia (Female - English)' }
                ]
            };
            
            const voices = fallbackVoices[selectedLanguage] || fallbackVoices['en-US'];
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.id;
                option.textContent = voice.name;
                voiceSelect.appendChild(option);
            });
            this.currentVoiceId = voices[0].id;
        }
    }

    // Get appropriate voice for a given language
    getVoiceForLanguage(language) {
        // First try to find a voice that matches the exact language
        let voice = this.availableVoices.find(v => v.language === language);
        
        if (!voice) {
            // Try to find a voice that matches the language code (e.g., 'en' from 'en-US')
            const languageCode = language.split('-')[0];
            voice = this.availableVoices.find(v => v.language.startsWith(languageCode));
        }
        
        if (!voice) {
            // Fallback to default working voice
            return {
                voice_id: 'en-US-julia',
                language: language,
                name: 'Julia (English fallback)'
            };
        }
        
        return {
            voice_id: voice.voice_id,
            language: voice.language,
            name: voice.name
        };
    }

    // Handle file upload
    async handleFileUpload(file) {
        if (!file || file.type !== 'application/pdf') {
            showToast('Please select a valid PDF file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showToast('File size must be less than 10MB', 'error');
            return;
        }

        // Ensure we have a current chat
        if (!chatManager.getCurrentChat()) {
            chatManager.createNewChat();
        }

        try {
            this.showLoading('Uploading and processing PDF...');
            this.showUploadProgress(true);

            // Simulate upload progress
            this.updateUploadProgress(0);
            
            const uploadResponse = await apiService.uploadPDF(file, (progress) => {
                this.updateUploadProgress(progress);
            });
            
            this.updateUploadProgress(100);
            
            // Update chat with PDF info
            chatManager.setPDFInfo(uploadResponse);
            
            this.hideLoading();
            this.showUploadProgress(false);
            
            showToast('PDF uploaded and processed successfully!', 'success');
            
        } catch (error) {
            console.error('File upload error:', error);
            this.hideLoading();
            this.showUploadProgress(false);
            showToast(`Upload failed: ${error.message}`, 'error');
        }
    }

    // Show loading overlay
    showLoading(message) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        loadingMessage.textContent = message;
        loadingOverlay.style.display = 'flex';
    }

    // Hide loading overlay
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = 'none';
    }

    // Show upload progress
    showUploadProgress(show) {
        const progressContainer = document.getElementById('uploadProgress');
        progressContainer.style.display = show ? 'block' : 'none';
        if (!show) {
            this.updateUploadProgress(0);
        }
    }

    // Update upload progress
    updateUploadProgress(percentage) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${Math.round(percentage)}%`;
    }

    // Handle voice input
    async handleVoiceInput() {
        if (!voiceService.isSupported()) {
            showToast('Speech recognition not supported in this browser', 'error');
            return;
        }

        try {
            voiceService.startListening(this.currentLanguage);
        } catch (error) {
            console.error('Voice input error:', error);
            showToast('Voice input failed. Please check microphone permissions.', 'error');
        }
    }
}

// Audio player service
class AudioPlayer {
    constructor() {
        this.currentAudio = null;
        this.currentButton = null;
    }

    async playAudio(url, button = null) {
        try {
            // Stop any currently playing audio
            this.stop();
            
            this.currentAudio = new Audio(url);
            this.currentButton = button;
            
            this.currentAudio.onloadstart = () => {
                console.log('Audio loading started');
            };
            
            this.currentAudio.oncanplay = () => {
                console.log('Audio can start playing');
            };
            
            this.currentAudio.onplay = () => {
                console.log('Audio playback started');
            };
            
            this.currentAudio.onended = () => {
                console.log('Audio playback ended');
                this.cleanup();
            };
            
            this.currentAudio.onerror = (e) => {
                console.error('Audio playback error:', e);
                this.cleanup();
                throw new Error('Audio playback failed');
            };
            
            await this.currentAudio.play();
            
        } catch (error) {
            console.error('Audio play error:', error);
            this.cleanup();
            throw error;
        }
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.cleanup();
        }
    }

    cleanup() {
        if (this.currentButton) {
            this.currentButton.innerHTML = '🔊 <span>Generate Voice</span>';
            this.currentButton.disabled = false;
        }
        this.currentAudio = null;
        this.currentButton = null;
    }

    isPlaying() {
        return this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended;
    }
}

// API Service class
class APIService {
    constructor() {
        this.baseURL = 'http://localhost:8001';
        this.currentFileId = null;
    }

    getCurrentFileId() {
        return this.currentFileId;
    }

    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getAvailableVoices() {
        try {
            const response = await fetch(`${this.baseURL}/voices`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching voices:', error);
            throw error;
        }
    }

    async uploadPDF(file, onProgress = null) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${this.baseURL}/upload-pdf`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Upload failed');
            }

            const result = await response.json();
            this.currentFileId = result.file_id;
            return result;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    async sendMessage(message, language = 'en-US') {
        try {
            const response = await fetch(`${this.baseURL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    file_id: this.currentFileId,
                    language: language
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Chat request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Chat error:', error);
            throw error;
        }
    }

    async synthesizeVoice(text, voiceId = 'en-US-julia', language = 'en-US', speed = 1.0) {
        try {
            const response = await fetch(`${this.baseURL}/synthesize-voice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice_id: voiceId,
                    language: language,
                    speed: speed
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail?.message || error.detail || 'Voice synthesis failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Voice synthesis error:', error);
            throw error;
        }
    }

    async callWithPDF(audioBlob, language = 'en-US', voiceId = 'en-US-julia') {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice_input.wav');
            formData.append('file_id', this.currentFileId);
            formData.append('language', language);
            formData.append('voice_id', voiceId);

            const response = await fetch(`${this.baseURL}/call-with-pdf`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Call with PDF failed');
            }

            return await response.json();
        } catch (error) {
            console.error('Call with PDF error:', error);
            throw error;
        }
    }
}

// Global functions
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    messageInput.value = '';
    chatManager.sendMessage(message);
}

function startVoiceInput() {
    if (app) {
        app.handleVoiceInput();
    }
}

function collapseDocument() {
    const docInfo = document.getElementById('documentInfo');
    const collapseBtn = document.querySelector('.collapse-btn');
    
    if (docInfo.classList.contains('collapsed')) {
        docInfo.classList.remove('collapsed');
        collapseBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    } else {
        docInfo.classList.add('collapsed');
        collapseBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
}

function uploadNewPDF() {
    document.getElementById('pdfInput').click();
}

function closeModal() {
    hideModal();
}

// Toast notification system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `${icon}<span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function getToastIcon(type) {
    switch (type) {
        case 'success':
            return '<i class="fas fa-check-circle"></i>';
        case 'error':
            return '<i class="fas fa-exclamation-circle"></i>';
        case 'warning':
            return '<i class="fas fa-exclamation-triangle"></i>';
        case 'info':
        default:
            return '<i class="fas fa-info-circle"></i>';
    }
}

// Global function to stop all audio playback
function stopAllAudio() {
    if (window.audioPlayer) {
        window.audioPlayer.stop();
        showToast('All audio playback stopped', 'info');
    }
}

// Global function to start Call with PDF
async function startCallWithPDF() {
    try {
        // Check if we have a PDF loaded
        const currentFileId = window.apiService ? window.apiService.getCurrentFileId() : null;
        
        if (!currentFileId) {
            showToast('Please upload a PDF first before starting a call', 'error');
            return;
        }

        // Check if speech recognition is supported
        if (!window.callManager || !window.callManager.isSpeechRecognitionSupported()) {
            showToast('Speech recognition is not supported in your browser. Please use Chrome or Edge.', 'error');
            return;
        }

        // Get current language and voice settings
        const selectedLanguage = document.getElementById('languageSelect').value;
        const selectedVoice = document.getElementById('voiceSelect').value;

        // Start the call interface
        window.callManager.startCall(selectedLanguage, selectedVoice);
        
    } catch (error) {
        console.error('Error starting call with PDF:', error);
        showToast(`Failed to start call: ${error.message}`, 'error');
    }
}

// Initialize app when DOM is loaded
let app, apiService, voiceService, audioPlayer, chatManager, webSpeechService, callManager;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize services
    apiService = new APIService();
    voiceService = new VoiceService();
    audioPlayer = new AudioPlayer();
    chatManager = new ChatManager();
    webSpeechService = new WebSpeechService();
    callManager = new CallManager();
    
    // Make services globally accessible
    window.apiService = apiService;
    window.voiceService = voiceService;
    window.audioPlayer = audioPlayer;
    window.chatManager = chatManager;
    window.webSpeechService = webSpeechService;
    window.callManager = callManager;
    
    // Initialize main app and make it globally accessible
    app = new TalkToPDFApp();
    window.app = app; // Make app globally accessible
    console.log('Talk to PDF App initialized');
});

// Test Murf API function
async function testMurfAPI() {
    const testButton = document.querySelector('.test-murf-btn');
    const originalText = testButton.innerHTML;
    
    try {
        testButton.disabled = true;
        testButton.innerHTML = '⏳ Testing...';
        
        console.log('Testing Murf API...');
        
        // Get selected language and voice
        const selectedLanguage = document.getElementById('languageSelect').value;
        const selectedVoice = document.getElementById('voiceSelect').value;
        
        // Multilingual test messages
        const testMessages = {
            'en-US': "Hello! This is a test of the Murf AI text-to-speech system. The API is working correctly!",
            'en-GB': "Hello! This is a test of the Murf AI text-to-speech system. The API is working brilliantly!",
            'es-ES': "¡Hola! Esta es una prueba del sistema de texto a voz de Murf AI. ¡La API funciona correctamente!",
            'es-MX': "¡Hola! Esta es una prueba del sistema de texto a voz de Murf AI. ¡La API está funcionando perfectamente!",
            'fr-FR': "Bonjour! Ceci est un test du système de synthèse vocale Murf AI. L'API fonctionne correctement!",
            'de-DE': "Hallo! Dies ist ein Test des Murf AI Text-zu-Sprache Systems. Die API funktioniert korrekt!",
            'it-IT': "Ciao! Questo è un test del sistema di sintesi vocale Murf AI. L'API funziona correttamente!",
            'pt-BR': "Olá! Este é um teste do sistema de texto para fala Murf AI. A API está funcionando corretamente!",
            'ja-JP': "こんにちは！これはMurf AIのテキスト読み上げシステムのテストです。APIは正常に動作しています！",
            'ko-KR': "안녕하세요! 이것은 Murf AI 텍스트 음성 변환 시스템의 테스트입니다. API가 올바르게 작동하고 있습니다!",
            'zh-CN': "您好！这是Murf AI文本转语音系统的测试。API运行正常！",
            'hi-IN': "नमस्ते! यह Murf AI टेक्स्ट-टू-स्पीच सिस्टम का परीक्षण है। API सही तरीके से काम कर रहा है!",
            'ar-SA': "مرحبا! هذا اختبار لنظام تحويل النص إلى كلام من Murf AI. واجهة برمجة التطبيقات تعمل بشكل صحيح!"
        };
        
        const testText = testMessages[selectedLanguage] || testMessages['en-US'];
        
        console.log(`Testing with language: ${selectedLanguage}, voice: ${selectedVoice}`);
        console.log(`Test text: ${testText}`);
        
        const response = await window.apiService.synthesizeVoice(
            testText,
            selectedVoice,
            selectedLanguage,
            1.0
        );
        
        console.log('Murf API test response:', response);
        
        if (response.audio_url) {
            testButton.innerHTML = '✅ Playing...';
            await window.audioPlayer.playAudio(response.audio_url);
            showToast(`Murf API test successful! (${selectedLanguage}) 🎉`, 'success');
        } else {
            throw new Error('No audio URL in response');
        }
        
    } catch (error) {
        console.error('Murf API test error:', error);
        showToast(`Murf API test failed: ${error.message}`, 'error');
        testButton.innerHTML = '❌ Failed';
    } finally {
        setTimeout(() => {
            testButton.innerHTML = originalText;
            testButton.disabled = false;
        }, 3000);
    }
}
