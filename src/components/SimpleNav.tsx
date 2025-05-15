'use client';

import Link from 'next/link';
import { Home, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleNavProps {
  title?: string;
}

export default function SimpleNav({ title = 'Admin' }: SimpleNavProps) {
  return (
    <div className="border-b bg-white">
      <div className="container mx-auto py-4 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="font-bold text-lg">{title}</h1>
        </div>
        
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center space-x-1">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}