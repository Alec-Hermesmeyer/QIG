'use client';

import dynamic from 'next/dynamic';

// Dynamically import the voice interface to avoid SSR issues
const VoiceInterfaceWithRouter = dynamic(
  () => import('./VoiceInterfaceWithRouter').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => null
  }
) as React.ComponentType<{ currentUser?: { name?: string; email?: string; preferences?: Record<string, any> } }>;

interface GlobalVoiceControlsProps {
  currentUser?: {
    name?: string;
    email?: string;
    preferences?: Record<string, any>;
  };
}

export const GlobalVoiceControls: React.FC<GlobalVoiceControlsProps> = ({ 
  currentUser 
}) => {
  return <VoiceInterfaceWithRouter currentUser={currentUser} />;
}; 