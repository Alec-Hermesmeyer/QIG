'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/AuthContext';

interface QIGOnlyAccessProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export default function QIGOnlyAccess({ 
  children, 
  fallbackTitle = "Access Denied",
  fallbackMessage = "This area is restricted to QIG team members only."
}: QIGOnlyAccessProps) {
  const { isQIGOrganization, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  if (!isQIGOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-4 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">!</span>
              </div>
            </div>
            <CardTitle className="text-red-600 text-xl">{fallbackTitle}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 mb-4">{fallbackMessage}</p>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
} 