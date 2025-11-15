import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MessageSquare, X, Minimize2, Maximize2, Send, Bot, UserCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiClient } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { wsClient } from "@/lib/websocket";

// Helper function to format message content
const formatMessageContent = (content: string) => {
  if (!content) return "";
  
  // Replace markdown-style formatting
  let formatted = content
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Code: `text`
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-gray-200 rounded text-xs">$1</code>');
  
  return formatted;
};

interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id?: string | null;
  content: string;
  message_type: string;
  conversation_id?: string | null;
  created_at: string;
  sender_name?: string | null;
  sender_role?: string | null;
  recipient_name?: string | null;
  is_read?: boolean;
  isBot?: boolean;
}

interface Conversation {
  id: string;
  name: string;
  type: "admin" | "chatbot" | "user";
  userId?: string;
}

export function ChatPanel() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [unreadCount] = useState(0); // TODO: Implement unread count logic

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === "ADMIN";

  // Listen for settings open event to auto-minimize chat
  useEffect(() => {
    const handleSettingsOpen = () => {
      setMinimized(true);
    };
    window.addEventListener('settings-opened', handleSettingsOpen);
    return () => window.removeEventListener('settings-opened', handleSettingsOpen);
  }, []);

  // Load initial messages from API
  const loadMessagesFromAPI = useCallback(async () => {
    if (!activeConversation || !user) {
      setMessages([]);
      return;
    }

    // Validation
    if (user.role === "ADMIN") {
      if (activeConversation.type === "chatbot") {
        // OK - admin can use chatbot
      } else if (activeConversation.type === "user" && activeConversation.userId) {
        // OK - admin chat with user
      } else {
        console.warn("[ChatPanel] Invalid conversation type for admin:", activeConversation.type);
        setMessages([]);
        return;
      }
    }

    setLoading(true);
    try {
      let url = "/api/chat/messages";
      const params = new URLSearchParams();

      if (activeConversation.type === "chatbot") {
        params.append("conversation_type", "chatbot");
      } else if (activeConversation.type === "user" && activeConversation.userId) {
        // Admin chatting with specific user
        params.append("user_id", activeConversation.userId);
      } else if (activeConversation.type === "admin") {
        // Regular user chatting with admin - no special params needed
        // Backend will automatically handle admin chat for non-admin users
        // Leave params empty
      } else {
        // Invalid conversation type, don't load
        setMessages([]);
        setLoading(false);
        return;
      }

      if (params.toString()) {
        url += "?" + params.toString();
      }

      const res = await apiFetch<ChatMessage[]>(url);
      
      // Deduplicate messages
      // For user->admin messages, backend creates multiple copies (one per admin recipient)
      // We need to deduplicate by content+timestamp+sender, not just ID
      const seenMessages = new Map<string, ChatMessage>();
      
      res.forEach((msg) => {
        // Create a unique key based on sender, content, and timestamp
        // This handles case where same message sent to multiple admins
        const key = `${msg.sender_id}-${msg.content}-${msg.created_at}`;
        
        // Only keep first occurrence
        if (!seenMessages.has(key)) {
          seenMessages.set(key, msg);
        }
      });
      
      const uniqueMessages = Array.from(seenMessages.values());
      
      // Debug log removed for production
      
      setMessages(uniqueMessages);
    } catch (error: any) {
      // Only log non-401 errors (401 will be handled by apiFetch)
      if (error?.status !== 401) {
        console.error("[ChatPanel] loadMessagesFromAPI error:", error);
      }
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeConversation, user]);

  // Load conversations based on role
  const loadConversations = useCallback(async () => {
    if (!user) return;

    if (isAdmin) {
      // Admin: Load chatbot + users they've chatted with
      try {
        const res = await apiFetch<any[]>("/api/chat/conversations");
        
        // Filter and map user conversations, ensuring userId exists
        const userConvos: Conversation[] = res
          .filter((c) => c.type === "user" && c.userId && c.id) // Only valid user conversations
          .map((c) => ({
            id: c.id || c.userId,
            name: c.name || "Unknown User",
            type: "user" as const,
            userId: c.userId,
          }));

        setConversations([
          { id: "chatbot", name: "AI Chatbot", type: "chatbot" },
          ...userConvos,
        ]);

        // Load all users for search
        const usersRes = await apiFetch<any[]>("/api/users");
        setAllUsers(usersRes);
      } catch (error: any) {
        // Only log non-401 errors (401 will be handled by apiFetch)
        if (error?.status !== 401) {
          console.error("[ChatPanel] loadConversations error:", error);
        }
      }
    } else {
      // Regular user: Admin + Chatbot
      setConversations([
        { id: "admin", name: "Admin", type: "admin" },
        { id: "chatbot", name: "AI Chatbot", type: "chatbot" },
      ]);
    }
  }, [user, isAdmin]);

  // WebSocket connection management
  useEffect(() => {
    if (!user || !open) {
      // Disconnect when not open or no user
      if (wsConnected) {
        wsClient.disconnect();
        setWsConnected(false);
      }
      return;
    }

    const token = getAccessToken();
    if (!token) {
      console.warn("[ChatPanel] No access token, cannot connect WebSocket");
      return;
    }

    // Only connect if not already connected or connecting
    if (wsClient.isConnected()) {
      setWsConnected(true);
      
      // Still need to setup message handler
      const unsubscribe = wsClient.onMessage((data) => {
        // console.log("[ChatPanel] WS message received:", data);
        
        if (data.type === "new_message" || data.type === "message_sent") {
          const msg = data.message;
          
          // console.log("[ChatPanel] Processing message:", {
          //   msgId: msg.id,
          //   msgType: msg.message_type,
          //   senderId: msg.sender_id,
          //   recipientId: msg.recipient_id,
          //   dataType: data.type,
          //   activeConv: activeConversation,
          //   currentUserId: user?.id,
          // });
          
          // IMPORTANT: Prevent duplicate when user sends message
          // - "message_sent" = echo back to sender (SHOW this)
          // - "new_message" = broadcast to recipients (DON'T show if sender is me)
          if (data.type === "new_message" && msg.sender_id === user.id) {
            // console.log("[ChatPanel] Skipping new_message from self (will show message_sent instead)");
            return;
          }
          
          let isRelevant = false;
          
          if (activeConversation) {
            if (activeConversation.type === "chatbot" && msg.message_type === "chatbot") {
              isRelevant = true;
            } else if (activeConversation.type === "user" && activeConversation.userId) {
              isRelevant = 
                msg.sender_id === activeConversation.userId || 
                msg.recipient_id === activeConversation.userId;
            } else if (activeConversation.type === "admin") {
              isRelevant = msg.message_type === "user_chat";
            }
          }
          
          // console.log("[ChatPanel] Message relevance:", isRelevant);
          
          if (isRelevant) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === msg.id);
              if (exists) {
                // console.log("[ChatPanel] Message already exists, skipping");
                return prev;
              }
              // console.log("[ChatPanel] Adding new message to UI");
              return [...prev, msg];
            });
          }
        } else if (data.type === "typing") {
          // Handle typing indicator for real-time chat only
          // console.log("[ChatPanel] User typing:", data);
        }
      });
      
      return () => {
        unsubscribe();
      };
    }

    // Connect to WebSocket
    let isMounted = true;
    
    const connectWs = async () => {
      try {
        await wsClient.connect(token);
        if (isMounted) {
          setWsConnected(true);
          // console.log("[ChatPanel] WebSocket connected");
        }
      } catch (error) {
        if (isMounted) {
          console.error("[ChatPanel] WebSocket connection failed:", error);
          setWsConnected(false);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      // Message handler will be cleaned up from the first block
    };
  }, [user, open, activeConversation]);

  // Load initial messages only once when conversation changes
  useEffect(() => {
    if (activeConversation) {
      setMessages([]); // Clear messages
      loadMessagesFromAPI(); // Load once
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id]); // Only depend on conversation ID

  // Initialize
  useEffect(() => {
    if (open && user) {
      loadConversations();
      
      // Auto-select first conversation (chatbot for both user and admin)
      if (!activeConversation && conversations.length > 0) {
        setActiveConversation(conversations[0]);
      }
    }
  }, [open, user, loadConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message - Chatbot via HTTP, others via WebSocket
  const handleSend = async () => {
    if (!input.trim() || !activeConversation || !user || sending) return;

    const messageText = input.trim();
    setSending(true);
    setInput(""); // Clear input immediately
    
    try {
      if (activeConversation.type === "chatbot") {
        // CHATBOT: Use FastAPI HTTP endpoint (không dùng WebSocket)
        // console.log("[ChatPanel] Sending to chatbot via HTTP...");
        
        // Add user message to UI immediately
        const userMsg: ChatMessage = {
          id: `temp-user-${Date.now()}`,
          sender_id: user.id,
          content: messageText,
          message_type: "chatbot",
          created_at: new Date().toISOString(),
          sender_name: user.ho_ten,
        };
        setMessages(prev => [...prev, userMsg]);

        // Call chatbot API
        const response = await apiClient.sendChatbotMessage(messageText);
        
        // Extract bot response and remove [BOT] prefix if exists
        let botContent = response.data?.bot_response?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
        if (botContent.startsWith("[BOT] ")) {
          botContent = botContent.substring(6);
        }
        
        // Add bot message to UI
        const botMsg: ChatMessage = {
          id: response.data?.bot_response?.id || `temp-bot-${Date.now()}`,
          sender_id: user.id, // Bot uses same sender_id
          content: botContent,
          message_type: "chatbot",
          created_at: response.data?.bot_response?.created_at || new Date().toISOString(),
          isBot: true,
        };
        setMessages(prev => [...prev, botMsg]);
        
      } else {
        // HUMAN CHAT: Use WebSocket
        if (!wsConnected) {
          throw new Error("WebSocket not connected");
        }

        if (activeConversation.type === "user" && activeConversation.userId) {
          // Admin sending to specific user via WebSocket
          wsClient.send({
            type: "chat_message",
            content: messageText,
            recipient_id: activeConversation.userId,
          });
        } else if (activeConversation.type === "admin") {
          // User sending to admin via WebSocket
          wsClient.send({
            type: "chat_message",
            content: messageText,
          });
        }
      }
    } catch (error: any) {
      // Restore input on error
      setInput(messageText);
      toast({
        title: "Lỗi",
        description: error?.message || "Không thể gửi tin nhắn",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Search users (admin only)
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const filtered = allUsers.filter(
      (u) =>
        u.id !== user?.id &&
        u.role !== "ADMIN" &&
        (u.ho_ten.toLowerCase().includes(term.toLowerCase()) ||
          u.email?.toLowerCase().includes(term.toLowerCase()) ||
          u.so_dien_thoai?.includes(term))
    );
    setSearchResults(filtered.slice(0, 10));
  };

  const handleUserSelect = (selectedUser: any) => {
    const newConvo: Conversation = {
      id: selectedUser.id,
      name: selectedUser.ho_ten,
      type: "user",
      userId: selectedUser.id,
    };

    // Check if conversation already exists
    const existing = conversations.find((c) => c.id === selectedUser.id);
    if (!existing) {
      setConversations((prev) => [...prev, newConvo]);
    }

    setActiveConversation(newConvo);
    setSearchTerm("");
    setSearchResults([]);
  };

  if (!user) return null;

  // Parse chatbot messages (they have [BOT] prefix) and ensure unique
  const parseMessages = (msgs: ChatMessage[]) => {
    // First pass: Remove duplicates by ID
    const uniqueById = Array.from(
      new Map(msgs.map((msg) => [msg.id, msg])).values()
    );
    
    // Second pass: Remove duplicates by content+sender+timestamp
    // (handles case where backend creates multiple records with different IDs)
    const seenKeys = new Set<string>();
    const uniqueMsgs = uniqueById.filter((msg) => {
      const key = `${msg.sender_id}-${msg.content}-${msg.created_at}`;
      if (seenKeys.has(key)) {
        console.log('[ChatPanel] Removing duplicate message:', { id: msg.id, key });
        return false;
      }
      seenKeys.add(key);
      return true;
    });
    
    return uniqueMsgs.map((msg) => {
      const isBot = msg.isBot || msg.content?.startsWith("[BOT] ") || false;
      return {
        ...msg,
        content: isBot && msg.content?.startsWith("[BOT] ") 
          ? msg.content.replace("[BOT] ", "") 
          : msg.content,
        isBot,
      };
    });
  };

  const displayMessages = parseMessages(messages);

  return (
    <>
      {/* Chat Bar - Bottom */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-0 right-6 z-[9000] bg-white border border-gray-200 shadow-lg rounded-t-lg px-4 py-3 flex items-center gap-3 hover:shadow-xl transition-shadow"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm">Messaging</span>
          {unreadCount > 0 && (
            <span className="ml-2 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <svg className="ml-8 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      ) : (
        <div className="fixed bottom-0 right-6 z-[9000] w-[400px] bg-white border border-gray-200 shadow-2xl rounded-t-xl flex flex-col" style={{ height: minimized ? '56px' : '500px' }}>
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-sm">Messaging</span>
              <div className={`h-2 w-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-gray-300"}`} />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setMinimized(!minimized)} className="h-7 w-7">
                {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setOpen(false);
                  setActiveConversation(null);
                  setMessages([]);
                  setMinimized(false);
                }}
                className="h-7 w-7"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Content (hidden when minimized) */}
          {!minimized && (
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Conversations - Hide when conversation is selected */}
              {!activeConversation && (
                <div className="w-36 border-r flex flex-col">
                  {/* Search (Admin only) */}
                  {isAdmin && (
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => handleSearch(e.target.value)}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                      {searchResults.length > 0 && (
                        <div className="absolute left-2 right-2 mt-1 border rounded-lg bg-white shadow-xl z-50 max-h-60 overflow-auto">
                          {searchResults.map((u) => (
                            <button
                              key={`search-result-${u.id}`}
                              onClick={() => handleUserSelect(u)}
                              className="w-full text-left px-3 py-2 hover:bg-accent text-xs border-b last:border-0"
                            >
                              <div className="font-medium">{u.ho_ten}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {u.email || u.so_dien_thoai}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conversations List */}
                  <ScrollArea className="flex-1">
                    {conversations.length === 0 ? (
                      <div className="p-2 text-center text-[10px] text-muted-foreground">
                        {isAdmin ? "No conversations" : "Select conversation"}
                      </div>
                    ) : (
                      <div className="p-1">
                        {conversations.map((conv) => (
                          <button
                            key={`conversation-${conv.type}-${conv.id}`}
                            onClick={() => setActiveConversation(conv)}
                            className="w-full text-left px-2 py-2 rounded mb-0.5 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {conv.type === "chatbot" ? (
                                <Bot className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              ) : (
                                <UserCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium truncate">{conv.name}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Right: Messages - Full width when conversation selected */}
              <div className="flex-1 flex flex-col">
                {activeConversation ? (
                  <>
                    {/* Conversation Header with Back Button */}
                    <div className="px-3 py-2 border-b flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveConversation(null)}
                        className="h-7 w-7"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Button>
                      {activeConversation.type === "chatbot" ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : (
                        <UserCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium truncate">{activeConversation.name}</span>
                    </div>

                    {/* Messages Area */}
                    <ScrollArea className="flex-1 px-4 py-3 bg-white">
                      {loading ? (
                        <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
                      ) : displayMessages.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">No messages yet</div>
                      ) : (
                        <div className="space-y-2">
                          {displayMessages.map((msg, index) => {
                            const msgSenderId = String(msg.sender_id || "").trim();
                            const currentUserId = String(user?.id || "").trim();
                            const isBot = msg.isBot || false;
                            
                            // Debug log (remove in production)
                            if (index === 0) {
                              console.log('[ChatPanel] Message render check:', {
                                msgSenderId,
                                currentUserId,
                                isBot,
                                match: msgSenderId === currentUserId
                              });
                            }
                            
                            // Bot messages should always appear on the left
                            const isMe = !isBot && msgSenderId === currentUserId;
                            
                            return (
                              <div
                                key={`message-${msg.id}-${index}`}
                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`px-3 py-2 rounded-2xl max-w-[80%] ${
                                    isMe
                                      ? "bg-gray-800 text-white rounded-br-md"
                                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                                  }`}
                                >
                                  {!isMe && !isBot && msg.sender_name && (
                                    <div className="text-xs font-medium text-gray-600 mb-0.5">
                                      {msg.sender_name}
                                    </div>
                                  )}
                                  {isBot && (
                                    <div className="text-xs font-medium text-gray-600 mb-0.5 flex items-center gap-1">
                                      <Bot className="h-3 w-3" />
                                      AI Chatbot
                                    </div>
                                  )}
                                  <div 
                                    className="text-sm leading-relaxed break-words"
                                    style={{ whiteSpace: 'pre-line' }}
                                    dangerouslySetInnerHTML={{ 
                                      __html: formatMessageContent(msg.content) 
                                    }}
                                  />
                                  <div className={`text-[10px] mt-0.5 ${
                                    isMe ? "text-gray-300" : "text-gray-500"
                                  }`}>
                                    {new Date(msg.created_at).toLocaleTimeString(
                                      "vi-VN",
                                      { hour: "2-digit", minute: "2-digit" }
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {/* Message Input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="px-3 py-3 border-t bg-white"
                    >
                      <div className="flex gap-2">
                        <Input
                          ref={inputRef}
                          placeholder={wsConnected ? "Type your message..." : "Connecting..."}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={sending || !wsConnected}
                          className="flex-1 bg-gray-50 border-gray-200 rounded-lg"
                          onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        disabled={sending || !input.trim() || !wsConnected}
                        size="icon"
                        className="rounded-lg bg-blue-600 hover:bg-blue-700"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Select a conversation
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
