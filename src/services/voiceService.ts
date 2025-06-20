'use client';

// Voice Service Client for integrating with localhost:3001
const VOICE_SERVICE_URL = process.env.NEXT_PUBLIC_VOICE_SERVICE_URL || 'http://localhost:3001';

export interface VoiceProcessRequest {
  audio?: Blob | ArrayBuffer;
  text?: string;
  options?: {
    returnAudio?: boolean;
    responseType?: 'text' | 'audio' | 'both';
    targetService?: 'main' | 'agents' | 'voice';
  };
}

export interface VoiceProcessResponse {
  success: boolean;
  transcript?: string;
  response?: string;
  audioUrl?: string;
  command?: {
    type: string;
    action: string;
    parameters: Record<string, any>;
  };
  error?: string;
}

export interface TranscribeRequest {
  audio: Blob | ArrayBuffer;
  options?: {
    language?: string;
    model?: string;
  };
}

export interface TranscribeResponse {
  success: boolean;
  transcript: string;
  confidence?: number;
  error?: string;
}

export interface SynthesizeRequest {
  text: string;
  options?: {
    voice?: string;
    speed?: number;
    pitch?: number;
  };
}

export interface SynthesizeResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    stt: boolean;
    tts: boolean;
    routing: boolean;
  };
  uptime: number;
}

class VoiceServiceClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = VOICE_SERVICE_URL;
  }

  /**
   * Full voice processing pipeline: STT → Command Routing → Execution → TTS
   */
  async processVoice(request: VoiceProcessRequest): Promise<VoiceProcessResponse> {
    try {
      const formData = new FormData();

      if (request.audio) {
        const audioBlob = request.audio instanceof Blob 
          ? request.audio 
          : new Blob([request.audio], { type: 'audio/webm' });
        formData.append('audio', audioBlob);
      }

      if (request.text) {
        formData.append('text', request.text);
      }

      if (request.options) {
        formData.append('options', JSON.stringify(request.options));
      }

      const response = await fetch(`${this.baseUrl}/api/voice/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Voice processing failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // If audio is returned, create object URL
      if (result.audioData) {
        const audioBlob = new Blob([new Uint8Array(result.audioData)], { type: 'audio/wav' });
        result.audioUrl = URL.createObjectURL(audioBlob);
      }

      return result;
    } catch (error) {
      console.error('Voice processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Speech-to-text only
   */
  async transcribe(request: TranscribeRequest): Promise<TranscribeResponse> {
    try {
      const formData = new FormData();
      
      const audioBlob = request.audio instanceof Blob 
        ? request.audio 
        : new Blob([request.audio], { type: 'audio/webm' });
      
      formData.append('audio', audioBlob);

      if (request.options) {
        formData.append('options', JSON.stringify(request.options));
      }

      const response = await fetch(`${this.baseUrl}/api/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        transcript: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Text-to-speech only
   */
  async synthesize(request: SynthesizeRequest): Promise<SynthesizeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/voice/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Synthesis failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // If audio data is returned, create object URL
      if (result.audioData) {
        const audioBlob = new Blob([new Uint8Array(result.audioData)], { type: 'audio/wav' });
        result.audioUrl = URL.createObjectURL(audioBlob);
      }

      return result;
    } catch (error) {
      console.error('Synthesis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'unhealthy',
        services: {
          stt: false,
          tts: false,
          routing: false,
        },
        uptime: 0
      };
    }
  }

  /**
   * Check if voice service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const voiceService = new VoiceServiceClient();

// Helper functions for easy integration
export const voiceUtils = {
  /**
   * Simple voice command processing
   */
  async processVoiceCommand(audio: Blob): Promise<string | null> {
    const result = await voiceService.processVoice({ 
      audio,
      options: { returnAudio: false, responseType: 'text' }
    });
    
    return result.success ? result.response || null : null;
  },

  /**
   * Simple speech-to-text
   */
  async speechToText(audio: Blob): Promise<string | null> {
    const result = await voiceService.transcribe({ audio });
    return result.success ? result.transcript : null;
  },

  /**
   * Simple text-to-speech with auto-play
   */
  async textToSpeech(text: string, autoPlay: boolean = true): Promise<string | null> {
    const result = await voiceService.synthesize({ text });
    
    if (result.success && result.audioUrl) {
      if (autoPlay && typeof window !== 'undefined') {
        const audio = new Audio(result.audioUrl);
        audio.play().catch(console.error);
      }
      return result.audioUrl;
    }
    
    return null;
  },

  /**
   * Check if microphone permission is granted
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        return false;
      }

      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Record audio for specified duration
   */
  async recordAudio(durationMs: number = 5000): Promise<Blob | null> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Media devices not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      const chunks: Blob[] = [];
      
      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
          stream.getTracks().forEach(track => track.stop());
          resolve(audioBlob);
        };

        mediaRecorder.onerror = (event) => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Recording failed'));
        };

        mediaRecorder.start();
        
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, durationMs);
      });
    } catch (error) {
      console.error('Audio recording error:', error);
      return null;
    }
  }
};

export default voiceService; 