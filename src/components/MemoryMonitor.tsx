import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface MemoryMonitorProps {
  enabled?: boolean;
  warningThreshold?: number; // MB
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const MemoryMonitor: React.FC<MemoryMonitorProps> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  warningThreshold = 100,
  position = 'top-left'
}) => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isWarning, setIsWarning] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const checkMemory = () => {
      // @ts-ignore - performance.memory is not standard but supported in Chrome
      if (typeof window !== 'undefined' && window.performance?.memory) {
        // @ts-ignore
        const memory = window.performance.memory;
        const info: MemoryInfo = {
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          totalJSHeapSize: memory.totalJSHeapSize,
          usedJSHeapSize: memory.usedJSHeapSize
        };
        
        setMemoryInfo(info);
        
        const usedMB = info.usedJSHeapSize / (1024 * 1024);
        setIsWarning(usedMB > warningThreshold);
      }
    };

    // Check immediately and then every 5 seconds
    checkMemory();
    const interval = setInterval(checkMemory, 5000);

    return () => clearInterval(interval);
  }, [enabled, warningThreshold]);

  if (!enabled || !memoryInfo) return null;

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const usagePercentage = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 text-xs
          ${isWarning ? 'border-red-500 bg-red-50 dark:bg-red-900' : 'border-gray-200'}
          cursor-pointer
        `}
        onClick={() => setIsVisible(!isVisible)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isWarning ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="font-mono">
            Memory: {formatBytes(memoryInfo.usedJSHeapSize)}
          </span>
        </div>
        
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600"
            >
              <div className="space-y-1 font-mono">
                <div>Used: {formatBytes(memoryInfo.usedJSHeapSize)}</div>
                <div>Total: {formatBytes(memoryInfo.totalJSHeapSize)}</div>
                <div>Limit: {formatBytes(memoryInfo.jsHeapSizeLimit)}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        isWarning ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs">{usagePercentage.toFixed(1)}%</span>
                </div>
              </div>
              
              {isWarning && (
                <div className="mt-2 text-red-600 dark:text-red-400 font-medium">
                  ⚠️ High memory usage detected!
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}; 