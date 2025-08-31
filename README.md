# Talk to PDF - Voice-Enabled AI Chat Application

A comprehensive PDF analysis and voice chat application that integrates with Murf API for multilingual voice synthesis. Upload PDFs, chat with AI about their content, and get voice responses in multiple languages.

## 🚀 Features

- **PDF Upload & Analysis**: Upload PDFs and get AI-powered summaries
- **Multi-language Chat**: Ask questions in various languages
- **Voice Integration**: 
  - Speech-to-text input for hands-free interaction
  - Text-to-speech responses using Murf API
  - Voice mode for complete audio conversations
- **🔥 Call with PDF**: Revolutionary phone call-like interface where you can have natural voice conversations with your PDF documents
- **Real-time Chat**: Interactive chat interface with conversation history
- **Multi-language Support**: Support for 13+ languages including English, Spanish, French, German, Japanese, Hindi, and more
- **Enhanced Text Formatting**: Professional message formatting with highlights and markdown support
- **Audio Controls**: Play, pause, and stop controls for all voice responses

## 🛠 Tech Stack

### Backend
- **Python 3.8+** with FastAPI
- **OpenAI GPT** for document analysis and chat
- **Murf API** for high-quality voice synthesis
- **PyPDF2/pdfplumber** for PDF text extraction
- **SpeechRecognition** for voice input processing

### Frontend
- **HTML5/CSS3/JavaScript** (Vanilla JS - no frameworks)
- **Web Speech API** for browser-based voice recognition
- **Responsive Design** with modern UI/UX
- **Font Awesome** for icons

## 📋 Prerequisites

- Python 3.8 or higher
- OpenAI API key
- Murf API key (optional - fallback available)
- Modern web browser with microphone access

## � Project Structure

```
Murf-project/
├── backend/
│   ├── app/
│   │   ├── models/          # Pydantic data models
│   │   ├── services/        # Business logic services
│   │   │   ├── pdf_service.py      # PDF processing
│   │   │   ├── openai_service.py   # OpenAI GPT integration
│   │   │   ├── murf_service.py     # Murf API voice synthesis
│   │   │   └── voice_service.py    # Speech recognition
│   │   └── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variables template
├── frontend/
│   ├── css/
│   │   └── style.css        # Application styles
│   ├── js/
│   │   ├── api.js           # API service layer
│   │   ├── voice.js         # Voice functionality
│   │   └── app.js           # Main application logic
│   ├── index.html           # Main HTML file
│   ├── package.json         # Project metadata
│   └── requirements.txt     # Frontend info (no deps needed)
├── uploads/                 # PDF upload directory
├── audio_files/             # Generated audio files directory
├── start-app.bat           # Quick start batch file (Windows)
└── README.md               # This file
```

## 🚀 Quick Start

### Option 1: Using the Batch File (Windows)
```bash
# Double-click or run:
start-app.bat
```

### Option 2: Manual Setup
```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env
# Edit .env file with your API keys:
# OPENAI_API_KEY=your_openai_api_key_here
# MURF_API_KEY=your_murf_api_key_here
```

### 2. Frontend Setup
```bash
cd frontend

# Serve using Python HTTP server
python -m http.server 3000
```

### 3. Start the Application

1. **Start the backend server:**
   ```bash
   cd backend
   python main.py
   ```
   Backend will run on `http://localhost:8000`

2. **Start the frontend server:**
   ```bash
   cd frontend
   python -m http.server 3000
   ```
   Frontend will run on `http://localhost:3000`

## 🎯 Usage

1. **Upload PDF**: Drag and drop or select a PDF file
2. **Wait for Processing**: The AI will analyze and summarize your document
3. **Start Chatting**: Ask questions about your PDF in the chat interface
4. **Language Selection**: Choose your preferred language for responses
5. **Voice Features**:
   - Click the microphone button to use voice input
   - Enable "Voice Mode" for audio responses
   - Use the call-like feature for hands-free interaction
