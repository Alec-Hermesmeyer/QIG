import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

// Initialize Deepgram with API key
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function POST(req: Request) {
  try {
    // Check if API key is available
    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: "Deepgram API key is not configured" },
        { status: 500 }
      );
    }

    // Get form data with audio file
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert the file to an ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Deepgram client (new API style)
    const deepgram = createClient(DEEPGRAM_API_KEY);

    // Set transcription options
    const options = {
      smart_format: true,
      model: "nova-2",
      language: "en",
      detect_language: true,
    };

    try {
      // Use the prerecorded API from the newest SDK version
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(buffer, options);
      
      if (error) {
        throw new Error(`Deepgram error: ${error.message}`);
      }

      // Extract transcript from the result
      const transcript = result?.results?.channels[0]?.alternatives[0]?.transcript || '';
      
      return NextResponse.json({ transcript });
    } catch (transcriptionError) {
      console.error("Deepgram transcription error:", transcriptionError);
      return NextResponse.json(
        { error: "Failed to transcribe with Deepgram", details: (transcriptionError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio", details: (error as Error).message },
      { status: 500 }
    );
  }
}