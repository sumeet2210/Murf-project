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
        
        // Initially disable Call with PDF button
        this.enableCallWithPDF(false);
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
        
        // Add voice options with specialties
        if (languageVoices.length > 0) {
            languageVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.voice_id;
                
                // Create comprehensive voice description
                const genderIcon = voice.gender === 'female' ? '♀' : '♂';
                const specialty = voice.specialty ? ` - ${voice.specialty}` : '';
                const style = voice.style ? ` (${voice.style})` : '';
                
                option.textContent = `${genderIcon} ${voice.name}${style}${specialty}`;
                option.title = `${voice.description || ''} | Accent: ${voice.accent || 'Standard'}`;
                
                voiceSelect.appendChild(option);
            });
            this.currentVoiceId = languageVoices[0].voice_id;
        } else {
            // Enhanced fallback with more voice options
            const fallbackVoices = this._getFallbackVoicesForLanguage(selectedLanguage);
            
            fallbackVoices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.id;
                option.textContent = voice.name;
                option.title = voice.description || '';
                voiceSelect.appendChild(option);
            });
            this.currentVoiceId = fallbackVoices[0].id;
        }
    }

    // Get fallback voices for a language when API is unavailable
    _getFallbackVoicesForLanguage(language) {
        const fallbackMap = {
            'en-US': [
                { id: 'en-US-julia', name: '♀ Julia (Professional & Warm)', description: 'Business presentations, e-learning' },
                { id: 'en-US-adam', name: '♂ Adam (Corporate & Leadership)', description: 'Executive presentations, corporate communications' },
                { id: 'en-US-natalie', name: '♀ Natalie (Marketing & Advertising)', description: 'Commercials, promotional content' }
            ],
            'en-GB': [
                { id: 'en-GB-olivia', name: '♀ Olivia (Luxury & Premium)', description: 'Sophisticated British accent for luxury brands' },
                { id: 'en-GB-alfred', name: '♂ Alfred (Education & Literature)', description: 'Classic British voice for educational content' }
            ],
            'es-ES': [
                { id: 'es-ES-elena', name: '♀ Elena (Customer Service)', description: 'Native Spanish with clear pronunciation' },
                { id: 'es-MX-carlos', name: '♂ Carlos (Casual & Social)', description: 'Mexican Spanish for Latin American content' }
            ],
            'fr-FR': [
                { id: 'fr-FR-lea', name: '♀ Léa (Fashion & Culture)', description: 'Elegant Parisian French' },
                { id: 'fr-FR-laurent', name: '♂ Laurent (Business & Finance)', description: 'Professional French for business' }
            ],
            'de-DE': [
                { id: 'de-DE-petra', name: '♀ Petra (Technical & Educational)', description: 'Clear German for technical content' },
                { id: 'de-DE-klaus', name: '♂ Klaus (Industrial & Engineering)', description: 'Strong German for industrial presentations' }
            ],
            'it-IT': [
                { id: 'it-IT-sofia', name: '♀ Sofia (Arts & Culture)', description: 'Beautiful Italian for cultural content' }
            ],
            'pt-BR': [
                { id: 'pt-BR-camila', name: '♀ Camila (Entertainment & Media)', description: 'Brazilian Portuguese for entertainment' }
            ],
            'ja-JP': [
                { id: 'ja-JP-kenji', name: '♂ Kenji (Business & Technology)', description: 'Professional Japanese for business' },
                { id: 'ja-JP-akane', name: '♀ Akane (Customer Service)', description: 'Warm Japanese for customer interactions' }
            ],
            'ko-KR': [
                { id: 'ko-KR-minji', name: '♀ Minji (Education & Training)', description: 'Clear Korean for educational content' }
            ],
            'zh-CN': [
                { id: 'zh-CN-xiaomei', name: '♀ Xiaomei (News & Broadcasting)', description: 'Standard Mandarin for news content' },
                { id: 'zh-CN-wang', name: '♂ Wang (Corporate & Government)', description: 'Authoritative Mandarin for official communications' }
            ],
            'hi-IN': [
                { id: 'hi-IN-priya', name: '♀ Priya (Education & Training)', description: 'Clear Hindi for educational content' }
            ],
            'ar-SA': [
                { id: 'ar-SA-fatima', name: '♀ Fatima (News & Media)', description: 'Professional Arabic for media content' }
            ],
            'nl-NL': [
                { id: 'nl-NL-emma', name: '♀ Emma (Customer Service)', description: 'Warm Dutch for customer interactions' }
            ],
            'ru-RU': [
                { id: 'ru-RU-dmitri', name: '♂ Dmitri (Documentary & Narration)', description: 'Rich Russian voice for storytelling' }
            ]
        };
        
        return fallbackMap[language] || fallbackMap['en-US'];
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

    // Enable or disable Call with PDF button
    enableCallWithPDF(enabled) {
        const callBtn = document.getElementById('callWithPdfBtn');
        if (callBtn) {
            callBtn.disabled = !enabled;
            callBtn.style.opacity = enabled ? '1' : '0.5';
            callBtn.title = enabled 
                ? 'Start a call with your PDF' 
                : 'Upload a PDF first to start a call';
        }
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
            setTimeout(() => this.updateUploadProgress(30), 500);
            setTimeout(() => this.updateUploadProgress(60), 1000);

            const result = await apiService.uploadPDF(file);
            
            this.updateUploadProgress(100);
            setTimeout(() => {
                this.hideLoading();
                this.showUploadProgress(false);
                
                // Set PDF info in chat manager
                chatManager.setPDFInfo(result);
                
                // Enable Call with PDF button
                this.enableCallWithPDF(true);
                
                showToast('PDF processed successfully!', 'success');
            }, 500);

        } catch (error) {
            console.error('Upload error:', error);
            this.hideLoading();
            this.showUploadProgress(false);
            showToast(`Upload failed: ${error.message}`, 'error');
        }
    }

    // Show upload progress
    showUploadProgress(show) {
        const progressElement = document.getElementById('uploadProgress');
        if (progressElement) {
            progressElement.classList.toggle('hidden', !show);
        }
    }

    // Update upload progress
    updateUploadProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `Processing... ${percent}%`;
    }

    // Send chat message
    async sendMessage(messageText = null) {
        const messageInput = document.getElementById('messageInput');
        const message = messageText || messageInput.value.trim();
        
        if (!message) {
            showToast('Please enter a message', 'warning');
            return;
        }

        // Check if we have a current chat
        const currentChat = chatManager.getCurrentChat();
        if (!currentChat) {
            showToast('Please create a new chat first', 'warning');
            return;
        }

        // Check if chat has PDF
        if (!currentChat.pdfInfo) {
            showToast('Please upload a PDF first', 'warning');
            return;
        }

        // Clear input if using input field
        if (!messageText) {
            messageInput.value = '';
        }

        // Add user message to chat
        chatManager.addMessage('user', message);

        try {
            this.showLoading('Generating response...');

            let response;
            if (this.isVoiceMode) {
                // Voice chat with audio response
                response = await apiService.voiceChat(
                    message, 
                    this.currentLanguage, 
                    currentChat.messages.slice(-10), // Last 10 messages for context
                    this.currentVoiceId
                );
                
                // Add bot message with audio (if available) or Web Speech fallback
                if (response.audio_url) {
                    chatManager.addMessage('assistant', response.text_response, response.audio_url);
                } else if (response.use_web_speech) {
                    // Use Web Speech API as fallback
                    chatManager.addMessage('assistant', response.text_response);
                    showToast('Using browser Text-to-Speech (Murf API unavailable)', 'info');
                    
                    // Automatically speak the response using Web Speech API
                    try {
                        await webSpeechService.speakText(
                            response.text_response, 
                            this.currentLanguage, 
                            this.currentVoiceId
                        );
                    } catch (error) {
                        console.error('Web Speech error:', error);
                        showToast('Web Speech synthesis failed', 'warning');
                    }
                } else {
                    chatManager.addMessage('assistant', response.text_response);
                    if (response.status === 'fallback') {
                        showToast(response.message || 'Voice synthesis unavailable - text response only', 'warning');
                    }
                }
            } else {
                // Text-only chat
                response = await apiService.sendChatMessage(
                    message, 
                    this.currentLanguage, 
                    currentChat.messages.slice(-10)
                );
                
                // Add bot message
                chatManager.addMessage('assistant', response.response);
            }

        } catch (error) {
            console.error('Chat error:', error);
            chatManager.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
            showToast(`Chat error: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Toggle voice mode
    toggleVoiceMode() {
        const voiceModeBtn = document.getElementById('voiceModeBtn');
        
        this.isVoiceMode = !this.isVoiceMode;
        
        if (this.isVoiceMode) {
            voiceModeBtn.classList.add('active');
            voiceModeBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            voiceModeBtn.title = 'Voice Mode ON - Click to disable';
            showToast('Voice mode enabled - responses will include audio', 'success');
        } else {
            voiceModeBtn.classList.remove('active');
            voiceModeBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceModeBtn.title = 'Voice Mode OFF - Click to enable';
            showToast('Voice mode disabled', 'info');
        }
    }

    // Start voice input
    startVoiceInput() {
        if (!voiceService.isSupported()) {
            showToast('Speech recognition not supported in this browser', 'error');
            return;
        }

        voiceService.startListening(this.currentLanguage);
    }

    // Show loading overlay
    showLoading(text = 'Processing...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// Global functions for HTML onclick events
function sendMessage() {
    app.sendMessage();
}

function toggleVoiceMode() {
    app.toggleVoiceMode();
}

function startVoiceInput() {
    app.startVoiceInput();
}

function updateVoiceOptions() {
    app.updateVoiceOptions();
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Modal functions
function showModal(title, content, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm = null) {
    const modal = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtns = document.querySelectorAll('.modal-footer .secondary-btn');
    
    modalTitle.textContent = title;
    modalMessage.textContent = content;
    modalConfirmBtn.textContent = confirmText;
    
    // Update cancel button text if needed
    if (cancelBtns.length > 0) {
        cancelBtns[0].textContent = cancelText;
    }
    
    modal.classList.remove('hidden');
    
    // Set the confirm callback
    app.modalConfirmCallback = onConfirm;
}

function hideModal() {
    const modal = document.getElementById('modalOverlay');
    modal.classList.add('hidden');
    app.modalConfirmCallback = null;
}

function closeModal() {
    hideModal();
}

function confirmModal() {
    if (app.modalConfirmCallback) {
        app.modalConfirmCallback();
    }
    hideModal();
}

function cancelModal() {
    hideModal();
}

// Chat management functions
function createNewChat() {
    chatManager.createNewChat();
}

function deleteChat(chatId) {
    chatManager.confirmDeleteChat(chatId);
}

function switchChat(chatId) {
    chatManager.setActiveChat(chatId);
}

function deleteChat(chatId) {
    showModal(
        'Delete Chat',
        'Are you sure you want to delete this chat? This action cannot be undone.',
        'Delete',
        'Cancel',
        () => chatManager.deleteChat(chatId)
    );
}

// UI control functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function cancelUpload() {
    // Clear file input
    document.getElementById('pdfInput').value = '';
    // Hide upload progress if showing
    const uploadProgress = document.getElementById('uploadProgress');
    if (uploadProgress) {
        uploadProgress.classList.add('hidden');
    }
}

function toggleDocumentInfo() {
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

// Initialize app when DOM is loaded
let app, apiService, voiceService, audioPlayer, chatManager, webSpeechService;
document.addEventListener('DOMContentLoaded', () => {
    // Initialize services
    apiService = new APIService();
    voiceService = new VoiceService();
    audioPlayer = new AudioPlayer();
    chatManager = new ChatManager();
    webSpeechService = new WebSpeechService();
    
    // Make services globally accessible
    window.apiService = apiService;
    window.voiceService = voiceService;
    window.audioPlayer = audioPlayer;
    window.chatManager = chatManager;
    window.webSpeechService = webSpeechService;
    
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

// Global function to stop all audio playback
function stopAllAudio() {
    if (window.audioPlayer) {
        window.audioPlayer.stop();
        showToast('All audio playback stopped', 'info');
    }
}
