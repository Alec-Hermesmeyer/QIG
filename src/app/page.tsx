"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Page() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Redirect to landing page
  useEffect(() => {
    if (user) {
      router.push('/landing');
    }
  }, [user, router]);

  return (
    <ErrorBoundary level="page" context="home-page">
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mb-4"></div>
            <p>Redirecting to document intelligence...</p>
          </div>
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}