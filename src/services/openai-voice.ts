import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: false // This should be false for server-side usage
});

export class OpenAIVoiceService {
  private static instance: OpenAIVoiceService;
  private isProcessing = false;
  
  static getInstance(): OpenAIVoiceService {
    if (!OpenAIVoiceService.instance) {
      OpenAIVoiceService.instance = new OpenAIVoiceService();
    }
    return OpenAIVoiceService.instance;
  }

  // Convert speech to text using OpenAI Whisper
  async speechToText(audioBlob: Blob): Promise<string> {
    if (this.isProcessing) {
      throw new Error('Another speech-to-text operation is in progress');
    }

    try {
      this.isProcessing = true;
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Optional: specify language

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.text || '';
    } catch (error) {
      console.error('Speech-to-text error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Speech-to-text request timed out');
      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Process text with GPT to determine if it's a UI command or chat message
  async processVoiceCommand(text: string, context: any = {}): Promise<{
    type: 'ui_command' | 'chat_message';
    action?: string;
    target?: string;
    response?: string;
    confidence: number;
  }> {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const systemPrompt = `You are a voice UI assistant. Analyze the user's spoken text and determine if it's:
1. A UI command (navigation, clicking, scrolling, etc.)
2. A regular chat message

For UI commands, identify the action and target. For chat messages, generate a helpful response.

Context: ${JSON.stringify(context)}

UI Commands examples:
- "go to dashboard" → {"type": "ui_command", "action": "navigate", "target": "/dashboard"}
- "click send button" → {"type": "ui_command", "action": "click", "target": "button[contains(text(), 'send')]"}
- "scroll down" → {"type": "ui_command", "action": "scroll", "target": "down"}

Chat Messages examples:
- "hello" → {"type": "chat_message", "response": "Hello! How can I help you today?"}
- "what is the weather" → {"type": "chat_message", "response": "I'd be happy to help with weather information, but I don't have access to current weather data."}

Respond ONLY with valid JSON matching the format above. Include a confidence score (0-1).`;

      const response = await fetch('/api/process-voice-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          context,
          systemPrompt
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice command processing error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Voice command processing timed out');
      }
      
      // Fallback - treat as chat message
      return {
        type: 'chat_message',
        response: 'I\'m sorry, I couldn\'t process that command. Could you try again?',
        confidence: 0.1
      };
    }
  }

  // Text to speech using OpenAI TTS
  async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'): Promise<ArrayBuffer> {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          model: 'tts-1', // or 'tts-1-hd' for higher quality
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Text-to-speech request timed out');
      }
      throw error;
    }
  }

  // Play audio buffer
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBufferSource = audioContext.createBufferSource();
      const decodedAudioData = await audioContext.decodeAudioData(audioBuffer.slice(0));
      
      audioBufferSource.buffer = decodedAudioData;
      audioBufferSource.connect(audioContext.destination);
      
      return new Promise((resolve, reject) => {
        let hasResolved = false;
        
        audioBufferSource.onended = () => {
          if (!hasResolved) {
            hasResolved = true;
            resolve();
          }
        };
        
        // Add timeout for audio playback
        const timeoutId = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            try {
              audioBufferSource.stop();
            } catch (e) {
              // Ignore errors when stopping
            }
            reject(new Error('Audio playback timed out'));
          }
        }, 30000);
        
        try {
          audioBufferSource.start(0);
        } catch (error) {
          clearTimeout(timeoutId);
          if (!hasResolved) {
            hasResolved = true;
            reject(error);
          }
        }
      });
    } catch (error) {
      console.error('Audio playback error:', error);
      throw error;
    }
  }
}

export const openaiVoiceService = OpenAIVoiceService.getInstance(); 