// Backend API service for connecting to our Express backend
import { authService } from './authService';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Generic backend fetch function
export async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  // Ensure endpoint starts with /
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }

  // Remove /api prefix if present (since our backend doesn't need it)
  if (endpoint.startsWith('/api/')) {
    endpoint = endpoint.substring(4);
  }

  const url = `${BACKEND_BASE_URL}/api${endpoint}`;
  
  // Get auth token from our auth service
  const token = await authService.getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add authorization if available
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Adding auth token to request');
  } else {
    console.log('⚠️ No auth token available - making unauthenticated request');
  }

  console.log(`🔗 Backend API call: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Backend API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Backend API error: ${response.statusText} - ${errorText}`);
  }

  return response;
}

// Specific backend API functions
export async function backendChatApi(messages: any[], shouldStream: boolean = false): Promise<Response> {
  const endpoint = shouldStream ? '/chat-stream' : '/chat';
  
  return await fetchFromBackend(endpoint, {
    method: 'POST',
    body: JSON.stringify({ messages })
  });
}

export async function backendGroundXApi(endpoint: string, data?: any): Promise<Response> {
  const fullEndpoint = `/api/groundx${endpoint}`;
  
  if (data) {
    return await fetchFromBackend(fullEndpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  } else {
    return await fetchFromBackend(fullEndpoint, {
      method: 'GET'
    });
  }
}

// Ground-X specific functions
export async function getGroundXBuckets(): Promise<any> {
  const response = await backendGroundXApi('/buckets');
  return await response.json();
}

export async function queryGroundXRag(query: string, bucketId: string, limit: number = 10): Promise<any> {
  const response = await backendGroundXApi('/rag', {
    query,
    bucketId,
    limit,
    includeThoughts: true
  });
  return await response.json();
}

export async function searchGroundXDocuments(query: string, bucketId: string, limit: number = 10): Promise<any> {
  const response = await backendGroundXApi('/search', {
    query,
    bucketId,
    limit
  });
  return await response.json();
}

export async function getDocumentXray(documentId: string): Promise<any> {
  const response = await backendGroundXApi(`/documents/${documentId}/xray`);
  return await response.json();
}

export async function getDocumentInfo(documentId: string): Promise<any> {
  const response = await backendGroundXApi(`/document-info/${documentId}`);
  return await response.json();
}

// Test backend connection (unauthenticated)
export async function testBackendConnection(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    console.log(`🔍 Testing backend connection to: ${BACKEND_BASE_URL}/api/health`);
    
    const response = await fetch(`${BACKEND_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Backend connection successful',
        data
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Backend health check failed: ${response.status} - ${errorText}`
      };
    }
  } catch (error) {
    console.error('Backend connection test error:', error);
    return {
      success: false,
      message: `Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
} 