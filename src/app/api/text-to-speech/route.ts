import { NextResponse } from "next/server";

const ELEVEN_LABS_API_KEY = process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
const voice_id = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID;

export async function POST(req: Request) {
  try {
    const { text, stability, similarity_boost } = await req.json();

    console.log('[TTS API] Request received:', { text: text?.substring(0, 100), hasApiKey: !!ELEVEN_LABS_API_KEY, hasVoiceId: !!voice_id });

    if (!text) {
      console.error('[TTS API] Missing text parameter');
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!ELEVEN_LABS_API_KEY) {
      console.error('[TTS API] Missing ElevenLabs API key environment variable');
      return NextResponse.json({ 
        error: "TTS service not configured", 
        details: "ELEVENLABS_API_KEY or NEXT_PUBLIC_ELEVENLABS_API_KEY missing" 
      }, { status: 503 });
    }

    if (!voice_id) {
      console.error('[TTS API] Missing NEXT_PUBLIC_ELEVENLABS_VOICE_ID environment variable');
      return NextResponse.json({ 
        error: "TTS service not configured", 
        details: "NEXT_PUBLIC_ELEVENLABS_VOICE_ID missing" 
      }, { status: 503 });
    }

    console.log('[TTS API] Making request to ElevenLabs...');
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability ?? 0.75,
            similarity_boost: similarity_boost ?? 0.75,
          },
        }),
      }
    );

    console.log('[TTS API] ElevenLabs response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS API] ElevenLabs API error:', response.status, errorText);
      return NextResponse.json({ 
        error: "Failed to generate speech", 
        details: `ElevenLabs API returned ${response.status}: ${errorText}` 
      }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('[TTS API] Audio generated successfully, size:', audioBuffer.byteLength);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("[TTS API] Unexpected error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}