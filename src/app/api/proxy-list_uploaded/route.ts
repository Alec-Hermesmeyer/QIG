export const runtime = 'edge';

export async function GET() {
  const chatMessage = {
    messages: [
      {
        role: 'user',
        content: 'List the contracts I have uploaded.',
      },
    ],
  };

  try {
    const response = await fetch('https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatMessage),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
