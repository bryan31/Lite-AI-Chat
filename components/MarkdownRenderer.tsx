import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Pre-process content to handle base64 images cleanly if they are raw text (fallback)
  // But usually we render them via standard markdown image syntax provided by service
  
  return (
    <div className="markdown-content text-sm md:text-base break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
            // Override link to open in new tab
            a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
            // Style code blocks
            code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match && !String(children).includes('\n');
                return !isInline ? (
                  <code className={`${className} rounded-md block`} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-pink-600 dark:text-pink-400 font-mono text-sm" {...props}>
                    {children}
                  </code>
                );
            }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
