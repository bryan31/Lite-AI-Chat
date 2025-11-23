
import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { ImageViewer } from './components/ImageViewer';
import { generateChatStream } from './services/geminiService';
import { saveImageToDB } from './services/imageDb';
import { ChatSession, Message, Role, Theme, MODELS } from './types';
import { ImageWithLoader } from './components/ImageWithLoader';
import { 
  Send, 
  PanelLeft, 
  Image as ImageIcon, 
  Globe, 
  Moon, 
  Sun,
  Paperclip,
  Sparkles,
  ChevronDown,
  Code2,
  Plane,
  PenTool,
  X as XIcon
} from 'lucide-react';

// Local Storage Keys
const STORAGE_KEY_THEME = 'gemini-pro-theme';
const STORAGE_KEY_HISTORY = 'gemini-pro-history';

const App: React.FC = () => {
  // --- State ---
  const [theme, setTheme] = useState<Theme>('dark');
  // Default sidebar to OPEN (true) for better desktop experience
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Config State
  const [isImageMode, setIsImageMode] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  
  // Model Selection State
  const [selectedModel, setSelectedModel] = useState<string>(MODELS.GEMINI_3_PRO);

  // Effective Model Calculation
  const effectiveModel = isImageMode ? MODELS.GEMINI_IMAGE : selectedModel;

  // Attachments (Now supports multiple)
  const [attachedImages, setAttachedImages] = useState<string[]>([]); 
  
  // Image Viewer State
  const [viewImage, setViewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Track IME composition state (for Chinese/Japanese input)
  const isComposing = useRef(false);

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
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
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
      title: '新对话',
      updatedAt: Date.now(),
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsImageMode(false);
    setAttachedImages([]);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.focus();
    // On mobile, close sidebar after creating new chat
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    
    if (currentSessionId === id) {
      if (remaining.length > 0) {
        setCurrentSessionId(remaining[0].id);
      } else {
        // Create new session if all deleted
        const newSession: ChatSession = {
            id: Date.now().toString(),
            title: '新对话',
            updatedAt: Date.now(),
            messages: []
        };
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileReaders: Promise<string>[] = [];
    
    Array.from(files).forEach(file => {
        const p = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
        fileReaders.push(p);
    });

    Promise.all(fileReaders).then(newImages => {
        setAttachedImages(prev => [...prev, ...newImages]);
        // Reset input to allow selecting same file again
        if (fileInputRef.current) fileInputRef.current.value = '';
    });
  };

  const removeAttachedImage = (index: number) => {
      setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageEditRequest = (imageId: string) => {
      setAttachedImages([imageId]);
      setIsImageMode(true);
      if (textareaRef.current) textareaRef.current.focus();
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && attachedImages.length === 0) || isLoading) return;
    
    // 1. Determine Session ID and History Context
    let activeSessionIdToUse = currentSessionId;
    let historyForApi: Message[] = [];

    // Handle "New Chat" or "No Session Selected" case explicitly before async ops
    if (!activeSessionIdToUse) {
        if (sessions.length > 0) {
            // Fallback to first available session
            activeSessionIdToUse = sessions[0].id;
            historyForApi = sessions[0].messages;
            setCurrentSessionId(activeSessionIdToUse);
        } else {
            // Create a brand new session
            const newSessionId = Date.now().toString();
            const newSession: ChatSession = {
                id: newSessionId,
                title: '新对话',
                updatedAt: Date.now(),
                messages: []
            };
            // We set state here, but we also need to use the local object for immediate logic
            setSessions([newSession]);
            activeSessionIdToUse = newSessionId;
            historyForApi = []; // New session has no history
            setCurrentSessionId(activeSessionIdToUse);
        }
    } else {
        // Retrieve existing history from state
        const session = sessions.find(s => s.id === activeSessionIdToUse);
        historyForApi = session ? session.messages : [];
    }

    const currentPrompt = inputValue;
    const tempImages = [...attachedImages]; 
    
    // Clear UI immediately
    setInputValue('');
    setAttachedImages([]);
    setIsLoading(true);

    // Define ID here so it's available in try and catch blocks
    const assistantMsgId = (Date.now() + 1).toString();

    try {
        const persistedImageIds: string[] = [];
        
        // 1. Persist Images if exists
        if (tempImages.length > 0) {
            try {
                 for (const img of tempImages) {
                    const id = await saveImageToDB(img);
                    persistedImageIds.push(id);
                 }
            } catch (e) {
                console.error("Failed to save input images to DB", e);
                alert("处理图片失败，请重试。");
                setIsLoading(false);
                return;
            }
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: Role.USER,
            text: currentPrompt || (isImageMode ? "生成图片" : (tempImages.length > 0 ? "发送了图片" : "发送内容")),
            timestamp: Date.now(),
            images: persistedImageIds.length > 0 ? persistedImageIds : undefined
        };

        const assistantPlaceholder: Message = {
            id: assistantMsgId,
            role: Role.MODEL,
            text: "",
            timestamp: Date.now()
        };

        // 2. Update Session State (User + Placeholder)
        setSessions(prev => prev.map(session => {
            if (session.id === activeSessionIdToUse) {
                const title = session.messages.length === 0 
                    ? (currentPrompt.slice(0, 30) || "新对话") 
                    : session.title;
                
                return {
                    ...session,
                    title,
                    messages: [...session.messages, userMsg, assistantPlaceholder],
                    updatedAt: Date.now()
                };
            }
            return session;
        }));

        // 3. Call API
        await generateChatStream(
            historyForApi,
            currentPrompt,
            persistedImageIds, 
            effectiveModel, 
            { imageMode: isImageMode, webSearch: isWebSearch },
            (textChunk, grounding, generatedImageId) => {
                setSessions(prev => prev.map(session => {
                    if (session.id === activeSessionIdToUse) {
                        return {
                            ...session,
                            messages: session.messages.map(m => {
                                if (m.id === assistantMsgId) {
                                    return {
                                        ...m,
                                        text: textChunk,
                                        groundingSources: grounding,
                                        generatedImage: generatedImageId 
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

    } catch (error: any) {
        console.error("Send Message Error:", error);
        // Don't alert, just show in chat
        setSessions(prev => prev.map(session => {
            if (session.id === activeSessionIdToUse) {
                const lastMsg = session.messages[session.messages.length - 1];
                // Ensure we are updating the placeholder we just created
                if (lastMsg.role === Role.MODEL && lastMsg.id === assistantMsgId) {
                    return {
                        ...session,
                        messages: session.messages.map(m => 
                            m.id === lastMsg.id ? { ...m, text: `错误: ${error.message || "请求失败"}。请重试。`, isError: true } : m
                        )
                    };
                }
            }
            return session;
        }));
    } finally {
        setIsLoading(false);
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
      
      {/* Lightbox / Image Viewer */}
      {viewImage && (
        <ImageViewer 
            src={viewImage} 
            onClose={() => setViewImage(null)} 
        />
      )}

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
        
        <div className="h-14 md:h-16 flex items-center justify-between px-4 sticky top-0 z-10 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/50">
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300"
                    title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
                >
                    <PanelLeft size={20} />
                </button>
                
                {/* Model Selector */}
                <div className="relative">
                    <select
                        value={effectiveModel}
                        onChange={(e) => {
                            if (!isImageMode) setSelectedModel(e.target.value);
                        }}
                        disabled={isImageMode}
                        className={`
                            appearance-none bg-transparent font-semibold text-sm md:text-base
                            pr-8 pl-2 py-1 rounded-md cursor-pointer focus:outline-none
                            ${isImageMode 
                                ? 'text-purple-600 dark:text-purple-400 opacity-90' 
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}
                        `}
                    >
                        <option value={MODELS.GEMINI_3_PRO}>Gemini 3.0 Pro</option>
                        <option value={MODELS.GEMINI_2_5_PRO}>Gemini 2.5 Pro</option>
                        <option value={MODELS.GEMINI_2_5_FLASH}>Gemini 2.5 Flash</option>
                        {isImageMode && (
                            <option value={MODELS.GEMINI_IMAGE}>Nano Banana (绘图)</option>
                        )}
                    </select>
                    <ChevronDown 
                        size={14} 
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none ${isImageMode ? 'text-purple-500' : 'text-gray-500'}`}
                    />
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
                            很高兴见到你
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                            我可以帮你解决复杂问题，或者创造惊艳的视觉作品。
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                         {/* Example 1: Creative Writing */}
                         <button 
                             onClick={() => {
                                 setIsImageMode(false);
                                 setInputValue("帮我写一个关于时间旅行的科幻故事");
                             }}
                             className="p-4 text-left bg-gray-50 dark:bg-[#1e1f20] hover:bg-gray-100 dark:hover:bg-[#2e2f31] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                         >
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 group-hover:text-blue-500 transition-colors">
                                <PenTool size={16} /> 创意写作
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-500">帮我写一个关于时间旅行的科幻故事</span>
                         </button>

                         {/* Example 2: Coding */}
                         <button 
                             onClick={() => {
                                 setIsImageMode(false);
                                 setInputValue("用 React 写一个简单的待办事项列表组件");
                             }}
                             className="p-4 text-left bg-gray-50 dark:bg-[#1e1f20] hover:bg-gray-100 dark:hover:bg-[#2e2f31] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                         >
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 group-hover:text-blue-500 transition-colors">
                                <Code2 size={16} /> 代码生成
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-500">用 React 写一个简单的待办事项列表组件</span>
                         </button>

                         {/* Example 3: Image Generation */}
                         <button 
                             onClick={() => {
                                 setIsImageMode(true);
                                 setInputValue("生成一张赛博朋克风格的城市夜景图");
                             }}
                             className="p-4 text-left bg-gray-50 dark:bg-[#1e1f20] hover:bg-gray-100 dark:hover:bg-[#2e2f31] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                         >
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 group-hover:text-purple-500 transition-colors">
                                <ImageIcon size={16} /> 图像创作
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-500">生成一张赛博朋克风格的城市夜景图</span>
                         </button>

                         {/* Example 4: Planning */}
                         <button 
                             onClick={() => {
                                 setIsImageMode(false);
                                 setInputValue("制定一个去日本京都的5天旅游攻略");
                             }}
                             className="p-4 text-left bg-gray-50 dark:bg-[#1e1f20] hover:bg-gray-100 dark:hover:bg-[#2e2f31] rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all group"
                         >
                            <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 group-hover:text-blue-500 transition-colors">
                                <Plane size={16} /> 旅游计划
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-500">制定一个去日本京都的5天旅游攻略</span>
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
                            onImageClick={(src) => setViewImage(src)}
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
                    
                    {/* Attached Images List */}
                    {attachedImages.length > 0 && (
                        <div className="px-4 pt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                            {attachedImages.map((img, idx) => (
                                <div key={idx} className="relative flex-shrink-0 group/preview">
                                    <ImageWithLoader 
                                        src={img} 
                                        className="h-16 w-16 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                                    />
                                    <button 
                                        onClick={() => removeAttachedImage(idx)}
                                        className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 opacity-0 group-hover/preview:opacity-100 transition-opacity shadow-sm"
                                    >
                                        <XIcon size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        id="chat-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        // --- IME Handling Start ---
                        onCompositionStart={() => { isComposing.current = true; }}
                        onCompositionEnd={() => { isComposing.current = false; }}
                        // --- IME Handling End ---
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                // If using IME (Input Method Editor), do not send
                                // Check both our ref and the native event property for maximum compatibility
                                if (isComposing.current || e.nativeEvent.isComposing) {
                                    return;
                                }
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder={isImageMode 
                            ? (attachedImages.length > 0 ? "描述如何修改这张图片..." : "描述你想生成的图片...") 
                            : "问点什么..."}
                        className="w-full bg-transparent border-0 outline-none focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none py-4 px-6 min-h-[56px] max-h-64"
                        rows={1}
                        style={{ overflow: 'hidden' }} 
                    />

                    <div className="flex items-center justify-between px-3 pb-3">
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="上传图片"
                            >
                                <Paperclip size={18} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept="image/*"
                                multiple
                                onChange={handleFileUpload}
                            />
                            
                            <button 
                                onClick={() => setIsImageMode(!isImageMode)}
                                className={`p-2 rounded-full transition-colors ${isImageMode ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'} ${isImageMode ? 'relative z-10' : ''}`}
                                title={isImageMode ? "关闭绘图模式" : "开启绘图模式"}
                            >
                                <ImageIcon size={18} />
                            </button>
                            
                            <button 
                                onClick={() => setIsWebSearch(!isWebSearch)}
                                disabled={isImageMode}
                                className={`p-2 rounded-full transition-colors ${isWebSearch ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'} ${isImageMode ? 'opacity-30 cursor-not-allowed' : ''}`}
                                title="联网搜索"
                            >
                                <Globe size={18} />
                            </button>
                        </div>

                        <button 
                            onClick={sendMessage}
                            disabled={(!inputValue.trim() && attachedImages.length === 0) || isLoading}
                            className={`
                                p-2 rounded-full flex items-center justify-center transition-all duration-200
                                ${inputValue.trim() || attachedImages.length > 0
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
                    Gemini 可能会显示不准确的信息（包括人物信息），请核对回复内容。
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;
