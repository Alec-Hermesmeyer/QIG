import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get the Deepgram API key from environment variables
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Deepgram API key is not configured" },
        { status: 500 }
      );
    }
    
    // Return the API key
    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error("Error retrieving Deepgram API key:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}