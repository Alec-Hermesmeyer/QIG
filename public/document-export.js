// This script loads the docx.js library for Word document export functionality
(function() {
    // Don't load if already loaded
    if (window.docx) return;
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/docx/7.8.2/docx.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.integrity = 'sha512-MUc8R2RNR48N4p99c/rGbQ0c5TBATNzXC5qkQNlK+LvmTiDqQ3jxxqrjGV+Mt2avTIikTGJ8S1+XvPLRYjYgLQ==';
    
    // On load callback
    script.onload = function() {
      console.log('docx.js library loaded successfully');
    };
    
    // Error handling
    script.onerror = function() {
      console.error('Failed to load docx.js library');
      alert('Document export library failed to load. Please check your internet connection and try again.');
    };
    
    // Add to document
    document.head.appendChild(script);
  })();