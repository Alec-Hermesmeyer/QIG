// components/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@fluentui/react';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    
    // Show timeout message after 3 seconds
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setShowTimeoutMessage(true);
      }
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner label="Loading..." />
        
        {showTimeoutMessage && (
          <div className="mt-4 max-w-md text-center p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-blue-700 mb-2">Taking longer than expected...</p>
            <p className="text-sm text-blue-600">
              If this persists, try refreshing the page or logging in again.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}