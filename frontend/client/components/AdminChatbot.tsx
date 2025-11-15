import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { getAccessToken } from "@/lib/auth";
import {
  MessageSquare,
  Send,
  User,
  Bot,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ChatDirection = "admin" | "user" | "other" | "bot";

interface AdminMessage {
  id: string;
  from: ChatDirection;
  text: string;
  timestamp: number;
  senderId?: string | null;
  senderName?: string | null;
}

interface BotMessage {
  id: string;
  from: "user" | "bot";
  text: string;
  timestamp: number;
}

interface AdminChatbotProps {
  users: any[];
}

export function AdminChatbot({ users }: AdminChatbotProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"admin" | "bot">("admin");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [botMessages, setBotMessages] = useState<BotMessage[]>([]);

  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const adminMessagesEndRef = useRef<HTMLDivElement>(null);
  const botMessagesEndRef = useRef<HTMLDivElement>(null);

  const filteredUsers = useMemo(
    () => users.filter((u) => u.role !== "ADMIN"),
    [users],
  );

  const scrollToBottom = useCallback(() => {
    if (activeTab === "admin") {
      adminMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      botMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTab]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, adminMessages, botMessages]);

  useEffect(() => {
    if (selectedUserId) {
      const user = filteredUsers.find((u) => u.id === selectedUserId);
      setSelectedUser(user || null);
    } else {
      setSelectedUser(null);
    }
  }, [selectedUserId, filteredUsers]);

  // Load admin messages from API
  const loadAdminMessages = useCallback(async () => {
    if (!selectedUserId) {
      setAdminMessages([]);
      return;
    }

    setLoadingMessages(true);
    try {
      const data = await apiFetch<any[]>(`/api/chat/messages?user_id=${selectedUserId}`);
      
      // Remove duplicates by id
      const uniqueData = Array.from(
        new Map(data.map((item: any) => [item.id, item])).values()
      );
      
      const mapped = uniqueData.map((item: any): AdminMessage => {
        const senderId = item.sender_id || item.senderId || null;
        const createdAt = new Date(item.created_at || item.createdAt);
        let from: ChatDirection = "other";

        // Ensure proper comparison
        const senderIdStr = String(senderId || "");
        const currentUserIdStr = String(currentUser?.id || "");
        const selectedUserIdStr = String(selectedUserId || "");

        if (senderIdStr === currentUserIdStr) {
          from = "admin";
        } else if (senderIdStr === selectedUserIdStr) {
          from = "user";
        } else if (!senderId) {
          from = "bot";
        }

        return {
          id: item.id,
          from,
          text: item.content,
          timestamp: createdAt.getTime(),
          senderId,
          senderName: item.sender_name || item.senderName || null,
        };
      });
      setAdminMessages(mapped);
    } catch (error) {
      console.error("[AdminChatbot] loadAdminMessages error:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải tin nhắn. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedUserId, currentUser?.id, toast]);

  // Load chatbot messages from API
  const loadBotMessages = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>("/api/chat/chatbot");
      
      // Remove duplicates by id
      const uniqueData = Array.from(
        new Map(data.map((item: any) => [item.id, item])).values()
      );
      
      const mapped = uniqueData.map((item: any): BotMessage => {
        const isBot = item.content?.startsWith("[BOT] ");
        return {
          id: item.id,
          from: isBot ? "bot" : "user",
          text: isBot ? item.content.replace("[BOT] ", "") : item.content,
          timestamp: new Date(item.created_at).getTime(),
        };
      });
      setBotMessages(mapped);
    } catch (error) {
      console.error("[AdminChatbot] loadBotMessages error:", error);
    }
  }, []);

  // Load initial messages
  useEffect(() => {
    if (!selectedUserId) {
      setAdminMessages([]);
      setInputMessage("");
      return;
    }
    loadAdminMessages();
  }, [selectedUserId, loadAdminMessages]);

  useEffect(() => {
    if (activeTab === "bot") {
      loadBotMessages();
    }
  }, [activeTab, loadBotMessages]);

  // Connect to WebSocket
  useEffect(() => {
    if (!currentUser) return;

    const token = getAccessToken();
    if (!token) {
      console.warn("[AdminChatbot] No access token available");
      return;
    }

    // Connect to WebSocket
    wsClient.connect(token).then(() => {
      // console.log("[AdminChatbot] WebSocket connected");
      setWsConnected(true);
    }).catch((error) => {
      console.error("[AdminChatbot] WebSocket connection error:", error);
    });

    // Handle incoming messages
    const unsubscribe = wsClient.onMessage((data) => {
      // console.log("[AdminChatbot] Received WS message:", data);

      if (data.type === "new_message" || data.type === "message_sent") {
        const msg = data.message;
        
        // Update admin messages if relevant
        if (activeTab === "admin" && selectedUserId) {
          const senderIdStr = String(msg.sender_id);
          const recipientIdStr = String(msg.recipient_id || "");
          const currentUserIdStr = String(currentUser.id);
          const selectedUserIdStr = String(selectedUserId);
          
          // Check if message is relevant to current conversation
          if (
            (senderIdStr === currentUserIdStr && recipientIdStr === selectedUserIdStr) ||
            (senderIdStr === selectedUserIdStr && recipientIdStr === currentUserIdStr)
          ) {
            setAdminMessages((prev) => {
              // Check if message already exists
              if (prev.find((m) => m.id === msg.id)) {
                return prev;
              }
              
              const from: ChatDirection = senderIdStr === currentUserIdStr ? "admin" : "user";
              
              return [...prev, {
                id: msg.id,
                from,
                text: msg.content,
                timestamp: new Date(msg.created_at).getTime(),
                senderId: msg.sender_id,
                senderName: msg.sender_name,
              }];
            });
          }
        }
      } else if (data.type === "chatbot_response") {
        // Update bot messages
        if (activeTab === "bot") {
          const { user_message, bot_message } = data;
          
          setBotMessages((prev) => {
            const newMessages = [...prev];
            
            // Add user message if not exists
            if (!newMessages.find((m) => m.id === user_message.id)) {
              newMessages.push({
                id: user_message.id,
                from: "user",
                text: user_message.content,
                timestamp: new Date(user_message.created_at).getTime(),
              });
            }
            
            // Add bot message if not exists
            if (!newMessages.find((m) => m.id === bot_message.id)) {
              newMessages.push({
                id: bot_message.id,
                from: "bot",
                text: bot_message.content,
                timestamp: new Date(bot_message.created_at).getTime(),
              });
            }
            
            return newMessages;
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, activeTab, selectedUserId]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (activeTab === "admin") {
      if (!selectedUserId) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn user để chat",
          variant: "destructive",
        });
        return;
      }

      try {
        setSending(true);
        const messageText = inputMessage.trim();
        setInputMessage(""); // Clear immediately
        
        if (wsConnected) {
          // Send via WebSocket
          wsClient.send({
            type: "chat_message",
            content: messageText,
            recipient_id: selectedUserId,
          });
        } else {
          // Fallback to HTTP API
          await apiFetch("/api/chat/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: messageText,
              user_id: selectedUserId,
            }),
          });
          
          // Reload messages after a delay
          setTimeout(() => {
            loadAdminMessages();
          }, 300);
        }
      } catch (error: any) {
        // Restore input on error
        setInputMessage(inputMessage);
        toast({
          title: "Lỗi",
          description: error?.detail || error?.error || "Không thể gửi tin nhắn",
          variant: "destructive",
        });
      } finally {
        setSending(false);
      }
    } else {
      // Chatbot tab
      try {
        setSending(true);
        const messageText = inputMessage.trim();
        setInputMessage(""); // Clear immediately
        
        if (wsConnected) {
          // Send via WebSocket
          wsClient.send({
            type: "chatbot_message",
            content: messageText,
          });
        } else {
          // Fallback to HTTP API
          await apiFetch("/api/chat/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: messageText }),
          });
          
          // Reload messages after a delay
          setTimeout(() => {
            loadBotMessages();
          }, 300);
        }
      } catch (error: any) {
        // Restore input on error
        setInputMessage(inputMessage);
        toast({
          title: "Lỗi",
          description: error?.detail || error?.error || "Không thể gửi tin nhắn",
          variant: "destructive",
        });
      } finally {
        setSending(false);
      }
    }
  };


  const resolvedUserName = selectedUser?.ho_ten || "Người dùng";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quản lý Chatbot
            {wsConnected && (
              <Badge variant="outline" className="text-xs">Realtime</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "admin" | "bot")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin">Admin Chat</TabsTrigger>
              <TabsTrigger value="bot">Chatbot Remedi</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 mt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label>Chọn user để chat</Label>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.ho_ten} ({user.email || user.so_dien_thoai})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={loadAdminMessages}
                  disabled={!selectedUserId || loadingMessages}
                  aria-label="Làm mới hội thoại"
                >
                  {loadingMessages ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {selectedUser && (
                <div className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">{resolvedUserName}</span>
                    <Badge variant="outline">{selectedUser.role || "USER"}</Badge>
                  </div>

                  <div className="h-64 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded">
                    {loadingMessages && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!loadingMessages && adminMessages.length === 0 && (
                      <div className="text-center text-sm text-muted-foreground py-6">
                        Chưa có tin nhắn nào với người dùng này.
                      </div>
                    )}
                    {adminMessages.map((msg) => {
                      const isAdminMsg = msg.from === "admin";
                      const bubbleName = isAdminMsg
                        ? currentUser?.ho_ten || "Bạn"
                        : msg.senderName || resolvedUserName;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isAdminMsg ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[75%] ${
                              isAdminMsg
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-muted text-foreground rounded-bl-none"
                            }`}
                          >
                            <div className="text-xs opacity-70 mb-1">
                              {bubbleName}
                            </div>
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {msg.text}
                            </div>
                            <div className="text-[10px] opacity-60 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={adminMessagesEndRef} />
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập tin nhắn..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={sending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sending || !inputMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bot" className="space-y-4 mt-4">
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Chatbot Remedi</span>
                </div>

                <div className="h-64 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded">
                  {botMessages.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-6">
                      Bắt đầu chat với Chatbot Remedi
                    </div>
                  ) : (
                    botMessages.map((msg) => {
                      const isBotMsg = msg.from === "bot";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isBotMsg ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm ${
                              isBotMsg
                                ? "bg-slate-200 text-slate-900 rounded-bl-none"
                                : "bg-primary text-primary-foreground rounded-br-none"
                            }`}
                          >
                            {isBotMsg && (
                              <div className="text-xs opacity-70 mb-1">
                                AI Chatbot
                              </div>
                            )}
                            <div className="whitespace-pre-wrap break-words">
                              {msg.text}
                            </div>
                            <div className="text-[10px] opacity-60 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={botMessagesEndRef} />
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tin nhắn..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={sending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !inputMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
