// app/layout.tsx
import { AuthProvider } from '@/lib/auth/AuthContext';
import { OrganizationSwitchProvider } from '@/contexts/OrganizationSwitchContext';
import { ChatProvider } from '@/components/ChatProvider';
import { ApiWarmupProvider } from '@/components/ApiWarmupProvider';
import QIGAdminToolbar from '@/components/QIGAdminToolbar';
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
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <OrganizationSwitchProvider>
            <ChatProvider>
              <ApiWarmupProvider>
                <ToastProvider>
                  <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                    <Sidebar />
                    <div className="flex-1 overflow-auto">
                      {children}
                    </div>
                    {/* QIG Admin Toolbar - Only visible to QIG members */}
                    <QIGAdminToolbar />
                  </div>
                </ToastProvider>
              </ApiWarmupProvider>
            </ChatProvider>
          </OrganizationSwitchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}