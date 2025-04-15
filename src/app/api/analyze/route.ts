// src/app/api/analyze/route.ts

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, contractName } = body;

    // Extract last user message
    let lastUserMessage = "";
    if (Array.isArray(messages) && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessage = messages[i].content;
          break;
        }
      }
    }

    // Build custom contract analysis prompt
    const getPrompt = (contractName: string) => `
You are an expert construction contract analyst with deep experience in risk assessment. Analyze the contract titled "${contractName}" in full. Identify and return every potential risk to the Construction Manager-At-Risk (Contractor), based on legal, financial, operational, reputational, or environmental exposure.

For each risk identified, return the following structured fields:
- Risk Category
- Risk Score
- Risky Contract Text
- Why This Is a Risk
- Contract Location

Also return a final Mitigation Summary matching each risk with recommendations. Ensure the following areas are covered but not limited to:
- Liquidated Damages
- Indemnification
- Termination
- Insurance
- Dispute Resolution

Use headers and bullet/numbered formatting. Format should be consistent and easy to parse.
If the contract is not found, respond: "The requested contract \"${contractName}\" could not be located."
`;

    // Define backend endpoint
    const BACKEND_URL = "https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io";
    const apiUrl = new URL("/chat", BACKEND_URL);

    // Send the prompt and context override
    const payload = {
      messages: [{ role: "user", content: lastUserMessage }],
      context: {
        overrides: {
          prompt_template: getPrompt(contractName)
        }
      }
    };

    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Backend API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await response.json();
    const messageContent = responseData.message?.content || "No analysis returned.";

    return new Response(JSON.stringify({ result: messageContent }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unexpected error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
