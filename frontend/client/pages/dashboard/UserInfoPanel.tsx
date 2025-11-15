import React from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Plus, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { DashboardStats } from "@shared/dashboardTypes";

interface UserInfoPanelProps {
  stats: DashboardStats;
  onChatbotOpen?: () => void;
}

const ROLE_BADGES = {
  ADMIN: { label: "Quản trị viên", variant: "destructive" as const },
  CONGTACVIEN: { label: "Cộng tác viên", variant: "default" as const },
  USER: { label: "Người dùng", variant: "secondary" as const },
};

export function UserInfoPanel({ stats, onChatbotOpen }: UserInfoPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const roleBadge = ROLE_BADGES[user.role as keyof typeof ROLE_BADGES];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>{user.ho_ten.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{user.ho_ten}</CardTitle>
              <CardDescription className="mt-1.5">
                <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <div className="text-sm text-muted-foreground">Điểm thưởng</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <div className="text-sm text-muted-foreground">Lần nộp</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.validMedicines}</div>
            <div className="text-sm text-muted-foreground">Còn hạn</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.expiredMedicines}</div>
            <div className="text-sm text-muted-foreground">Hết hạn</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => navigate("/submit")}>
            <Plus className="mr-2 h-4 w-4" />
            Nộp thuốc
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/submit?tab=history")}
          >
            <History className="mr-2 h-4 w-4" />
            Xem lịch sử
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (onChatbotOpen) {
                onChatbotOpen();
              } else {
                window.dispatchEvent(new Event("support-chat:open"));
              }
            }}
          >
            <MessageSquareText className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
