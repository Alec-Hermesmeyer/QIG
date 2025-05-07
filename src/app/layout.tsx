// app/layout.tsx
import { AuthProvider } from '@/lib/auth/AuthContext';
import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: 'Contract Analyzer',
  description: 'Analyze contract documents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
      <ToastProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}