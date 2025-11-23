import React from 'react';
import { Plus, MessageSquare, Trash2, Menu, X } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string, e: React.MouseEvent) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectChat,
  onDeleteChat
}) => {
  // Use config from env or default
  const meta = import.meta as any;
  const appTitle = meta.env?.VITE_APP_TITLE || 'Gemini Pro';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-gray-50 dark:bg-[#1e1f20] border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100 font-semibold text-lg tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">{appTitle}</span>
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 mb-4">
          <button
            onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) toggleSidebar();
            }}
            className="w-full flex items-center gap-3 bg-gray-200 dark:bg-[#2e2f31] hover:bg-gray-300 dark:hover:bg-[#3c3d40] text-gray-700 dark:text-gray-200 px-4 py-3 rounded-full transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            <span>新对话</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">最近对话</div>
          {sessions.length === 0 && (
             <div className="px-4 py-4 text-sm text-gray-400 text-center italic">暂无历史记录</div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                  onSelectChat(session.id);
                  if (window.innerWidth < 768) toggleSidebar();
              }}
              className={`
                group flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-sm transition-colors
                ${currentSessionId === session.id 
                    ? 'bg-blue-100 dark:bg-[#004a77] text-blue-900 dark:text-blue-100' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2e2f31]'}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className="flex-shrink-0" />
                <span className="truncate">{session.title}</span>
              </div>
              <button
                onClick={(e) => onDeleteChat(session.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};