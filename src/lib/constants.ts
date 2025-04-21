// lib/constants.ts

// Azure AD Configuration
export const AZURE_AD_TENANT_ID = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'd97de02a-4882-4368-af5b-39b68295eeea';

// Backend API URL
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

// Azure Blob Storage Configuration
export const AZURE_STORAGE_CONNECTION_STRING = process.env.NEXT_PUBLIC_AZURE_STORAGE_CONNECTION_STRING || 'DefaultEndpointsProtocol=https;AccountName=stdka66scue7f4y;AccountKey=D+Q/tNY5NCLQUNpC1Dhpqz3oI6o7C4Y+N8qfYPdrPXd9FRTqNWReFC0oF00Y+AqmxqW9Hb3mN2RT+AStCkzbsw==;EndpointSuffix=core.windows.net';
export const AZURE_BLOB_CONTAINER_NAME = process.env.NEXT_PUBLIC_AZURE_BLOB_CONTAINER_NAME || 'content';
export const AZURE_SAS_TOKEN = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN || 'sp=rw&st=2025-04-21T17:33:14Z&se=2025-04-28T16:00:00Z&skoid=08a01f0b-8511-4331-bcfd-bda7731190c3&sktid=d97de02a-4882-4368-af5b-39b68295eeea&skt=2025-04-21T17:33:14Z&ske=2025-04-28T16:00:00Z&sks=b&skv=2024-11-04&sv=2024-11-04&sr=c&sig=bnWzLvsGMp%2F%2B0FYDy2MFi%2BHGRlHkKH3BC0mnDI7Rtk8%3D';
export const AZURE_BLOB_URL = process.env.NEXT_PUBLIC_AZURE_BLOB_URL || 'https://stdka66scue7f4y.blob.core.windows.net/content';

// API URLs
export const FLASK_API_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

// Construct the complete blob URL with SAS token
export const AZURE_BLOB_URL_WITH_SAS = `${AZURE_BLOB_URL}?${AZURE_SAS_TOKEN}`;

// Function to get document URL
export const getDocumentUrl = (fileName: string): string => {
  // This encodes the user's file path properly to be accessed via the backend proxy
  return `${BACKEND_URL}/proxy-content?filename=${encodeURIComponent(fileName)}`;
};

// Function to get citation URL for documents
export const getCitationUrl = (fileName: string): string => {
  // Same as document URL in this implementation
  return getDocumentUrl(fileName);
};