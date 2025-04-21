import {
    ChatAppResponse,
    ChatAppResponseOrError,
    ChatAppRequest,
    Config,
    SimpleAPIResponse,
    HistoryListApiResponse,
    HistroyApiResponse,
    RetrievalMode
  } from "@/types/models";
  
  export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
  
  export async function fetchFromAPI(endpoint: string, options: RequestInit = {}) {
    // Make sure we're working with a properly formatted URL
    // Add a leading slash if missing
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
  
    // Create the full URL with the base URL
    const url = new URL(endpoint, API_BASE_URL.startsWith('http') 
      ? API_BASE_URL 
      : new URL(API_BASE_URL, window.location.origin).toString());
    
    console.log(`Fetching from: ${url.toString()}`);
  
    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API error: ${response.statusText}`);
    }
  
    return response;
  }
  
  export async function configApi(): Promise<Config> {
    const response = await fetch(`${API_BASE_URL}/config`, {
      method: "GET"
    });
  
    return (await response.json()) as Config;
  }
  
  export async function askApi(request: ChatAppRequest): Promise<ChatAppResponse> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
  
    if (response.status > 299 || !response.ok) {
      throw Error(`Request failed with status ${response.status}`);
    }
    const parsedResponse: ChatAppResponseOrError = await response.json();
    if (parsedResponse.error) {
      throw Error(parsedResponse.error);
    }
  
    return parsedResponse as ChatAppResponse;
  }
  
  export async function chatApi(request: ChatAppRequest, shouldStream: boolean): Promise<Response> {
    let url = `${API_BASE_URL}/chat`;
    if (shouldStream) {
      url += "/stream";
    }
    
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
  }
  
  export async function graphRagApi(requestData: ChatAppRequest, shouldStream: boolean): Promise<Response> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(shouldStream ? { "Accept": "text/event-stream" } : {})
    };
  
    try {
      const lastUserMessage =
        requestData.messages
          .slice()
          .reverse()
          .find(m => m.role === "user")?.content || "";
  
      const endpoint = shouldStream ? "/graph/api/v1/property_graph/stream_chat/" : "/graph/api/v1/property_graph/query/";
      console.log(`Requesting: ${endpoint}`);
  
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: lastUserMessage })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Graph RAG API error response: ${errorText}`);
        throw new Error(`Graph RAG request failed: ${response.status} - ${errorText}`);
      }
  
      if (shouldStream) {
        if (!response.body) {
          console.error("Streaming error: Response body is null");
          throw new Error("No response body available for streaming");
        }
  
        // Handle Server-Sent Events (SSE) Stream
        return new Response(response.body, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
          }
        });
      } else {
        // Ensure Response is Correctly Parsed
        const text = await response.text();
        console.log("Non-streaming API Response:", text);
  
        let parsedData;
        try {
          parsedData = JSON.parse(text);
        } catch (error) {
          console.warn("Response is not valid JSON, returning raw text.");
          return new Response(text.trim(), {
            status: 200,
            headers: { "Content-Type": "text/plain" }
          });
        }
  
        return new Response(parsedData.response?.trim() || "No response available", {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Graph RAG API Error:", error.message);
      } else {
        console.error("Graph RAG API Error:", error);
      }
      if (error instanceof Error) {
        throw new Error(`Graph RAG request failed: ${error.message}`);
      } else {
        throw new Error("Graph RAG request failed: Unknown error");
      }
    }
  }
  
  export async function getSpeechApi(text: string): Promise<string | null> {
    return await fetch("/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text
      })
    })
      .then(response => {
        if (response.status == 200) {
          return response.blob();
        } else if (response.status == 400) {
          console.log("Speech synthesis is not enabled.");
          return null;
        } else {
          console.error("Unable to get speech synthesis.");
          return null;
        }
      })
      .then(blob => (blob ? URL.createObjectURL(blob) : null));
  }
  
 // lib/api.ts
export function getCitationFilePath(citation: string): string {
  return `/api/proxy-content?filename=${encodeURIComponent(citation)}`;
}

  
  export async function uploadFileApi(request: FormData): Promise<SimpleAPIResponse> {
    const response = await fetch("/upload", {
      method: "POST",
      body: request
    });
  
    if (!response.ok) {
      throw new Error(`Uploading files failed: ${response.statusText}`);
    }
  
    const dataResponse: SimpleAPIResponse = await response.json();
    return dataResponse;
  }
  
  export async function deleteUploadedFileApi(filename: string): Promise<SimpleAPIResponse> {
    const response = await fetch("/delete_uploaded", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });
  
    if (!response.ok) {
      throw new Error(`Deleting file failed: ${response.statusText}`);
    }
  
    const dataResponse: SimpleAPIResponse = await response.json();
    return dataResponse;
  }
  
  export async function listUploadedFilesApi(): Promise<string[]> {
    const response = await fetch(`/list_uploaded`, {
      method: "GET",
      credentials: "include",
    });
  
    if (!response.ok) {
      throw new Error(`Listing files failed: ${response.statusText}`);
    }
  
    const dataResponse: string[] = await response.json();
    return dataResponse;
  }
  
  export async function postChatHistoryApi(item: any): Promise<any> {
    const response = await fetch("/chat_history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
  
    if (!response.ok) {
      throw new Error(`Posting chat history failed: ${response.statusText}`);
    }
  
    const dataResponse: any = await response.json();
    return dataResponse;
  }
  
  export async function getChatHistoryListApi(count: number, continuationToken: string | undefined): Promise<HistoryListApiResponse> {
    const response = await fetch("/chat_history/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: count, continuation_token: continuationToken })
    });
  
    if (!response.ok) {
      throw new Error(`Getting chat histories failed: ${response.statusText}`);
    }
  
    const dataResponse: HistoryListApiResponse = await response.json();
    return dataResponse;
  }
  
  export async function getChatHistoryApi(id: string): Promise<HistroyApiResponse> {
    const response = await fetch(`/chat_history/items/${id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
  
    if (!response.ok) {
      throw new Error(`Getting chat history failed: ${response.statusText}`);
    }
  
    const dataResponse: HistroyApiResponse = await response.json();
    return dataResponse;
  }
  
  export async function deleteChatHistoryApi(id: string): Promise<any> {
    const response = await fetch(`/chat_history/items/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });
  
    if (!response.ok) {
      throw new Error(`Deleting chat history failed: ${response.statusText}`);
    }
  
    const dataResponse: any = await response.json();
    return dataResponse;
  }
  
  export { RetrievalMode };
  export type { ChatAppResponse, ChatAppRequest };
  
  // Speech configuration types
  export interface SpeechConfig {
    key?: string;
    region?: string;
  }