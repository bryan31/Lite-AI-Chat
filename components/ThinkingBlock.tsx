
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isStreaming = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Auto-open only if it's the very start and user hasn't toggled it (optional behavior, 
  // currently we default to closed as requested "user can click to open")

  return (
    <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50/50 dark:bg-[#1a1b1e]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Brain size={14} className={isStreaming ? "text-purple-500 animate-pulse" : "text-gray-500"} />
        <span>
          {isStreaming ? "正在思考..." : "思考过程"}
        </span>
        {content && !isOpen && (
           <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[150px]">
             {content.slice(0, 30)}...
           </span>
        )}
      </button>
      
      {isOpen && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1f20]">
          <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
             {content}
             {isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-purple-500 animate-pulse"/>}
          </div>
        </div>
      )}
    </div>
  );
};
