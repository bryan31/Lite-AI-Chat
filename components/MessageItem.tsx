
import React, { useState } from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { User, Sparkles, Image as ImageIcon, Copy, RotateCcw } from 'lucide-react';
import { ImageWithLoader } from './ImageWithLoader';

interface MessageItemProps {
  message: Message;
  onEditImage?: (imageId: string) => void;
}

const LoadingDots = () => (
    <div className="flex items-center space-x-1 h-6">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-1"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-2"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-3"></div>
    </div>
);

export const MessageItem: React.FC<MessageItemProps> = ({ message, onEditImage }) => {
  const isUser = message.role === Role.USER;
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const isTrulyLoading = !isUser && !message.text && !message.generatedImage && !message.isError;

  return (
    <div className="w-full py-6 md:py-8 animate-fade-in group">
      <div className="max-w-3xl mx-auto flex gap-4 md:gap-6 px-4 md:px-0">
        
        {/* Avatar Column */}
        <div className="flex-shrink-0 pt-1">
            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shadow-sm
                ${isUser 
                    ? 'bg-gray-200 dark:bg-gray-700' 
                    : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500'}
            `}>
                {isUser ? (
                    <User size={16} className="text-gray-600 dark:text-gray-300" />
                ) : (
                    <Sparkles size={16} className="text-white" />
                )}
            </div>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0 space-y-1">
            {/* Header Name */}
            <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {isUser ? '你' : 'Gemini'}
                </span>
            </div>

            {/* User Input Images */}
            {message.images && message.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {message.images.map((imgId, idx) => (
                         <ImageWithLoader 
                            key={idx} 
                            src={imgId} 
                            className="rounded-xl shadow-sm max-w-[200px] md:max-w-xs border border-gray-200 dark:border-gray-700 mb-3"
                         />
                    ))}
                </div>
            )}

            {/* Loading State (Three Dots) - Only show if absolutely nothing is happening yet */}
            {isTrulyLoading && (
                <div className="py-2">
                    <LoadingDots />
                </div>
            )}

            {/* Main Text Content */}
            {message.text && (
                <div className={`prose-sm md:prose-base w-full text-gray-800 dark:text-gray-200 ${isUser ? 'text-gray-800 dark:text-gray-100' : ''}`}>
                    <MarkdownRenderer content={message.text} />
                </div>
            )}

            {/* Generated Image Content */}
            {message.generatedImage && (
                <div className="mt-4">
                    <ImageWithLoader 
                        src={message.generatedImage} 
                        className="rounded-xl shadow-md max-w-full md:max-w-md border border-gray-200 dark:border-gray-700"
                    />
                </div>
            )}

            {/* Grounding / Sources */}
            {message.groundingSources && message.groundingSources.length > 0 && (
                <div className="pt-3 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {message.groundingSources.map((source, idx) => (
                            <a 
                                key={idx}
                                href={source.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="
                                    flex items-center gap-3 bg-gray-50 dark:bg-[#1e1f20] 
                                    border border-gray-200 dark:border-gray-700 
                                    hover:bg-gray-100 dark:hover:bg-[#2e2f31]
                                    px-3 py-2 rounded-lg transition-colors
                                "
                            >
                                <div className="bg-white dark:bg-black p-1 rounded border border-gray-200 dark:border-gray-700">
                                    <GlobeIcon />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                        {source.title}
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate">
                                        {new URL(source.uri).hostname}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Actions */}
            {!isUser && !isTrulyLoading && (
                <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                        onClick={handleCopy}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#1e1f20] transition-colors"
                        title="复制"
                    >
                        <Copy size={14} />
                        {copied && <span className="ml-1 text-xs text-green-500">已复制</span>}
                    </button>
                    
                    <button 
                         className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-[#1e1f20] transition-colors"
                         title="重新生成 (模拟)"
                    >
                        <RotateCcw size={14} />
                    </button>

                    {message.generatedImage && onEditImage && (
                        <button 
                            onClick={() => {
                                if (message.generatedImage) onEditImage(message.generatedImage);
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors ml-2"
                        >
                            <ImageIcon size={12} />
                            编辑图片
                        </button>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

const GlobeIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
);