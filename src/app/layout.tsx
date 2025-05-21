// app/layout.tsx
import { AuthProvider } from '@/lib/auth/AuthContext';
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
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          <Sidebar />
          <div className="flex-1 overflow-auto">
            <ToastProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </ToastProvider>
          </div>
        </div>
      </body>
    </html>
  );
}