import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

export function ChatbotNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { send } = useNotifications();

  // Show chatbot notification after 30 seconds if user hasn't interacted
  useEffect(() => {
    if (!hasInteracted) {
      const timer = setTimeout(() => {
        send({
          type: "chatbot",
          title: "Trợ lý ảo",
          message: "Xin chào! Tôi có thể giúp gì cho bạn?",
          priority: "low",
          target: "user",
          status: "unread",
        });
        setIsOpen(true);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [hasInteracted]);

  // Close notification when user interacts
  const handleInteraction = () => {
    setHasInteracted(true);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Card
      className={cn(
        "fixed bottom-4 right-4 w-80 shadow-lg",
        "animate-in slide-in-from-right-5",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Trợ lý ảo
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Xin chào! Tôi có thể giúp gì cho bạn?</p>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={handleInteraction}
        >
          Tôi cần hỗ trợ
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setIsOpen(false)}
        >
          Để sau
        </Button>
      </CardFooter>
    </Card>
  );
}
