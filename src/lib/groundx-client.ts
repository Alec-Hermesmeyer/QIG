import { GroundXClient } from "groundx";

// Initialize client only on the server side
let groundxClient: GroundXClient | null = null;

if (typeof window === 'undefined') {
  try {
    groundxClient = new GroundXClient({
      apiKey: process.env.GROUNDX_API_KEY || '',
    });
  } catch (error) {
    console.error('Error initializing GroundX client:', error);
    groundxClient = null;
  }
}

export async function getGroundxClient(): Promise<GroundXClient | null> {
  if (!groundxClient) {
    console.warn('GroundX client is not initialized.');
  }
  return groundxClient;
}

export function isGroundxClientInitialized(): boolean {
  return groundxClient !== null;
} 