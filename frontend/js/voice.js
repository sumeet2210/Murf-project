// Voice functionality
class VoiceService {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.currentLanguage = 'en-US';
        this.initializeSpeechRecognition();
    }

    // Initialize speech recognition
    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        }

        if (this.recognition) {
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            this.setupRecognitionEvents();
        }
    }

    // Setup speech recognition event handlers
    setupRecognitionEvents() {
        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.isListening = true;
            this.updateVoiceUI(true);
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Speech recognition result:', transcript);
            this.handleSpeechResult(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateVoiceUI(false);
            
            let errorMessage = 'Speech recognition error';
            switch (event.error) {
                case 'network':
                    errorMessage = 'Network error during speech recognition';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied';
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected';
                    break;
                default:
                    errorMessage = `Speech recognition error: ${event.error}`;
            }
            
            showToast(errorMessage, 'error');
        };

        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            this.isListening = false;
            this.updateVoiceUI(false);
        };
    }

    // Start listening for speech
    startListening(language = 'en-US') {
        if (!this.recognition) {
            showToast('Speech recognition not supported in this browser', 'error');
            return;
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        try {
            this.recognition.lang = language;
            this.currentLanguage = language;
            this.recognition.start();
            showToast('Listening... Please speak now', 'info');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            showToast('Failed to start speech recognition', 'error');
        }
    }

    // Stop listening
    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // Handle speech recognition result
    handleSpeechResult(transcript) {
        if (transcript.trim()) {
            document.getElementById('messageInput').value = transcript;
            showToast(`Recognized: "${transcript}"`, 'success');
            
            // Auto-send if voice mode is active
            const voiceModeBtn = document.getElementById('voiceModeBtn');
            if (voiceModeBtn.classList.contains('active')) {
                setTimeout(() => sendMessage(), 500);
            }
        }
    }

    // Update voice UI elements
    updateVoiceUI(isListening) {
        const voiceInputBtn = document.getElementById('voiceInputBtn');
        const voiceStatus = document.getElementById('voiceStatus');
        
        if (isListening) {
            voiceInputBtn.classList.add('recording');
            voiceStatus.style.display = 'flex';
        } else {
            voiceInputBtn.classList.remove('recording');
            voiceStatus.style.display = 'none';
        }
    }

    // Check if speech recognition is supported
    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Set language for speech recognition
    setLanguage(language) {
        this.currentLanguage = language;
    }
}

// Audio playback functionality
class AudioPlayer {
    constructor() {
        this.audioElement = document.getElementById('audioPlayer');
        this.currentAudioButton = null;
        this.currentAudio = null; // Track current audio element
        this.isCurrentlyPlaying = false;
    }

