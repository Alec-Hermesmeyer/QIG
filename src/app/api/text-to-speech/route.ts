import { NextResponse } from "next/server";

const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const voice_id = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID;

export async function POST(req: Request) {
  try {
    const { text,  stability, similarity_boost } = await req.json();

    if (!text || !voice_id) {
      return NextResponse.json({ error: "Text and voice ID are required" }, { status: 400 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_LABS_API_KEY!,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability ?? 0.75, // Default to 0.75 if not provided
            similarity_boost: similarity_boost ?? 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}