'use client';

import { useState } from 'react';
import { VoiceUIControlPanel } from './VoiceUIControlPanel';

export const VoiceUIToggle = () => {
  const [isVisible, setIsVisible] = useState(false);

  console.log('VoiceUIToggle component rendered', { isVisible });

  return (
    <div>
      {/* Toggle Button */}
      <button
        onClick={() => {
          console.log('Button clicked, toggling visibility');
          setIsVisible(!isVisible);
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '16px',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          minWidth: '56px',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0'
        }}
        title="Toggle Voice UI Control Panel"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
        </svg>
      </button>

      {/* Control Panel */}
      {isVisible && (
        <VoiceUIControlPanel 
          isVisible={isVisible}
          position="bottom-center"
        />
      )}
    </div>
  );
}; 