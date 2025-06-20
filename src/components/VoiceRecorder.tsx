import { useState, useRef } from 'react';

export const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      // Connect to audio WebSocket
      const ws = new WebSocket('ws://localhost:8080/ws/audio?stt_engine=deepgram');
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]?.transcript) {
          const newTranscript = data.channel.alternatives[0].transcript;
          setTranscript(newTranscript);
          
          // Process as voice command if final
          if (data.is_final) {
            processVoiceCommand(newTranscript);
          }
        }
      };

      // Start audio capture
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { sampleRate: 16000, channelCount: 1 } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      mediaRecorder.start(250); // Send data every 250ms
      setIsRecording(true);

    } catch (error: unknown) {
      console.error('❌ Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setIsRecording(false);
  };

  const processVoiceCommand = async (command: string) => {
    try {
      const response = await fetch('http://localhost:8080/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: command,
          currentContext: window.location.pathname.slice(1) || 'home',
          sessionId: 'web-session'
        })
      });

      const result = await response.json();
      console.log('📝 Voice command result:', result);
      
    } catch (error: unknown) {
      console.error('❌ Failed to process voice command:', error);
    }
  };

  return (
    <div className="voice-recorder">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`record-btn ${isRecording ? 'recording' : ''}`}
      >
        {isRecording ? '🛑 Stop' : '🎤 Record'}
      </button>
      
      {transcript && (
        <div className="transcript">
          <strong>Transcript:</strong> {transcript}
        </div>
      )}
    </div>
  );
}; 