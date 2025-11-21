
import React, { useState, useEffect } from 'react';
import { getImageFromDB } from '../services/imageDb';

interface ImageWithLoaderProps {
  src: string; // Can be a Base64 string (legacy) or an ID (img_...)
  alt?: string;
  className?: string;
  onRemove?: () => void;
}

export const ImageWithLoader: React.FC<ImageWithLoaderProps> = ({ src, alt, className, onRemove }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        setLoading(true);
        let data = src;

        // If it looks like an ID, fetch from DB
        if (src.startsWith('img_')) {
          const fromDb = await getImageFromDB(src);
          if (fromDb) {
            data = fromDb;
          } else {
            throw new Error("Image not found in DB");
          }
        }

        if (!active) return;

        // Convert Base64 to Blob URL for performance
        const res = await fetch(data);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        
        if (active) {
          setImageSrc(objectUrl);
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load image:", e);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (error) {
    return (
        <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs ${className}`} style={{minHeight: '100px'}}>
            Image not found
            {onRemove && (
                <button onClick={onRemove} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">x</button>
            )}
        </div>
    );
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className}`} style={{minHeight: '150px'}} />
    );
  }

  return (
    <div className="relative inline-block group/img">
        <img 
            src={imageSrc || ''} 
            alt={alt || "Image"} 
            className={className} 
        />
        {onRemove && (
            <button 
                onClick={onRemove}
                className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md z-10"
            >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        )}
    </div>
  );
};
