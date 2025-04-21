'use client';

import React, { ReactNode } from 'react';
import { MsalProvider as MsalReactProvider } from '@azure/msal-react';
import { msalInstance } from '@/lib/msal';

interface MsalProviderProps {
  children: ReactNode;
}

/**
 * MSAL Provider Component
 * This component wraps the application with the MSAL authentication context.
 * The 'use client' directive is required because MSAL React uses React Context
 * which is only available in client components.
 */
export const MsalProvider: React.FC<MsalProviderProps> = ({ children }) => {
  // MSAL instance might be null on the server, so we need to check
  if (!msalInstance) {
    return <>{children}</>;
  }

  return (
    <MsalReactProvider instance={msalInstance}>
      {children}
    </MsalReactProvider>
  );
};

export default MsalProvider;