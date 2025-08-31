// Call with PDF - Phone call-like interface for hands-free PDF interaction
class CallManager {
    constructor() {
        this.isCallActive = false;
        this.isListening = false;
        this.isProcessing = false;
        this.currentFileId = null;
        this.currentLanguage = 'en-US';
        this.currentVoiceId = 'en-US-julia';
        this.callHistory = [];
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.callStartTime = null;
        this.callDuration = 0;
        this.callTimer = null;
        this.currentAudio = null;
        
        this.initializeCallInterface();
    }

    // Initialize the call interface
    initializeCallInterface() {
        this.createCallModal();
        this.setupCallControls();
    }

    // Create the call modal interface
    createCallModal() {
        const callModal = document.createElement('div');
        callModal.id = 'callModal';
        callModal.className = 'call-modal hidden';
        
        callModal.innerHTML = `
            <div class="call-interface">
                <div class="call-header">
                    <div class="call-avatar">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <div class="call-info">
                        <h3 id="callDocumentTitle">Document Call</h3>
                        <p id="callStatus">Ready to start</p>
                        <p id="callDuration">00:00</p>
                    </div>
                </div>
                
                <div class="call-conversation">
                    <div id="callMessages" class="call-messages">
                        <div class="call-welcome">
                            <i class="fas fa-phone"></i>
                            <p>Tap the microphone to start talking with your PDF</p>
                        </div>
                    </div>
                </div>
                
                <div class="call-controls">
                    <button id="callMicBtn" class="call-btn mic-btn" title="Hold to speak">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button id="callEndBtn" class="call-btn end-btn" title="End call">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                    <button id="callMuteBtn" class="call-btn mute-btn" title="Mute/Unmute">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                
                <div class="call-settings">
                    <div class="call-setting">
                        <label for="callLanguageSelect">Language:</label>
                        <select id="callLanguageSelect" class="call-select">
                            <option value="en-US">English (US)</option>
                            <option value="es-ES">Spanish</option>
                            <option value="fr-FR">French</option>
                            <option value="de-DE">German</option>
                            <option value="it-IT">Italian</option>
                            <option value="pt-BR">Portuguese</option>
                            <option value="ja-JP">Japanese</option>
                            <option value="hi-IN">Hindi</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(callModal);
    }

    // Setup call control event listeners
    setupCallControls() {
        // Mic button - push to talk
        const micBtn = document.getElementById('callMicBtn');
        
        // Mouse events for desktop
        micBtn.addEventListener('mousedown', () => this.startListening());
        micBtn.addEventListener('mouseup', () => this.stopListening());
        micBtn.addEventListener('mouseleave', () => this.stopListening());
        
        // Touch events for mobile
        micBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startListening();
        });
        micBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopListening();
        });
        
        // End call button
        document.getElementById('callEndBtn').addEventListener('click', () => {
            this.endCall();
        });
        
        // Mute button
        document.getElementById('callMuteBtn').addEventListener('click', () => {
            this.toggleMute();
        });
        
        // Language change
        document.getElementById('callLanguageSelect').addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            if (window.app && window.app.getVoiceForLanguage) {
                const voiceInfo = window.app.getVoiceForLanguage(this.currentLanguage);
                this.currentVoiceId = voiceInfo.voice_id;
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isCallActive) {
                if (e.code === 'Space' && !this.isListening) {
                    e.preventDefault();
                    this.startListening();
                } else if (e.key === 'Escape') {
                    this.endCall();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (this.isCallActive && e.code === 'Space' && this.isListening) {
                e.preventDefault();
                this.stopListening();
            }
        });
    }

    // Start a call with PDF
    async startCall(fileId, documentTitle) {
        if (this.isCallActive) {
            showToast('Call already in progress', 'warning');
            return;
        }

        this.currentFileId = fileId;
        this.callStartTime = Date.now();
        this.isCallActive = true;
        this.callHistory = [];
        
        // Update UI
        document.getElementById('callDocumentTitle').textContent = documentTitle || 'PDF Document';
        document.getElementById('callStatus').textContent = 'Call connected';
        document.getElementById('callModal').classList.remove('hidden');
        
        // Start call timer
        this.startCallTimer();
        
        // Add welcome message
        this.addCallMessage('system', 'Call connected! Hold the microphone button and speak to ask questions about your PDF.');
        
        showToast('Call started! Hold the microphone button to speak', 'success');
    }

    // Start listening for voice input
    async startListening() {
        if (!this.isCallActive || this.isListening || this.isProcessing) {
            return;
        }

        try {
            this.isListening = true;
            this.updateCallStatus('Listening...');
            
            // Update mic button visual state
            const micBtn = document.getElementById('callMicBtn');
            micBtn.classList.add('listening');
            
            // Start recording
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.processVoiceInput(audioBlob);
                
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            
        } catch (error) {
            console.error('Error starting voice recording:', error);
            showToast('Microphone access denied or not available', 'error');
            this.isListening = false;
            this.updateCallStatus('Call connected');
        }
    }

    // Stop listening for voice input
    stopListening() {
        if (!this.isListening || !this.mediaRecorder) {
            return;
        }

        this.isListening = false;
        this.updateCallStatus('Processing...');
        
        // Update mic button visual state
        const micBtn = document.getElementById('callMicBtn');
        micBtn.classList.remove('listening');
        
        // Stop recording
        this.mediaRecorder.stop();
    }

    // Process voice input and get AI response
    async processVoiceInput(audioBlob) {
        if (this.isProcessing) return;
        
        try {
            this.isProcessing = true;
            this.updateCallStatus('Processing your question...');
            
            // Send to call endpoint using API service
            const result = await window.apiService.callWithPDF(
                audioBlob, 
                this.currentFileId, 
                this.currentLanguage, 
                this.currentVoiceId
            );
            
            // Add user message to call history
            this.addCallMessage('user', result.user_message);
            
            // Add AI response to call history
            this.addCallMessage('assistant', result.ai_response);
            
            // Play AI response audio if available
            if (result.audio_url) {
                this.updateCallStatus('AI is speaking...');
                await this.playCallAudio(result.audio_url);
            }
            
            this.updateCallStatus('Call connected - Hold mic to speak');
            
        } catch (error) {
            console.error('Call processing error:', error);
            this.addCallMessage('system', `Error: ${error.message}`);
            this.updateCallStatus('Call connected - Error occurred');
            showToast(`Call error: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    // Play audio response during call
    async playCallAudio(audioUrl) {
        return new Promise((resolve, reject) => {
            // Check if muted
            const muteBtn = document.getElementById('callMuteBtn');
            const isMuted = muteBtn.querySelector('i').classList.contains('fa-volume-mute');
            
            if (isMuted) {
                console.log('Audio muted, skipping playback');
                resolve();
                return;
            }
            
            const audio = new Audio(audioUrl);
            
            // Store current playing audio for stop functionality
            this.currentAudio = audio;
            
            audio.onended = () => {
                this.currentAudio = null;
                resolve();
            };
            
            audio.onerror = (error) => {
                console.error('Call audio playback error:', error);
                this.currentAudio = null;
                reject(error);
            };
            
            audio.play().catch(reject);
        });
    }

    // Stop current audio playback
    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    // Add message to call conversation
    addCallMessage(type, message) {
        const messagesContainer = document.getElementById('callMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `call-message ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        
        let icon = '';
        switch (type) {
            case 'user':
                icon = '<i class="fas fa-user"></i>';
                break;
            case 'assistant':
                icon = '<i class="fas fa-robot"></i>';
                break;
            case 'system':
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        messageDiv.innerHTML = `
            <div class="call-message-header">
                ${icon}
                <span class="call-timestamp">${timestamp}</span>
            </div>
            <div class="call-message-content">${this.escapeHtml(message)}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Store in call history
        this.callHistory.push({
            type,
            message,
            timestamp: new Date().toISOString()
        });
    }

    // Update call status
    updateCallStatus(status) {
        document.getElementById('callStatus').textContent = status;
    }

    // Start call timer
    startCallTimer() {
        this.callTimer = setInterval(() => {
            if (this.callStartTime) {
                this.callDuration = Math.floor((Date.now() - this.callStartTime) / 1000);
                const minutes = Math.floor(this.callDuration / 60);
                const seconds = this.callDuration % 60;
                document.getElementById('callDuration').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    // End the call
    endCall() {
        if (!this.isCallActive) return;
        
        this.isCallActive = false;
        this.isListening = false;
        this.isProcessing = false;
        
        // Stop any current audio
        this.stopCurrentAudio();
        
        // Stop recording if active
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }
        
        // Stop call timer
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        
        // Hide call modal
        document.getElementById('callModal').classList.add('hidden');
        
        // Show call summary
        const duration = Math.floor(this.callDuration / 60);
        const seconds = this.callDuration % 60;
        showToast(`Call ended. Duration: ${duration}m ${seconds}s`, 'info');
        
        // Reset state
        this.callStartTime = null;
        this.callDuration = 0;
        this.currentFileId = null;
    }

    // Toggle mute/unmute
    toggleMute() {
        const muteBtn = document.getElementById('callMuteBtn');
        const icon = muteBtn.querySelector('i');
        
        if (icon.classList.contains('fa-volume-up')) {
            icon.className = 'fas fa-volume-mute';
            muteBtn.title = 'Unmute';
            // Stop current call audio
            this.stopCurrentAudio();
            showToast('Audio muted', 'info');
        } else {
            icon.className = 'fas fa-volume-up';
            muteBtn.title = 'Mute';
            showToast('Audio unmuted', 'info');
        }
    }

    // Set current file for the call
    setCurrentFile(fileId, title) {
        this.currentFileId = fileId;
        if (this.isCallActive) {
            document.getElementById('callDocumentTitle').textContent = title || 'PDF Document';
        }
    }

    // Set language and voice for the call
    setLanguageAndVoice(language, voiceId) {
        this.currentLanguage = language;
        this.currentVoiceId = voiceId;
        
        if (this.isCallActive) {
            document.getElementById('callLanguageSelect').value = language;
        }
    }

    // Get call history
    getCallHistory() {
        return this.callHistory;
    }

    // Check if call is active
    isActive() {
        return this.isCallActive;
    }

    // Escape HTML for security
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add call button to each chat for easy access
function addCallButtonToChat() {
    const currentChat = window.chatManager.getCurrentChat();
    if (!currentChat || !currentChat.fileId) {
        showToast('Please upload a PDF first to start a call', 'warning');
        return;
    }
    
    // Check if microphone is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Microphone access not available in this browser', 'error');
        return;
    }
    
    // Get current language and voice settings
    const selectedLanguage = document.getElementById('languageSelect').value;
    let voiceId = 'en-US-julia'; // Default fallback
    
    if (window.app && window.app.getVoiceForLanguage) {
        const voiceInfo = window.app.getVoiceForLanguage(selectedLanguage);
        voiceId = voiceInfo.voice_id;
    }
    
    // Start call with current PDF
    window.callManager.setLanguageAndVoice(selectedLanguage, voiceId);
    window.callManager.setCurrentFile(currentChat.fileId, currentChat.title);
    window.callManager.startCall(currentChat.fileId, currentChat.title);
}

// Initialize call manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add slight delay to ensure other services are initialized
    setTimeout(() => {
        window.callManager = new CallManager();
        console.log('Call Manager initialized');
    }, 100);
});
