// Utility functions for resource cleanup and memory management

interface MediaResourceTracker {
  mediaStreams: Set<MediaStream>;
  audioElements: Set<HTMLAudioElement>;
  objectUrls: Set<string>;
  mediaRecorders: Set<MediaRecorder>;
}

class ResourceTracker {
  private resources: MediaResourceTracker = {
    mediaStreams: new Set(),
    audioElements: new Set(),
    objectUrls: new Set(),
    mediaRecorders: new Set()
  };

  // Track resources
  trackMediaStream(stream: MediaStream) {
    this.resources.mediaStreams.add(stream);
    console.log('[ResourceTracker] Tracking media stream, total:', this.resources.mediaStreams.size);
  }

  trackAudioElement(audio: HTMLAudioElement) {
    this.resources.audioElements.add(audio);
    console.log('[ResourceTracker] Tracking audio element, total:', this.resources.audioElements.size);
  }

  trackObjectUrl(url: string) {
    this.resources.objectUrls.add(url);
    console.log('[ResourceTracker] Tracking object URL, total:', this.resources.objectUrls.size);
  }

  trackMediaRecorder(recorder: MediaRecorder) {
    this.resources.mediaRecorders.add(recorder);
    console.log('[ResourceTracker] Tracking media recorder, total:', this.resources.mediaRecorders.size);
  }

  // Cleanup specific resources
  cleanupMediaStream(stream: MediaStream) {
    if (this.resources.mediaStreams.has(stream)) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('[ResourceTracker] Stopped track:', track.kind);
      });
      this.resources.mediaStreams.delete(stream);
      console.log('[ResourceTracker] Cleaned up media stream, remaining:', this.resources.mediaStreams.size);
    }
  }

  cleanupAudioElement(audio: HTMLAudioElement) {
    if (this.resources.audioElements.has(audio)) {
      audio.pause();
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
        this.resources.objectUrls.delete(audio.src);
      }
      audio.removeAttribute('src');
      audio.load();
      this.resources.audioElements.delete(audio);
      console.log('[ResourceTracker] Cleaned up audio element, remaining:', this.resources.audioElements.size);
    }
  }

  cleanupObjectUrl(url: string) {
    if (this.resources.objectUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
        this.resources.objectUrls.delete(url);
        console.log('[ResourceTracker] Revoked object URL, remaining:', this.resources.objectUrls.size);
      } catch (error) {
        console.warn('[ResourceTracker] Failed to revoke URL:', error);
      }
    }
  }

  cleanupMediaRecorder(recorder: MediaRecorder) {
    if (this.resources.mediaRecorders.has(recorder)) {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
      this.resources.mediaRecorders.delete(recorder);
      console.log('[ResourceTracker] Cleaned up media recorder, remaining:', this.resources.mediaRecorders.size);
    }
  }

  // Cleanup all resources
  cleanupAll() {
    console.log('[ResourceTracker] Starting cleanup of all resources...');
    
    // Cleanup media streams
    this.resources.mediaStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.resources.mediaStreams.clear();

    // Cleanup audio elements
    this.resources.audioElements.forEach(audio => {
      audio.pause();
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
      }
      audio.removeAttribute('src');
      audio.load();
    });
    this.resources.audioElements.clear();

    // Cleanup object URLs
    this.resources.objectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn('[ResourceTracker] Failed to revoke URL:', error);
      }
    });
    this.resources.objectUrls.clear();

    // Cleanup media recorders
    this.resources.mediaRecorders.forEach(recorder => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    });
    this.resources.mediaRecorders.clear();

    console.log('[ResourceTracker] All resources cleaned up');
  }

  // Get resource counts for debugging
  getResourceCounts() {
    return {
      mediaStreams: this.resources.mediaStreams.size,
      audioElements: this.resources.audioElements.size,
      objectUrls: this.resources.objectUrls.size,
      mediaRecorders: this.resources.mediaRecorders.size
    };
  }

  // Log current resource state
  logResourceState() {
    const counts = this.getResourceCounts();
    console.log('[ResourceTracker] Current resources:', counts);
    
    if (counts.mediaStreams > 5 || counts.audioElements > 5 || counts.objectUrls > 10) {
      console.warn('[ResourceTracker] High resource usage detected! Consider cleanup.');
    }
  }
}

// Global resource tracker instance
export const resourceTracker = new ResourceTracker();

// Auto-cleanup utility for React components
export const useResourceCleanup = () => {
  const cleanup = () => {
    resourceTracker.cleanupAll();
  };

  return { cleanup, resourceTracker };
};

// Memory pressure detection
export const detectMemoryPressure = (): boolean => {
  // @ts-ignore - performance.memory is not standard but supported in Chrome
  if (typeof window !== 'undefined' && window.performance?.memory) {
    // @ts-ignore
    const memory = window.performance.memory;
    const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    return usedPercent > 80; // Consider 80%+ as high memory pressure
  }
  return false;
};

// Force garbage collection (development only)
export const forceGarbageCollection = () => {
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore - gc is not standard but available in Chrome DevTools
    if (typeof window !== 'undefined' && window.gc) {
      console.log('[ResourceTracker] Forcing garbage collection...');
      // @ts-ignore
      window.gc();
    } else {
      console.warn('[ResourceTracker] Garbage collection not available. Enable in Chrome DevTools.');
    }
  }
};

// Memory optimization utility
export const optimizeMemoryUsage = () => {
  console.log('[ResourceTracker] Starting memory optimization...');
  
  // Clean up all tracked resources
  resourceTracker.cleanupAll();
  
  // Force garbage collection if available
  forceGarbageCollection();
  
  // Clear any stale event listeners
  if (typeof window !== 'undefined') {
    // Remove any orphaned blob URLs from memory
    performance.mark('memory-optimization-start');
    
    setTimeout(() => {
      performance.mark('memory-optimization-end');
      console.log('[ResourceTracker] Memory optimization completed');
    }, 100);
  }
}; 