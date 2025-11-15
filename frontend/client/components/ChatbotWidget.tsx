import React, { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "bot"; content: string }>
  >([
    {
      role: "bot",
      content: "Xin chào! Tôi là trợ lý Remedi. Bạn cần hỗ trợ gì không?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Random prompt popup
  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (!isOpen && Math.random() > 0.5) {
          setShowPrompt(true);
          setTimeout(() => setShowPrompt(false), 5000);
        }
      },
      Math.random() * 30000 + 10000,
    ); // Random between 10-40s

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]); // Also scroll when loading changes

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    
    // console.log("[Chatbot] Sending message:", userMessage);
    
    // Force immediate render by using flushSync
    flushSync(() => {
      setMessages(prev => {
        const updated = [...prev, { role: "user" as const, content: userMessage }];
        // console.log("[Chatbot] Messages after user:", updated.length);
        return updated;
      });
    });

    // Small delay to ensure DOM is updated
    await new Promise(resolve => setTimeout(resolve, 0));
    
    flushSync(() => {
      setIsLoading(true);
    });
    
    try {
      // Call chatbot API
      // console.log("[Chatbot] Calling API...");
      const response = await apiClient.sendChatbotMessage(userMessage);
      // console.log("[Chatbot] API response:", response);

      // Extract bot response and remove [BOT] prefix if exists
      let botMessage = response.data?.bot_response?.content || "Xin lỗi, tôi không thể trả lời lúc này.";
      if (botMessage.startsWith("[BOT] ")) {
        botMessage = botMessage.substring(6);
      }
      
      // console.log("[Chatbot] Bot message:", botMessage);
      
      // Add bot response with flushSync
      flushSync(() => {
        setMessages(prev => {
          const updated = [...prev, { role: "bot" as const, content: botMessage }];
          // console.log("[Chatbot] Messages after bot:", updated.length);
          return updated;
        });
      });
      
    } catch (error) {
      console.error("Chatbot error:", error);
      flushSync(() => {
        setMessages(prev => [...prev, { 
          role: "bot" as const, 
          content: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau." 
        }]);
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chatbot Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        {showPrompt && !isOpen && (
          <div className="absolute bottom-16 right-0 mb-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg animate-bounce">
            Bạn cần hỗ trợ gì không?
          </div>
        )}

        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-96 h-[500px] z-[9999] flex flex-col shadow-2xl">
          <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <h3 className="font-semibold">Trợ lý Remedi</h3>
            <p className="text-xs opacity-90">Luôn sẵn sàng hỗ trợ bạn</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={`${idx}-${msg.content.substring(0, 10)}`}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Đang trả lời...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSend()}
                placeholder="Nhập tin nhắn..."
                disabled={isLoading}
              />
              <Button onClick={handleSend} size="icon" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

// Thêm default export
export default ChatbotWidget;