├── uploads/                # PDF file storage
├── audio_files/           # Generated audio files
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn
- OpenAI API key
- Murf API key (for voice synthesis)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables:**
   Create a `.env` file in the backend directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   MURF_API_KEY=your_murf_api_key_here
   MURF_API_URL=https://api.murf.ai/v1
   SECRET_KEY=your_secret_key_here
   ```

5. **Run the backend server:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
- `OPENAI_API_KEY`: Your OpenAI API key for GPT integration
- `MURF_API_KEY`: Your Murf API key for voice synthesis
- `MURF_API_URL`: Murf API base URL (default: https://api.murf.ai/v1)
- `MAX_FILE_SIZE`: Maximum PDF file size in bytes (default: 10MB)
- `DEFAULT_VOICE_ID`: Default voice for speech synthesis
- `DEFAULT_LANGUAGE`: Default language code
- `GPT_MODEL`: OpenAI model to use (default: gpt-3.5-turbo)

#### Frontend
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:8000)

### Murf API Integration

This application uses Murf's advanced text-to-speech API for high-quality voice synthesis. Features include:

- **Natural Voices**: Access to 120+ AI voices across 20+ languages
- **Voice Customization**: Adjust speed, pitch, emphasis, and pause
- **Multiple Formats**: Support for various audio formats (MP3, WAV)
- **Enterprise Quality**: Studio-quality voice synthesis

To get started with Murf:
1. Sign up at [Murf.ai](https://murf.ai/)
2. Get your API key from the dashboard
3. Add it to your `.env` file

## 📝 API Endpoints

### PDF Operations
- `POST /upload-pdf` - Upload and process PDF
- `GET /pdf/{file_id}` - Get PDF information

### Chat Operations
- `POST /chat` - Send chat message
- `POST /voice-chat` - Complete voice chat pipeline

### Voice Operations
- `POST /synthesize-voice` - Convert text to speech
- `POST /transcribe-audio` - Convert speech to text
- `POST /call-with-pdf` - 🔥 Complete call pipeline (audio input → transcribe → AI response → voice output)
- `GET /voices` - Get available voices
- `GET /languages` - Get supported languages

### Health Check
- `GET /` - API status
- `GET /health` - Health check

## 🎯 Usage Examples

### Basic Chat
1. Upload a PDF document
2. Wait for processing and analysis
3. Start asking questions about the content
4. Receive text responses with optional voice synthesis

### Voice Interaction
1. Upload your PDF
2. Click the microphone button
3. Speak your question clearly
4. Get AI response in both text and voice
5. Continue the conversation naturally

### 🔥 Call with PDF (NEW!)
1. Upload your PDF document
2. Click the red "Call PDF" button in the header
3. A call interface opens like a phone call
4. Hold the green microphone button and speak your question
5. Release to send - the AI will respond with voice automatically
6. Continue the conversation hands-free like a real phone call
7. Use the mute button to disable audio responses
8. Click the red phone button to end the call

**Call Features:**
- **Push-to-talk**: Hold the mic button to record, release to send
- **Real-time conversation**: Automatic transcription and voice responses
- **Call timer**: See how long you've been talking with your PDF
- **Mute control**: Toggle audio responses on/off
- **Multi-language support**: Speak in any supported language
- **Call history**: See your conversation transcript in real-time

### Multi-Language Usage
1. Select your preferred language from the dropdown
2. Choose a compatible voice for that language
3. Chat normally - responses will be in your selected language
4. Voice synthesis will use native accents and pronunciation

## 🔊 Supported Languages & Voices

### Languages
- English (US, UK)
- Spanish (Spain, Mexico)
- French
- German
- Italian
- Portuguese (Brazil)
- Japanese
- Korean
- Chinese (Simplified)
- Hindi
- Arabic
- And more...

### Voice Types
- Professional business voices
- Conversational casual voices
- Multiple genders and ages
- Regional accents and variations
- Emotional tone options

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

#### Backend
```bash
# Install production dependencies
pip install -r requirements.txt

# Run with production server
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
# Build optimized bundle
npm run build

# Serve static files
npx serve -s build -l 3000
```

## 📦 Docker Deployment (Optional)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MURF_API_KEY=${MURF_API_KEY}
    volumes:
      - ./uploads:/app/uploads
      - ./audio_files:/app/audio_files
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

## 🔒 Security Considerations

- API keys are stored in environment variables
- File uploads are validated and size-limited
- CORS is configured for security
- Audio files are automatically cleaned up
- Input sanitization for chat messages

## 🚨 Troubleshooting

### Common Issues

1. **Microphone not working**
   - Check browser permissions for microphone access
   - Ensure HTTPS is used in production
   - Verify device microphone is working

2. **Voice synthesis not working**
   - Verify Murf API key is valid and has credits
   - Check network connectivity
   - Fallback text files are created when API is unavailable

3. **PDF upload fails**
   - Check file size (max 10MB)
   - Ensure file is a valid PDF
   - Verify backend server is running

4. **Poor voice recognition**
   - Speak clearly and reduce background noise
   - Check microphone quality
   - Ensure selected language matches spoken language

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎉 Acknowledgments

- **OpenAI** for GPT integration
- **Murf.ai** for high-quality voice synthesis
- **React** and **FastAPI** communities
- **PDF processing libraries** (PyPDF2, pdfplumber)

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Note**: This application requires valid API keys for OpenAI and Murf to function fully. Demo credentials are not included for security reasons.
