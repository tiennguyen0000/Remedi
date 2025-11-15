import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityFeedItem } from "@shared/dashboardTypes";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Pill,
  CheckCircle2,
  CircleDollarSign,
  MessageCircle,
  Bell,
} from "lucide-react";

interface ActivityFeedProps {
  items: ActivityFeedItem[];
}

const ACTIVITY_ICONS = {
  submission: <Pill className="h-4 w-4 text-blue-500" />,
  voucher: <CircleDollarSign className="h-4 w-4 text-green-500" />,
  notification: <Bell className="h-4 w-4 text-yellow-500" />,
  feedback: <MessageCircle className="h-4 w-4 text-purple-500" />,
  points: <CheckCircle2 className="h-4 w-4 text-cyan-500" />,
};

const STATUS_BADGES = {
  pending: { label: "Đang xử lý", variant: "secondary" as const },
  completed: { label: "Hoàn thành", variant: "default" as const },
  rewarded: { label: "Đã thưởng", variant: "destructive" as const },
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  const formatDate = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInHours = Math.abs(now.getTime() - activityDate.getTime()) / 36e5;

    if (diffInHours < 24) {
      return formatDistanceToNow(activityDate, { addSuffix: true, locale: vi });
    }
    return format(activityDate, "HH:mm dd/MM/yyyy");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động gần đây</CardTitle>
        <CardDescription>Theo dõi các hoạt động của bạn</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 rounded-lg border p-4"
              >
                <div className="mt-1">{ACTIVITY_ICONS[item.type]}</div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="flex items-center gap-2">
                      {item.status && (
                        <Badge variant={STATUS_BADGES[item.status].variant}>
                          {STATUS_BADGES[item.status].label}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>

                  {item.metadata?.points && (
                    <Badge variant="outline" className="mt-1">
                      +{item.metadata.points} điểm
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
