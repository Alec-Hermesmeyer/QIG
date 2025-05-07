// app/settings/page.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { OrganizationSettings } from '@/components/OrganizationSettings';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SettingsPage() {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8 px-4">
        <OrganizationSettings />
      </div>
    </ProtectedRoute>
  );
}