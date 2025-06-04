'use client';

import dynamic from 'next/dynamic';

// Dynamically import PerformanceDashboard with no SSR
const PerformanceDashboard = dynamic(
  () => import('@/components/PerformanceDashboard').then(mod => ({ default: mod.PerformanceDashboard })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading monitoring dashboard...</span>
      </div>
    )
  }
);

export default function MonitoringPage() {
  return <PerformanceDashboard />;
} 