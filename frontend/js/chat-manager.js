// Chat Manager - Handles multiple chat sessions
class ChatManager {
    constructor() {
        this.chats = new Map();
        this.currentChatId = null;
        this.chatCounter = 0;
        
        // Load saved chats from localStorage
        this.loadChatsFromStorage();
        
        // Initialize UI
        this.updateChatList();
    }

    // Create a new chat session
    createNewChat() {
        const chatId = `chat_${++this.chatCounter}_${Date.now()}`;
        const chat = {
            id: chatId,
            title: 'New Chat',
            subtitle: 'Upload a PDF to begin',
            messages: [],
            pdfInfo: null,
            fileId: null,
            createdAt: new Date(),
            lastActivity: new Date()
        };

        this.chats.set(chatId, chat);
        this.setActiveChat(chatId);
        this.updateChatList();
        this.saveChatsToStorage();
        
        showToast('New chat created', 'success');
        return chatId;
    }

    // Set active chat
    setActiveChat(chatId) {
        if (!this.chats.has(chatId)) {
            console.error(`Chat ${chatId} not found`);
            return;
        }

        this.currentChatId = chatId;
        const chat = this.chats.get(chatId);
        
        // Update API service with current file ID
        if (chat.fileId) {
            apiService.currentFileId = chat.fileId;
        } else {
            apiService.clearCurrentFile();
        }

        // Update UI
        this.updateChatDisplay(chat);
        this.updateChatList();
        
        // Update chat title in header
        document.getElementById('currentChatTitle').textContent = chat.title;
        document.getElementById('currentChatSubtitle').textContent = chat.subtitle;
    }

    // Delete a chat
    deleteChat(chatId) {
        console.log('deleteChat called with ID:', chatId);
        if (!this.chats.has(chatId)) {
            console.log('Chat not found in map:', chatId);
            return;
        }

        const chat = this.chats.get(chatId);
        console.log('Deleting chat:', chat.title);
        
        this.chats.delete(chatId);
        
        // If this was the active chat, show welcome screen or switch to another chat
        if (this.currentChatId === chatId) {
            if (this.chats.size > 0) {
                // Switch to the most recent chat
                const mostRecent = Array.from(this.chats.values())
                    .sort((a, b) => b.lastActivity - a.lastActivity)[0];
                this.setActiveChat(mostRecent.id);
            } else {
                // Show welcome screen
                this.currentChatId = null;
                this.showWelcomeScreen();
            }
        }

        this.updateChatList();
        this.saveChatsToStorage();
        showToast(`Chat "${chat.title}" deleted`, 'success');
    }

    // Update chat display
    updateChatDisplay(chat) {
        // Hide welcome screen
        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('uploadScreen').classList.add('hidden');
        
        if (chat.pdfInfo) {
            // Show chat interface with messages
            document.getElementById('chatMessagesContainer').classList.remove('hidden');
            this.displayPDFInfo(chat.pdfInfo);
            this.displayMessages(chat.messages);
            
            // Update input placeholder
            document.getElementById('messageInput').placeholder = 'Ask a question about your PDF...';
        } else {
            // Show upload screen
            document.getElementById('chatMessagesContainer').classList.add('hidden');
            document.getElementById('uploadScreen').classList.remove('hidden');
            
            // Update input placeholder
            document.getElementById('messageInput').placeholder = 'Upload a PDF to start chatting...';
        }
    }

    // Display PDF information
    displayPDFInfo(pdfInfo) {
        document.getElementById('docFilename').textContent = pdfInfo.filename;
        document.getElementById('docStats').textContent = `${pdfInfo.text_length.toLocaleString()} characters`;
        document.getElementById('docSummary').textContent = pdfInfo.summary;
        
        // Show document info section
        document.getElementById('documentInfo').style.display = 'block';
    }

    // Display chat messages
    displayMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        // Add welcome message if no messages
        if (messages.length === 0) {
            this.addWelcomeMessage();
        }

