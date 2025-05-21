// app/settings/page.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { OrganizationSettings } from '@/components/OrganizationSettings';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SettingsPage() {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4">
        <OrganizationSettings />
      </div>
    </ProtectedRoute>
  );
}