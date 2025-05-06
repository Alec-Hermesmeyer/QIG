import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Source } from "@/types/types";

interface ImageViewerProps {
  showImageViewer: boolean;
  setShowImageViewer: (show: boolean) => void;
  imageViewerRef: React.RefObject<HTMLDivElement>;
  sources: Source[];
  selectedSourceId: string | null;
  selectedImageIndex: number;
  navigateImage: (direction: 'prev' | 'next') => void;
  themeStyles: any;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  showImageViewer,
  setShowImageViewer,
  imageViewerRef,
  sources,
  selectedSourceId,
  selectedImageIndex,
  navigateImage,
  themeStyles
}) => {
  // Animation variants
  const modalAnimation = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  // Get current image for image viewer
  const currentImage = () => {
    if (!selectedSourceId || selectedImageIndex === undefined) return null;
    const source = sources.find(s => s.id === selectedSourceId);
    if (!source || !source.pageImages || !source.pageImages.length) return null;
    
    return {
      url: source.pageImages[selectedImageIndex],
      label: source.imageLabels && source.imageLabels[selectedImageIndex] 
          ? source.imageLabels[selectedImageIndex] 
          : `Page ${selectedImageIndex + 1}`,
      source
    };
  };

  return (
    <AnimatePresence>
      {showImageViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <motion.div 
            ref={imageViewerRef}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalAnimation}
            className="relative max-w-4xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden"
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              color: themeStyles.textColor
            }}
          >
            {/* Image viewer header */}
            <div className="p-3 flex justify-between items-center border-b" style={{ borderColor: themeStyles.borderColor }}>
              <div className="flex items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: themeStyles.accentColor }} className="mr-2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <h3 className="font-medium">
                  {currentImage()?.source.fileName || 'Document Image'}
                </h3>
              </div>
              <button
                onClick={() => setShowImageViewer(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Image display */}
            <div className="relative flex-1 overflow-auto bg-gray-900 flex items-center justify-center">
              {currentImage()?.url && (
                <img 
                  src={currentImage()?.url} 
                  alt={currentImage()?.label}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
              
              {/* Navigation controls */}
              <button
                onClick={() => navigateImage('prev')}
                className="absolute left-2 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => navigateImage('next')}
                className="absolute right-2 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            
            {/* Footer with metadata */}
            <div className="p-3 border-t" style={{ borderColor: themeStyles.borderColor }}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">
                    {currentImage()?.label} 
                    {currentImage()?.source.pageImages && (
                      <span className="ml-2 opacity-70">
                        ({selectedImageIndex + 1} of {currentImage()?.source.pageImages?.length ?? 0})
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <a 
                    href={currentImage()?.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1 rounded flex items-center"
                    style={{ 
                      backgroundColor: `${themeStyles.accentColor}10`,
                      color: themeStyles.accentColor
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={14} className="mr-1.5" />
                    Download Image
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ImageViewer;