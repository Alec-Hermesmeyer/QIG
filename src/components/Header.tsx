// components/Header.tsx
'use client';

import { useAuth } from '@/lib/auth/AuthContext';

export default function Header() {
  const { user, signOut } = useAuth();
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-lg font-bold">Contract Analyzer</h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Logged in as <span className="font-medium">{user.email}</span>
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}