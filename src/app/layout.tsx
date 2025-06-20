// app/layout.tsx
import { AuthProvider } from '@/lib/auth/AuthContext';
import { OrganizationSwitchProvider } from '@/contexts/OrganizationSwitchContext';
import { ChatStorageProvider } from '@/components/ChatStorage/ChatStorageProvider';
import { ApiWarmupProvider } from '@/components/ApiWarmupProvider';
import { LoggingProvider } from '@/contexts/LoggingContext';
import QIGAdminToolbar from '@/components/QIGAdminToolbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { SimpleVoiceNavigation } from '@/components/SimpleVoiceNavigation';
import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from "@/components/ui/toast";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'QIG AI Assistant',
  description: 'Intelligent assistant for contract analysis and document search',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const chatStorageType = (process.env.NEXT_PUBLIC_CHAT_STORAGE_TYPE as 'backend' | 'indexeddb') || 'backend';
  console.log('🔍 Layout: Chat storage type:', chatStorageType);
  console.log('🔍 Layout: Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
  
  return (
    <ErrorBoundary level="critical" context="app-root">
      <html lang="en">
        <body className={inter.className}>
          <ErrorBoundary level="critical" context="app-providers">
            <AuthProvider>
              <OrganizationSwitchProvider>
                <ChatStorageProvider defaultConfig={{ 
                  storageType: chatStorageType 
                }}>
                  <ApiWarmupProvider>
                    <LoggingProvider>
                      <ToastProvider>
                        <ErrorBoundary level="page" context="main-layout">
                          <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                            <ErrorBoundary level="component" context="sidebar">
                              <Sidebar />
                            </ErrorBoundary>
                            <div className="flex-1 overflow-auto">
                              {children}
                            </div>
                            <ErrorBoundary level="component" context="admin-toolbar">
                              {/* QIG Admin Toolbar - Only visible to QIG members */}
                              <QIGAdminToolbar />
                            </ErrorBoundary>

                            <ErrorBoundary level="component" context="simple-voice-navigation">
                              {/* Simple Voice Navigation - Stable hands-free navigation */}
                              <SimpleVoiceNavigation 
          enabled={true} 
          clientId={process.env.NEXT_PUBLIC_CLIENT_ID || 'default-user'}
        />
                            </ErrorBoundary>
                          </div>
                        </ErrorBoundary>
                      </ToastProvider>
                    </LoggingProvider>
                  </ApiWarmupProvider>
                </ChatStorageProvider>
              </OrganizationSwitchProvider>
            </AuthProvider>
          </ErrorBoundary>
        </body>
      </html>
    </ErrorBoundary>
  );
}