'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DebugSettingsPage() {
  const { isLoading, user, organization, session, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Set error if things are taking too long
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setError('Authentication is taking too long to load.');
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading authentication data...</p>
        
        {error && (
          <div className="mt-6 max-w-md text-center p-4 bg-red-50 rounded border border-red-200">
            <p className="text-red-700 mb-2">Loading Error</p>
            <p className="text-sm text-red-600">{error}</p>
            <Button 
              onClick={() => router.push('/login')}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white"
            >
              Go to Login
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  // Not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-md text-center p-6 bg-yellow-50 rounded-lg border border-yellow-300">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Not Authenticated</h2>
          <p className="text-yellow-700 mb-4">
            You need to be logged in to access this page.
          </p>
          <Button 
            onClick={() => router.push('/login')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Settings Debug Page</h1>
        
        <div className="space-y-6">
          <section className="p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Authentication Info</h2>
            <div className="space-y-2 text-sm">
              <p><strong>User Email:</strong> {user?.email || 'No email'}</p>
              <p><strong>User ID:</strong> {user?.id || 'No ID'}</p>
              <p><strong>Auth Provider:</strong> {session?.provider_token ? 'OAuth' : 'Email/Password'}</p>
              <p><strong>Session Valid:</strong> {session ? 'Yes' : 'No'}</p>
            </div>
          </section>
          
          <section className="p-4 bg-green-50 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 mb-2">Profile Info</h2>
            <div className="space-y-2 text-sm">
              <p><strong>First Name:</strong> {profile?.first_name || 'Not set'}</p>
              <p><strong>Last Name:</strong> {profile?.last_name || 'Not set'}</p>
              <p><strong>Profile ID:</strong> {profile?.id || 'No profile'}</p>
              <p><strong>Organization ID:</strong> {profile?.organization_id || 'No organization'}</p>
            </div>
          </section>
          
          <section className="p-4 bg-purple-50 rounded-lg">
            <h2 className="text-lg font-semibold text-purple-800 mb-2">Organization Info</h2>
            {organization ? (
              <div className="space-y-2 text-sm">
                <p><strong>Organization Name:</strong> {organization.name}</p>
                <p><strong>Organization ID:</strong> {organization.id}</p>
                <p><strong>Logo URL:</strong> {organization.logo_url || 'No logo'}</p>
                <p><strong>Theme Color:</strong> {organization.theme_color || 'Default'}</p>
              </div>
            ) : (
              <p className="text-purple-700">No organization data available</p>
            )}
          </section>
          
          <div className="flex space-x-4 pt-4">
            <Button 
              onClick={() => router.push('/settings')}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              Back to Settings
            </Button>
            <Button 
              onClick={() => router.push('/')}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 