    // Play audio from URL
    async playAudio(audioUrl, buttonElement = null) {
        try {
            // Stop any currently playing audio first
            this.stop();

            if (buttonElement) {
                this.currentAudioButton = buttonElement;
                this.updateButtonState(buttonElement, 'loading');
            }

            // Handle different audio URL formats
            let fullAudioUrl;
            if (audioUrl.startsWith('http')) {
                fullAudioUrl = audioUrl;
            } else if (audioUrl.startsWith('/audio/')) {
                fullAudioUrl = `${API_BASE_URL}${audioUrl}`;
            } else {
                fullAudioUrl = `${API_BASE_URL}/audio/${audioUrl}`;
            }

            // Check if it's actually an audio file
            if (audioUrl.includes('.txt') || audioUrl.includes('fallback')) {
                showToast('Audio not available - Murf API may be unavailable. Text response provided instead.', 'warning');
                if (buttonElement) this.resetButtonState(buttonElement);
                return;
            }

            // Create a new audio element for each playback to avoid conflicts
            const audio = new Audio();
            this.currentAudio = audio; // Track the current audio element
            this.isCurrentlyPlaying = true;
            
            // Setup event listeners with better error handling
            audio.addEventListener('loadstart', () => {
                console.log('Audio loading started');
                if (buttonElement) this.updateButtonState(buttonElement, 'loading');
            });

            audio.addEventListener('canplay', () => {
                console.log('Audio can start playing');
                if (buttonElement) this.updateButtonState(buttonElement, 'playing');
                this.updateGlobalStopButton(true);
            });

            audio.addEventListener('ended', () => {
                console.log('Audio playback ended');
                this.isCurrentlyPlaying = false;
                if (buttonElement) this.resetButtonState(buttonElement);
                this.currentAudioButton = null;
                this.currentAudio = null;
                this.updateGlobalStopButton(false);
            });

            audio.addEventListener('pause', () => {
                console.log('Audio paused');
                this.isCurrentlyPlaying = false;
                if (buttonElement) this.resetButtonState(buttonElement);
                this.updateGlobalStopButton(false);
            });

            audio.addEventListener('error', (e) => {
                console.error('Audio error event:', e);
                console.error('Audio error details:', {
                    error: audio.error,
                    code: audio.error ? audio.error.code : 'unknown',
                    message: audio.error ? audio.error.message : 'unknown'
                });
                
                let errorMessage = 'Error playing audio';
                if (audio.error) {
                    switch (audio.error.code) {
                        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMessage = 'Audio format not supported by browser';
                            break;
                        case MediaError.MEDIA_ERR_NETWORK:
                            errorMessage = 'Network error loading audio';
                            break;
                        case MediaError.MEDIA_ERR_DECODE:
                            errorMessage = 'Audio decoding error';
                            break;
                        case MediaError.MEDIA_ERR_ABORTED:
                            errorMessage = 'Audio loading aborted';
                            break;
                        default:
                            errorMessage = `Audio error (code: ${audio.error.code})`;
                    }
                }
                
                showToast(errorMessage, 'error');
                this.isCurrentlyPlaying = false;
                if (buttonElement) this.resetButtonState(buttonElement);
                this.currentAudioButton = null;
                this.currentAudio = null;
            });

            // Set source and play
            console.log('Setting audio source:', fullAudioUrl);
            audio.src = fullAudioUrl;
            
            // Try to play
            await audio.play();
            
        } catch (error) {
            console.error('Error playing audio:', error);
            let errorMessage = 'Failed to play audio';
            
            if (error.name === 'NotSupportedError') {
                errorMessage = 'Audio format not supported by your browser';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Audio playback not allowed. Please interact with the page first.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Audio playback was interrupted';
            }
            
            showToast(errorMessage, 'error');
            this.isCurrentlyPlaying = false;
            if (buttonElement) this.resetButtonState(buttonElement);
            this.currentAudioButton = null;
            this.currentAudio = null;
        }
    }

    // Update button state during audio playback
    updateButtonState(button, state) {
        const icon = button.querySelector('i');
        const text = button.querySelector('span');
        
        switch (state) {
            case 'loading':
                if (icon) icon.className = 'fas fa-spinner fa-spin';
                if (text) text.textContent = 'Loading...';
                button.disabled = true;
                break;
            case 'playing':
                if (icon) icon.className = 'fas fa-pause';
                if (text) text.textContent = 'Playing...';
                button.disabled = false;
                break;
        }
    }

    // Reset button to default state
    resetButtonState(button) {
        const icon = button.querySelector('i');
        const text = button.querySelector('span');
        
        if (icon) icon.className = 'fas fa-play';
        if (text) text.textContent = 'Play Audio';
        button.disabled = false;
    }

    // Stop current audio
    stop() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        // Also stop the original audio element if it exists
        if (this.audioElement && !this.audioElement.paused) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        
        this.isCurrentlyPlaying = false;
        
        if (this.currentAudioButton) {
            this.resetButtonState(this.currentAudioButton);
            this.currentAudioButton = null;
        }
        
        this.currentAudio = null;
    }

    // Check if audio is currently playing
    isPlaying() {
        return this.isCurrentlyPlaying && 
               ((this.currentAudio && !this.currentAudio.paused) || 
                (this.audioElement && !this.audioElement.paused));
    }
}