        // Add all messages
        messages.forEach(message => {
            this.addMessageToUI(message.role, message.content, message.audioUrl);
        });
    }

    // Add welcome message
    addWelcomeMessage() {
        const welcomeMessage = {
            role: 'assistant',
            content: "Hello! I've analyzed your PDF. Feel free to ask me any questions about it. You can type your questions or use voice input.",
            timestamp: new Date()
        };
        
        this.addMessageToUI(welcomeMessage.role, welcomeMessage.content);
    }

    // Add message to current chat
    addMessage(role, content, audioUrl = null) {
        if (!this.currentChatId) return;

        const chat = this.chats.get(this.currentChatId);
        const message = {
            role,
            content,
            audioUrl,
            timestamp: new Date()
        };

        chat.messages.push(message);
        chat.lastActivity = new Date();

        // Update chat title based on first user message
        if (role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1) {
            chat.title = content.length > 30 ? content.substring(0, 30) + '...' : content;
            chat.subtitle = chat.pdfInfo ? chat.pdfInfo.filename : 'PDF Chat';
        }

        // Add to UI
        this.addMessageToUI(role, content, audioUrl);
        
        // Update chat list to reflect new activity
        this.updateChatList();
        this.saveChatsToStorage();
    }

    // Add message to UI
    addMessageToUI(role, content, audioUrl = null) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Enhanced text formatting
        const formattedContent = this.formatMessageContent(content);
        
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.innerHTML = formattedContent;
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        contentDiv.appendChild(contentWrapper);
        contentDiv.appendChild(timestamp);

        // Add voice button for assistant messages to trigger Murf TTS
        if (role === 'assistant') {
            const audioControls = document.createElement('div');
            audioControls.className = 'audio-controls';
            
            // Add Murf TTS button
            const voiceButton = document.createElement('button');
            voiceButton.className = 'murf-voice-btn';
            voiceButton.innerHTML = '🔊 <span>Generate Voice</span>';
            
            // Add stop button
            const stopButton = document.createElement('button');
            stopButton.className = 'stop-voice-btn';
            stopButton.innerHTML = '⏹️ <span>Stop</span>';
            stopButton.style.display = 'none'; // Initially hidden
            
            voiceButton.onclick = async () => {
                try {
                    voiceButton.disabled = true;
                    voiceButton.innerHTML = '⏳ <span>Generating...</span>';
                    stopButton.style.display = 'inline-flex'; // Show stop button
                    
                    // Get currently selected language from dropdown
                    const selectedLanguage = document.getElementById('languageSelect').value;
                    
                    // Get appropriate voice for the selected language
                    let voiceId = 'en-US-julia'; // Default fallback
                    if (window.app && window.app.getVoiceForLanguage) {
                        const voiceInfo = window.app.getVoiceForLanguage(selectedLanguage);
                        voiceId = voiceInfo.voice_id;
                    }
                    
                    console.log(`Using voice: ${voiceId} for language: ${selectedLanguage}`);
                    
                    // Call Murf API to generate speech
                    const response = await window.apiService.synthesizeVoice(
                        content, 
                        voiceId, 
                        selectedLanguage, 
                        1.0
                    );
                    
                    if (response.audio_url) {
                        voiceButton.innerHTML = '🎵 <span>Playing...</span>';
                        // Play the generated audio
                        await window.audioPlayer.playAudio(response.audio_url, voiceButton);
                    } else {
                        throw new Error('No audio URL in response');
                    }
                    
                    voiceButton.innerHTML = '🔊 <span>Generate Voice</span>';
                    voiceButton.disabled = false;
                    stopButton.style.display = 'none'; // Hide stop button when done
                } catch (error) {
                    console.error('Murf TTS error:', error);
                    voiceButton.innerHTML = '❌ <span>Voice Error</span>';
                    voiceButton.disabled = false;
                    stopButton.style.display = 'none'; // Hide stop button on error
                    showToast(`Voice generation failed: ${error.message}`, 'error');
                    
                    // Reset button after 3 seconds
                    setTimeout(() => {
                        voiceButton.innerHTML = '🔊 <span>Generate Voice</span>';
                        voiceButton.disabled = false;
                    }, 3000);
                }
            };
            
            stopButton.onclick = () => {
                // Stop the audio playback
                window.audioPlayer.stop();
                voiceButton.innerHTML = '🔊 <span>Generate Voice</span>';
                voiceButton.disabled = false;
                stopButton.style.display = 'none';
                showToast('Voice playback stopped', 'info');
            };
            
            audioControls.appendChild(voiceButton);
            audioControls.appendChild(stopButton);
            contentDiv.appendChild(audioControls);
        }

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Animate message appearance
        messageDiv.classList.add('bounce');
    }

    // Set PDF info for current chat
    setPDFInfo(pdfInfo) {
        if (!this.currentChatId) return;

        const chat = this.chats.get(this.currentChatId);
        chat.pdfInfo = pdfInfo;
        chat.fileId = pdfInfo.file_id;
        chat.title = pdfInfo.filename;
        chat.subtitle = `${pdfInfo.text_length.toLocaleString()} characters`;
        chat.lastActivity = new Date();

        // Update API service
        apiService.currentFileId = pdfInfo.file_id;

        // Update display
        this.updateChatDisplay(chat);
        this.updateChatList();
        this.saveChatsToStorage();
    }

    // Update chat list UI
    updateChatList() {
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = '';

        if (this.chats.size === 0) {
            // Show welcome item
            const welcomeItem = document.createElement('div');
            welcomeItem.className = 'chat-item welcome-item';
            welcomeItem.innerHTML = `
                <div class="chat-preview">
                    <h4>Welcome!</h4>
                    <p>Create a new chat to get started</p>
                </div>
            `;
            chatList.appendChild(welcomeItem);
            return;
        }

        // Sort chats by last activity
        const sortedChats = Array.from(this.chats.values())
            .sort((a, b) => b.lastActivity - a.lastActivity);

        sortedChats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            
            const timeAgo = this.getTimeAgo(chat.lastActivity);
            
            chatItem.innerHTML = `
                <div class="chat-preview">
                    <h4>${this.escapeHtml(chat.title)}</h4>
                    <p>${this.escapeHtml(chat.subtitle)} • ${timeAgo}</p>
                </div>
                <div class="chat-actions">
                    <button class="delete-chat-btn" onclick="event.stopPropagation(); chatManager.confirmDeleteChat('${chat.id}')" title="Delete chat">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            chatItem.onclick = () => this.setActiveChat(chat.id);
            chatList.appendChild(chatItem);
        });
    }

    // Confirm delete chat
    confirmDeleteChat(chatId) {
        console.log('confirmDeleteChat called with ID:', chatId);
        const chat = this.chats.get(chatId);
        if (!chat) {
            console.log('Chat not found for ID:', chatId);
            return;
        }

        console.log('Showing delete confirmation for chat:', chat.title);
        showModal(
            'Delete Chat',
            `Are you sure you want to delete "${chat.title}"? This action cannot be undone.`,
            'Delete',
            'Cancel',
            () => {
                console.log('Delete confirmed for chat:', chatId);
                this.deleteChat(chatId);
            }
        );
    }

    // Show welcome screen
    showWelcomeScreen() {
        document.getElementById('welcomeScreen').classList.remove('hidden');
        document.getElementById('uploadScreen').classList.add('hidden');
        document.getElementById('chatMessagesContainer').classList.add('hidden');
        
        document.getElementById('currentChatTitle').textContent = 'Welcome to Talk to PDF';
        document.getElementById('currentChatSubtitle').textContent = 'Create a new chat and upload a PDF to begin';
        document.getElementById('messageInput').placeholder = 'Create a new chat to get started...';
        
        // Clear API service
        apiService.clearCurrentFile();
    }

    // Get current chat
    getCurrentChat() {
        return this.currentChatId ? this.chats.get(this.currentChatId) : null;
    }

    // Utility functions
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Storage functions
    saveChatsToStorage() {
        try {
            const chatsData = {
                chats: Array.from(this.chats.entries()),
                currentChatId: this.currentChatId,
                chatCounter: this.chatCounter
            };
            localStorage.setItem('talkToPdfChats', JSON.stringify(chatsData));
        } catch (error) {
            console.error('Error saving chats to storage:', error);
        }
    }

    loadChatsFromStorage() {
        try {
            const stored = localStorage.getItem('talkToPdfChats');
            if (stored) {
                const chatsData = JSON.parse(stored);
                
                // Restore chats
                this.chats = new Map(chatsData.chats.map(([id, chat]) => {
                    // Convert date strings back to Date objects
                    chat.createdAt = new Date(chat.createdAt);
                    chat.lastActivity = new Date(chat.lastActivity);
                    chat.messages = chat.messages.map(msg => ({
                        ...msg,
                        timestamp: new Date(msg.timestamp)
                    }));
                    return [id, chat];
                }));
                
                this.currentChatId = chatsData.currentChatId;
                this.chatCounter = chatsData.chatCounter || 0;
                
                // Set active chat if available
                if (this.currentChatId && this.chats.has(this.currentChatId)) {
                    this.setActiveChat(this.currentChatId);
                } else if (this.chats.size > 0) {
                    // Set most recent chat as active
                    const mostRecent = Array.from(this.chats.values())
                        .sort((a, b) => b.lastActivity - a.lastActivity)[0];
                    this.setActiveChat(mostRecent.id);
                } else {
                    this.showWelcomeScreen();
                }
            } else {
                this.showWelcomeScreen();
            }
        } catch (error) {
            console.error('Error loading chats from storage:', error);
            this.showWelcomeScreen();
        }
    }

    // Clear all chats (for testing)
    clearAllChats() {
        this.chats.clear();
        this.currentChatId = null;
        this.chatCounter = 0;
        this.showWelcomeScreen();
        this.updateChatList();
        this.saveChatsToStorage();
    }

    // Format message content for better presentation
    formatMessageContent(content) {
        if (!content) return '';

        // Clean up the content first
        let formatted = content.trim();

        // Convert markdown-style formatting
        formatted = formatted
            // Bold text: **text** or __text__
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            
            // Italic text: *text* or _text_
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            
            // Code blocks: `code`
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            
            // Line breaks: Handle both \n and double spaces
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            
            // Lists: Handle basic bullet points
            .replace(/^[\-\*\+]\s+(.+)$/gm, '<li>$1</li>')
            
            // Numbers: Highlight numbers in context
            .replace(/\b(\d+(?:\.\d+)?%?)\b/g, '<span class="highlight-number">$1</span>')
            
            // Keywords: Highlight important terms
            .replace(/\b(important|note|warning|error|success|key point|summary|conclusion)\b/gi, '<span class="highlight-keyword">$1</span>');

        // Wrap lists in ul tags
        if (formatted.includes('<li>')) {
            formatted = formatted.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
        }

        // Wrap in paragraph tags if not already structured
        if (!formatted.includes('<p>') && !formatted.includes('<ul>') && !formatted.includes('<ol>')) {
            formatted = `<p>${formatted}</p>`;
        } else if (!formatted.startsWith('<')) {
            formatted = `<p>${formatted}`;
        }
        
        // Ensure proper closing
        if (!formatted.endsWith('</p>') && !formatted.endsWith('</ul>') && !formatted.endsWith('</ol>')) {
            formatted += '</p>';
        }

        return formatted;
    }
}
