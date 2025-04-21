'use client';

import React, { ReactNode } from 'react';
import { 
  AuthenticatedTemplate as MsalAuthenticatedTemplate, 
  UnauthenticatedTemplate as MsalUnauthenticatedTemplate,
  useMsal 
} from '@azure/msal-react';
import { loginRequest } from '@/lib/msal';

interface AuthenticatedTemplateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthenticatedTemplate: React.FC<AuthenticatedTemplateProps> = ({ 
  children, 
  fallback = <LoginButton /> 
}) => {
  return (
    <>
      <MsalAuthenticatedTemplate>
        {children}
      </MsalAuthenticatedTemplate>
      <MsalUnauthenticatedTemplate>
        {fallback}
      </MsalUnauthenticatedTemplate>
    </>
  );
};

export const UnauthenticatedTemplate: React.FC<AuthenticatedTemplateProps> = ({ 
  children, 
  fallback = <div>Please sign in to continue</div> 
}) => {
  return (
    <>
      <MsalUnauthenticatedTemplate>
        {children}
      </MsalUnauthenticatedTemplate>
      <MsalAuthenticatedTemplate>
        {fallback}
      </MsalAuthenticatedTemplate>
    </>
  );
};

export const LoginButton: React.FC = () => {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest)
      .catch(e => {
        console.error("Login failed", e);
      });
  };

  return (
    <button 
      onClick={handleLogin}
      style={{
        padding: '10px 20px',
        backgroundColor: '#0078d4',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px'
      }}
    >
      Sign in with Microsoft
    </button>
  );
};

export const LogoutButton: React.FC = () => {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutRedirect()
      .catch(e => {
        console.error("Logout failed", e);
      });
  };

  return (
    <button 
      onClick={handleLogout}
      style={{
        padding: '8px 16px',
        backgroundColor: '#f1f1f1',
        color: '#333',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      Sign out
    </button>
  );
};

export const useIsAuthenticated = () => {
  const { accounts } = useMsal();
  return accounts.length > 0;
};