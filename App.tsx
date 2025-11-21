
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { generateChatStream } from './services/geminiService';
import { saveImageToDB } from './services/imageDb';
import { ChatSession, Message, Role, Theme, GroundingSource } from './types';
import { ImageWithLoader } from './components/ImageWithLoader';
import { 
  Send, 
  Menu, 
  Image as ImageIcon, 
  Globe, 
  Moon, 
  Sun,
  Paperclip,
  Sparkles
} from 'lucide-react';

// Local Storage Keys
const STORAGE_KEY_THEME = 'gemini-pro-theme';
const STORAGE_KEY_HISTORY = 'gemini-pro-history';

const App: React.FC = () => {
  // --- State ---
  const [theme, setTheme] = useState<Theme>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Config State
  const [isImageMode, setIsImageMode] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);

  // Attachments
  // Note: We keep current attachment as Base64 (or ID) in state for preview, 
  // but persist to DB when sending.
  const [attachedImage, setAttachedImage] = useState<string | null>(null); 

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Effects ---

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 256)}px`;
    }
  }, [inputValue]);

  // Load initial state
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as Theme;
    if (savedTheme) setTheme(savedTheme);

    try {
      const savedSessions = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      } else {
        createNewSession();
      }
    } catch (e) {
      console.error("Failed to load sessions:", e);
      createNewSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist Theme
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Persist Sessions
  useEffect(() => {
    if (sessions.length > 0) {
      try {
        // Now we can safely save full session objects because images are just IDs strings
        const json = JSON.stringify(sessions);
        localStorage.setItem(STORAGE_KEY_HISTORY, json);
      } catch (e) {
        console.error("Error saving history:", e);
      }
    }
  }, [sessions]);

  // Auto-scroll
  useEffect(() => {
    if (isLoading) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessions, isLoading]);

  // --- Handlers ---

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      updatedAt: Date.now(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsImageMode(false);
    setAttachedImage(null);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    
    if (currentSessionId === id) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: 'New Chat',
            updatedAt: Date.now(),
            messages: []
        };
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            // We keep base64 in state for instant preview, but send to DB on submit
            setAttachedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleImageEditRequest = (imageId: string) => {
      // We set the ID directly. The input preview component handles IDs too.
      setAttachedImage(imageId);
      setIsImageMode(true);
      if (textareaRef.current) textareaRef.current.focus();
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && !attachedImage) || isLoading || !currentSessionId) return;

    const currentPrompt = inputValue;
    const tempImage = attachedImage; // This could be Base64 or an ID
    
    setInputValue('');
    setAttachedImage(null);
    setIsLoading(true);

    let persistedImageId: string | undefined = undefined;
    
    // If there is an image attached...
    if (tempImage) {
        try {
             // If it's Base64 (new upload), save to DB and get ID. 
             // If it's already an ID (from edit click), saveImageToDB returns it as is.
             persistedImageId = await saveImageToDB(tempImage);
        } catch (e) {
            console.error("Failed to save input image to DB", e);
        }
    }

    // Create User Message with ID only
    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: currentPrompt || (isImageMode ? "Generate image" : "Sent an image"),
      timestamp: Date.now(),
      images: persistedImageId ? [persistedImageId] : undefined
    };

    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const title = session.messages.length === 0 
            ? (currentPrompt.slice(0, 30) || "Image Generation") 
            : session.title;
            
        return {
          ...session,
          title,
          messages: [...session.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return session;
    }));

    const currentSession = sessions.find(s => s.id === currentSessionId);
    // For the context sent to API, we pass the ID. The service handles resolution.
    const history = currentSession ? [...currentSession.messages, userMsg] : [userMsg];

    const assistantMsgId = (Date.now() + 1).toString();
    let assistantText = "";

    setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [...session.messages, {
                id: assistantMsgId,
                role: Role.MODEL,
                text: "",
                timestamp: Date.now(),
            }]
          };
        }
        return session;
      }));

    await generateChatStream(
        history,
        currentPrompt,
        persistedImageId || null, 
        { imageMode: isImageMode, webSearch: isWebSearch },
        (textChunk, grounding, generatedImageId) => {
            assistantText = textChunk;

            setSessions(prev => prev.map(session => {
                if (session.id === currentSessionId) {
                    return {
                        ...session,
                        messages: session.messages.map(m => {
                            if (m.id === assistantMsgId) {
                                return {
                                    ...m,
                                    text: assistantText,
                                    groundingSources: grounding,
                                    generatedImage: generatedImageId // This is now an ID from the service
                                };
                            }
                            return m;
                        })
                    };
                }
                return session;
            }));
        }
    );

    setIsLoading(false);
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
      
      <Sidebar 
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={createNewSession}
        onSelectChat={setCurrentSessionId}
        onDeleteChat={deleteSession}
      />

      <div className="flex-1 flex flex-col h-full relative w-full transition-all duration-300">
        
        <div className="h-14 md:h-16 flex items-center justify-between px-4 sticky top-0 z-10 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300">
                    <Menu size={20} />
                </button>
                <div className="flex items-center gap-2 px-2 group cursor-default">
                     <span className={`text-lg font-semibold ${isImageMode ? 'text-purple-500' : 'text-gray-700 dark:text-gray-200'}`}>
                        {isImageMode ? 'Nano Banana' : 'Gemini 3.0'}
                    </span>
                    <span className="text-gray-400 dark:text-gray-600">/</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px] md:max-w-[300px]">
                        {currentSession?.title || 'New Chat'}
                    </span>
                </div>
            </div>
            
            <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth">
            {currentSession?.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-100 space-y-8 px-4 pb-20">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 blur-2xl opacity-10 rounded-full group-hover:opacity-20 transition-opacity duration-1000"></div>
                        <div className="relative w-16 h-16 bg-white dark:bg-surface-variant-dark rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700">
                            <Sparkles size={32} className="text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-purple-600 fill-blue-500/10" stroke="url(#gradient-main)" />
                            <svg width="0" height="0">
                                <linearGradient id="gradient-main" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop stopColor="#3b82f6" offset="0%" />
                                    <stop stopColor="#9333ea" offset="100%" />
                                </linearGradient>
                            </svg>
                        </div>
                    </div>
                    <div className="text-center max-w-lg">
                        <h3 className="text-2xl font-medium mb-3 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-400">
                            Hello, Human
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                            I can help you reason through complex problems, code efficiently, or generate creative images using Nano Banana.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                         <button 
                            onClick={() => setInputValue("Explain quantum computing in simple terms")}
                            className="p-4 text-left bg-gray-50 dark:bg-[#1e1f20] hover:bg-gray-100 dark:hover:bg-[#2e2f31] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                         >
                            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 group-hover:text-blue-500 transition-colors">Quantum Computing</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-500">Explain it like I'm five</span>
                         </button>
                         <button 
                             onClick={() => {
                                 setIsImageMode(true);
                                 setInputValue("Create a cyberpunk city landscape");
                             }}
                             className="p-4 text-left bg-gray-50 dark:bg-[#1e1f20] hover:bg-gray-100 dark:hover:bg-[#2e2f31] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                         >
                            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 group-hover:text-purple-500 transition-colors">Cyberpunk Art</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-500">Generate with Nano Banana</span>
                         </button>
                    </div>
                </div>
            ) : (
                <div className="pb-40 pt-2">
                    {currentSession?.messages.map(msg => (
                        <MessageItem 
                            key={msg.id} 
                            message={msg} 
                            onEditImage={handleImageEditRequest}
                        />
                    ))}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface-light via-surface-light to-transparent dark:from-surface-dark dark:via-surface-dark pt-12">
            <div className="max-w-3xl mx-auto">
                
                {/* Input Container */}
                <div className={`
                    relative group rounded-[28px] 
                    bg-[#f0f4f9] dark:bg-[#1e1f20]
                    focus-within:bg-white dark:focus-within:bg-[#1e1f20] 
                    focus-within:shadow-md
                    transition-all duration-200
                    ${isImageMode ? 'ring-1 ring-purple-500/20' : ''}
                `}>
                    
                    {attachedImage && (
                        <div className="px-4 pt-4">
                            <ImageWithLoader 
                                src={attachedImage} 
                                onRemove={() => setAttachedImage(null)}
                                className="h-16 w-16 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                            />
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        id="chat-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={isImageMode 
                            ? (attachedImage ? "Describe how to modify this image..." : "Describe the image you want to create...") 
                            : "Ask Gemini..."}
                        className="w-full bg-transparent border-0 outline-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none py-4 px-6 min-h-[56px] max-h-64"
                        rows={1}
                        style={{ overflow: 'hidden' }} 
                    />

                    <div className="flex items-center justify-between px-3 pb-3">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="Attach Image"
                            >
                                <Paperclip size={18} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            
                            <button 
                                onClick={() => setIsImageMode(!isImageMode)}
                                className={`p-2 rounded-full transition-colors ${isImageMode ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'} ${isImageMode ? 'relative z-10' : ''}`}
                                title={isImageMode ? "Image Mode On" : "Image Mode Off"}
                            >
                                <ImageIcon size={18} />
                            </button>
                            
                            <button 
                                onClick={() => setIsWebSearch(!isWebSearch)}
                                disabled={isImageMode}
                                className={`p-2 rounded-full transition-colors ${isWebSearch ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'} ${isImageMode ? 'opacity-30 cursor-not-allowed' : ''}`}
                                title="Web Search"
                            >
                                <Globe size={18} />
                            </button>
                        </div>

                        <button 
                            onClick={sendMessage}
                            disabled={(!inputValue.trim() && !attachedImage) || isLoading}
                            className={`
                                p-2 rounded-full flex items-center justify-center transition-all duration-200
                                ${inputValue.trim() || attachedImage
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 shadow-md' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'}
                            `}
                        >
                            {isLoading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                            <Send size={18} className={inputValue.trim() ? "ml-0.5" : ""} />
                            )}
                        </button>
                    </div>
                </div>
                <div className="text-center mt-3 text-[11px] text-gray-400 dark:text-gray-600">
                    Gemini may display inaccurate info, including about people, so double-check its responses.
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;
