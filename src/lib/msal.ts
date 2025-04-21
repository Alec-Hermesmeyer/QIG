// lib/msal.ts
import { Configuration, LogLevel, PublicClientApplication } from "@azure/msal-browser";

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '', // You'll need to create a client ID in Azure Portal
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : '',
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues with IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Info,
    },
  },
};

// Add scopes for accessing the backend API
export const loginRequest = {
  scopes: ["User.Read"]
};

// Create MSAL instance outside of the component tree
// to prevent it from being re-instantiated on re-renders
export const msalInstance = typeof window !== 'undefined' 
  ? new PublicClientApplication(msalConfig)
  : null;

// Helper to get the access token
export async function getAccessToken() {
  if (!msalInstance) {
    throw new Error('MSAL instance not initialized');
  }

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No accounts found');
  }

  const request = {
    scopes: ["User.Read"],
    account: accounts[0]
  };

  try {
    const response = await msalInstance.acquireTokenSilent(request);
    return response.accessToken;
  } catch (error) {
    // If silent token acquisition fails, try to acquire token using redirect
    msalInstance.acquireTokenRedirect(request);
    return null;
  }
}