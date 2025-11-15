import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, StarHalf } from "lucide-react";
import { FeedbackItem } from "@shared/dashboardTypes";
import { format } from "date-fns";

interface FeedbackSectionProps {
  items: FeedbackItem[];
  onReply?: (feedback: FeedbackItem) => void;
  isAdmin?: boolean;
}

export function FeedbackSection({
  items,
  onReply,
  isAdmin,
}: FeedbackSectionProps) {
  const averageRating = React.useMemo(() => {
    const total = items.reduce((acc, item) => acc + item.rating, 0);
    return total / items.length;
  }, [items]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Đánh giá từ người dùng</CardTitle>
            <CardDescription>Phản hồi về ứng dụng và dịch vụ</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const fill = star <= Math.floor(averageRating);
                const half = !fill && star === Math.ceil(averageRating);
                return (
                  <div key={star} className="text-yellow-500">
                    {half ? (
                      <StarHalf className="h-5 w-5 fill-current" />
                    ) : (
                      <Star
                        className={`h-5 w-5 ${
                          fill ? "fill-current" : "stroke-current"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 text-2xl font-bold">
              {averageRating.toFixed(1)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={`https://avatar.vercel.sh/${item.userId}`}
                    />
                    <AvatarFallback>{item.userName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{item.userName}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(item.createdAt), "dd/MM/yyyy")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= item.rating
                          ? "text-yellow-500 fill-current"
                          : "text-muted stroke-current"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-sm">{item.comment}</p>

              {item.adminReply && (
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Phản hồi từ Admin</Badge>
                  </div>
                  <p className="text-sm">{item.adminReply}</p>
                </div>
              )}

              {isAdmin && !item.adminReply && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReply?.(item)}
                >
                  Phản hồi
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
