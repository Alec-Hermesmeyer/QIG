'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled - this must be in a client component
const StandaloneVoiceControls = dynamic(
  () => import('./StandaloneVoiceControls'),
  { ssr: false }
);

export default function VoiceControlsWrapper() {
  return <StandaloneVoiceControls />;
} 