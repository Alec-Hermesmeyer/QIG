import { useRef, useState, useCallback } from 'react';

const DEEPGRAM_SOCKET_URL = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&model=nova&smart_format=true`;

export const useDeepgramStreaming = (apiKey: string, onTranscriptUpdate: (transcript: string) => void) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const startStreaming = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const ws = new WebSocket(`${DEEPGRAM_SOCKET_URL}&access_token=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      recorder.start(250); // send chunks every 250ms
      setIsStreaming(true);
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      const transcript = data.channel?.alternatives?.[0]?.transcript || '';
      if (transcript && !data.is_final) {
        onTranscriptUpdate(transcript);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      setIsStreaming(false);
    };
  }, [apiKey, onTranscriptUpdate]);

  const stopStreaming = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    startStreaming,
    stopStreaming
  };
};
