export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json();
    const { messages } = body;
    
    // Get the last user message
    let lastUserMessage = "";
    if (Array.isArray(messages) && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessage = messages[i].content;
          break;
        }
      }
    }
    
    // Use the backend URL
    const BACKEND_URL = "https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io";
    const apiUrl = new URL("/chat", BACKEND_URL);
    
    // Use a simple payload format
    const payload = {
      messages: [{ role: "user", content: lastUserMessage }]
    };
    
    // Call the backend API
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} ${response.statusText}`);
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({
          error: `Backend API error: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get the response data
    const responseData = await response.json();
    const messageContent = responseData.message?.content || "Sorry, I couldn't process that request.";
    
    // Create a stream that simulates chunk-by-chunk delivery compatible with your Chat component
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Split the message into word chunks to simulate streaming
        const words = messageContent.split(/\s+/);
        
        for (let i = 0; i < words.length; i++) {
          // Add a space after each word except the last one
          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
          
          // Format the chunk to match what your component is expecting
          const jsonLine = JSON.stringify({ content: chunk });
          controller.enqueue(encoder.encode(jsonLine + '\n'));
          
          // Add a small delay to simulate streaming (adjust as needed)
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        controller.close();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}