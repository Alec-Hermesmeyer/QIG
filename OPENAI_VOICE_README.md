# OpenAI Voice Interface

A complete voice-controlled UI system built with OpenAI Whisper (Speech-to-Text), GPT (Command Processing), and OpenAI TTS (Text-to-Speech).

## 🚀 Features

- **Speech-to-Text**: Real-time voice recognition using OpenAI Whisper
- **Intelligent Command Processing**: GPT-powered classification of voice input (UI commands vs chat messages)
- **Text-to-Speech**: Natural voice responses using OpenAI TTS with multiple voice options
- **UI Control**: Voice commands for navigation, clicking, scrolling, and form interaction
- **Chat Integration**: Natural conversations with voice responses
- **Visual Feedback**: Real-time status indicators and transcription display

## 📋 Prerequisites

- OpenAI API key with access to:
  - Whisper API (Speech-to-Text)
  - GPT-4 or GPT-3.5 (Command Processing)
  - TTS API (Text-to-Speech)
- Modern browser with microphone support
- HTTPS connection (required for microphone access)

## 🛠️ Setup

### 1. Environment Variables

Add your OpenAI API key to your `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Install Dependencies

The system uses the existing OpenAI package:

```bash
npm install openai
```

### 3. Import and Use

```tsx
import { OpenAIVoiceUI } from '@/components/OpenAIVoiceUI';

function MyApp() {
  const handleChatMessage = (message: string) => {
    console.log('Assistant says:', message);
  };

  const handleUICommand = (command: VoiceCommand) => {
    console.log('Voice command:', command);
  };

  return (
    <OpenAIVoiceUI
      onChatMessage={handleChatMessage}
      onUICommand={handleUICommand}
      showTranscription={true}
      showDebugInfo={true}
    />
  );
}
```

## 🎤 Voice Commands

### Navigation Commands
- "Go to dashboard" → Navigate to /dashboard
- "Navigate to settings" → Navigate to /settings  
- "Go back" → Browser back button
- "Refresh page" → Reload current page

### Interaction Commands
- "Click send button" → Find and click send button
- "Click on login" → Find and click login element
- "Press submit" → Find and click submit button

### Scroll Commands
- "Scroll down" → Scroll down 300px
- "Scroll up" → Scroll up 300px
- "Scroll to top" → Scroll to top of page
- "Scroll to bottom" → Scroll to bottom of page

### Chat Commands
- "Hello" → Natural conversation
- "What's the weather?" → Chat response
- "Tell me a joke" → Assistant will respond and speak

## 🔧 API Endpoints

The system creates three API endpoints:

### `/api/speech-to-text`
- **Method**: POST
- **Input**: FormData with audio file
- **Output**: Transcribed text from Whisper

### `/api/process-voice-command` 
- **Method**: POST
- **Input**: JSON with text and context
- **Output**: Command classification and response from GPT

### `/api/text-to-speech`
- **Method**: POST  
- **Input**: JSON with text and voice options
- **Output**: Audio buffer from OpenAI TTS

## 🎛️ Configuration Options

```tsx
<OpenAIVoiceUI
  // Callbacks
  onChatMessage={(message) => console.log(message)}
  onUICommand={(command) => console.log(command)}
  
  // Behavior
  autoExecuteCommands={true}  // Auto-execute UI commands
  
  // Voice Options
  voice="alloy"  // alloy, echo, fable, onyx, nova, shimmer
  
  // UI Options
  showTranscription={true}    // Show what was heard
  showDebugInfo={false}      // Show command analysis
  className="custom-styles"  // Custom styling
/>
```

## 🔄 How It Works

1. **Voice Input**: User speaks into microphone
2. **Audio Processing**: Audio sent to OpenAI Whisper API
3. **Text Transcription**: Whisper returns text transcription
4. **Command Analysis**: GPT analyzes if it's a UI command or chat message
5. **Execution**: 
   - UI commands → Execute DOM actions
   - Chat messages → Generate response and speak it
6. **Voice Output**: Text-to-speech for responses

## 🧪 Testing

Visit `/voice-test` to test the voice interface with:

- Navigation buttons
- Form interactions  
- Scroll controls
- Real-time activity log
- Debug information

## 🎯 Architecture

### Core Components

- **`OpenAIVoiceService`**: Core service handling OpenAI API calls
- **`useOpenAIVoice`**: React hook managing voice state and interactions
- **`OpenAIVoiceUI`**: Complete UI component with visual feedback
- **API Routes**: Server-side OpenAI API integration

### File Structure

```
src/
├── services/
│   └── openai-voice.ts          # Core OpenAI integration
├── hooks/
│   └── useOpenAIVoice.ts        # Voice interaction hook
├── components/
│   └── OpenAIVoiceUI.tsx        # Main UI component
├── app/
│   ├── api/
│   │   ├── speech-to-text/      # Whisper API endpoint
│   │   ├── process-voice-command/ # GPT processing endpoint
│   │   └── text-to-speech/      # TTS API endpoint
│   └── voice-test/              # Test page
└── lib/
    └── utils.ts                 # Utility functions
```

## 🚨 Error Handling

The system includes comprehensive error handling for:

- Microphone permission denied
- Network connectivity issues
- OpenAI API errors
- Audio processing failures
- Command execution errors

## 🔒 Security Considerations

- API key is server-side only (never exposed to browser)
- Audio data is processed securely through OpenAI
- No audio data is stored locally
- Commands are validated before execution

## 📊 Cost Considerations

OpenAI API usage costs:
- **Whisper**: $0.006 per minute of audio
- **GPT-4**: ~$0.03 per 1K tokens for command processing
- **TTS**: $0.015 per 1K characters for voice responses

## 🔧 Troubleshooting

### Microphone Not Working
- Ensure HTTPS connection
- Check browser permissions
- Verify microphone hardware

### API Errors
- Verify OpenAI API key is correct
- Check API quotas and billing
- Ensure proper environment variables

### Commands Not Recognized
- Speak clearly and at normal pace
- Use supported command patterns
- Check debug mode for GPT analysis

### No Voice Output
- Check browser audio permissions
- Verify speakers/headphones
- Test with the voice test button

## 🚀 Deployment

For production deployment:

1. Set `OPENAI_API_KEY` in your hosting environment
2. Ensure HTTPS is enabled
3. Configure proper CORS headers if needed
4. Monitor API usage and costs
5. Implement rate limiting if necessary

## 📈 Future Enhancements

Possible improvements:
- Wake word detection ("Hey Assistant")
- Continuous listening mode
- Custom voice training
- Multi-language support
- Voice command customization
- Integration with other AI services 