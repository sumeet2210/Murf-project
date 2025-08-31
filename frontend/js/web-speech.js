// Web Speech API Text-to-Speech service as fallback for Murf API
class WebSpeechService {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.isSupported = 'speechSynthesis' in window;
        
        if (this.isSupported) {
            this.loadVoices();
            
            // Handle voice loading
            this.synthesis.addEventListener('voiceschanged', () => {
                this.loadVoices();
            });
        }
    }
    
    // Check if Web Speech API is supported
    isWebSpeechSupported() {
        return this.isSupported;
    }
    
    // Load available voices
    loadVoices() {
        this.voices = this.synthesis.getVoices();
        console.log('Web Speech voices loaded:', this.voices.length);
    }
    
    // Get best matching voice for language and gender
    getBestVoice(language = 'en-US', voiceId = null) {
        if (this.voices.length === 0) {
            this.loadVoices();
        }
        
        // If specific voice ID requested, try to match it
        if (voiceId) {
            // Try to find by voice ID patterns
            const voiceMapping = {
                'en-US-sarah': { lang: 'en-US', female: true },
                'en-US-john': { lang: 'en-US', female: false },
                'en-GB-emily': { lang: 'en-GB', female: true },
                'es-ES-maria': { lang: 'es-ES', female: true }
            };
            
            const mapping = voiceMapping[voiceId];
            if (mapping) {
                language = mapping.lang;
                const gender = mapping.female ? 'female' : 'male';
                
                // Try to find voice by gender preference
                let voice = this.voices.find(v => 
                    v.lang.startsWith(language) && 
                    v.name.toLowerCase().includes(gender)
                );
                
                if (voice) return voice;
            }
        }
        
        // Find voice by language
        let voice = this.voices.find(v => v.lang === language);
        if (voice) return voice;
        
        // Find voice by language prefix (e.g., 'en' for 'en-US')
        const langPrefix = language.split('-')[0];
        voice = this.voices.find(v => v.lang.startsWith(langPrefix));
        if (voice) return voice;
        
        // Return default voice
        return this.voices.find(v => v.default) || this.voices[0] || null;
    }
    
    // Speak text using Web Speech API
    async speakText(text, language = 'en-US', voiceId = null, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isSupported) {
                reject(new Error('Web Speech API not supported'));
                return;
            }
            
            // Stop any ongoing speech
            this.synthesis.cancel();
            
            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set voice
            const voice = this.getBestVoice(language, voiceId);
            if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
            } else {
                utterance.lang = language;
            }
            
            // Set speech parameters
            utterance.rate = options.rate || 1.0;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 1.0;
            
            // Set event handlers
            utterance.onend = () => {
                console.log('Web Speech synthesis completed');
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('Web Speech synthesis error:', event.error);
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };
            
            utterance.onstart = () => {
                console.log('Web Speech synthesis started');
            };
            
            // Start speaking
            this.synthesis.speak(utterance);
        });
    }
    
    // Stop current speech
    stopSpeech() {
        if (this.isSupported) {
            this.synthesis.cancel();
        }
    }
    
    // Get available voices info
    getAvailableVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            gender: this.getVoiceGender(voice.name),
            default: voice.default
        }));
    }
    
    // Try to determine voice gender from name
    getVoiceGender(voiceName) {
        const name = voiceName.toLowerCase();
        
        // Common female indicators
        if (name.includes('female') || name.includes('woman') || 
            name.includes('sarah') || name.includes('emily') || name.includes('maria') ||
            name.includes('alice') || name.includes('anna') || name.includes('susan')) {
            return 'female';
        }
        
        // Common male indicators
        if (name.includes('male') || name.includes('man') || 
            name.includes('john') || name.includes('david') || name.includes('michael') ||
            name.includes('alex') || name.includes('robert') || name.includes('thomas')) {
            return 'male';
        }
        
        return 'unknown';
    }
    
    // Test Web Speech functionality
    async testWebSpeech() {
        try {
            if (!this.isSupported) {
                return { supported: false, error: 'Web Speech API not supported' };
            }
            
            await this.speakText('Hello, this is a test of the Web Speech API.', 'en-US');
            
            return { 
                supported: true, 
                voiceCount: this.voices.length,
                message: 'Web Speech API is working'
            };
        } catch (error) {
            return { 
                supported: false, 
                error: error.message 
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSpeechService;
}
