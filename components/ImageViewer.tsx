
import React, { useEffect } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';
import { ImageWithLoader } from './ImageWithLoader';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, onClose }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownload = async () => {
    try {
        // If it's a base64 string or internal ID handled by ImageWithLoader,
        // we might need to resolve it first, but usually the src passed here 
        // is what we want to save. For simplicity, we try to fetch it.
        // Since src might be an ID (img_...), we rely on ImageWithLoader logic usually,
        // but for download we create a link.
        // If src is base64:
        let downloadHref = src;
        
        // If it's an ID, we rely on the fact that we can't easily download from ID here 
        // without async fetching from DB.
        // A simple workaround for this UI: The ImageWithLoader inside handles display.
        // For download, if it's not base64/http, we might disable or need complex logic.
        // For now, let's assume if it starts with data:, we can download.
        if (src.startsWith('data:')) {
            const link = document.createElement('a');
            link.href = src;
            link.download = `gemini-image-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (e) {
        console.error("Download failed", e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-end items-center gap-4 z-[101]">
        {src.startsWith('data:') && (
            <button 
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="下载图片"
            >
                <Download size={20} />
            </button>
        )}
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Image Container */}
      <div 
        className="relative max-w-[95vw] max-h-[95vh] p-2"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
      >
        <ImageWithLoader 
          src={src} 
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          alt="Full view"
        />
      </div>
    </div>
  );
};
