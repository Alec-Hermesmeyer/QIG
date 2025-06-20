'use client';

import dynamic from 'next/dynamic';

// Dynamically import MemoryMonitor to ensure it only runs on client-side
const MemoryMonitor = dynamic(
  () => import('./MemoryMonitor').then(mod => ({ default: mod.MemoryMonitor })),
  { 
    ssr: false,
    loading: () => null
  }
);

interface ClientOnlyMemoryMonitorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  warningThreshold?: number;
  enabled?: boolean;
}

export const ClientOnlyMemoryMonitor: React.FC<ClientOnlyMemoryMonitorProps> = (props) => {
  return <MemoryMonitor {...props} />;
}; 