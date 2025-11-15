import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api";
import { Edit2Icon, Trash2Icon, StarIcon } from "lucide-react";
import { Medicine } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StatusBadge = ({
  status,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
}) => {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    PENDING: "default",
    APPROVED: "secondary",
    REJECTED: "outline",
  };

  const labels: Record<string, string> = {
    PENDING: "Chờ xử lý",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
  };

  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
};

interface SubmissionHistoryProps {
  submissions: Medicine[];
}

export function SubmissionHistory({ submissions }: SubmissionHistoryProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && submissions.length === 0) fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, submissions]);

  if (!user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Vui lòng đăng nhập để xem lịch sử nộp thuốc.
      </div>
    );
  }

  const fetchSubmissions = async () => {
    try {
      const rows = (await apiFetch(
        `/api/ho-so-xu-ly/enriched?mine=1&userId=${user?.id}`,
      )) as any[];

      const mapped = rows.map((r: any) => {
        const raw = r.raw || r;
        const createdAt =
          r.createdAt || raw.thoi_gian_xu_ly || new Date().toISOString();
        const name =
          r.name || raw.ten_thuoc || raw.id_loai_thuoc || "(Loại thuốc)";
        const type = r.type || raw.don_vi_tinh || "-";
        const quantity = r.quantity ?? raw.so_luong ?? 0;
        const points = r.points ?? raw.diem ?? undefined;
        let status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";
        if (r.status) {
          status = r.status;
        } else {
          const k = String(raw.ket_qua || "").toLowerCase();
          if (k === "pending" || k === "cho_duyet") status = "PENDING";
          else if (
            k.includes("tai") ||
            k.includes("su_dung") ||
            k.includes("approved")
          )
            status = "APPROVED";
          else if (
            k.includes("tieu") ||
            k.includes("tu_choi") ||
            k.includes("reject")
          )
            status = "REJECTED";
        }

        return {
          id: r.id,
          createdAt,
          name,
          type,
          quantity,
          status,
          points,
        };
      });

      submissions = mapped as any;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load submission history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/ho-so-xu-ly/${id}`, { method: "DELETE" });

      submissions = submissions.filter((s) => s.id !== id);
      toast({
        description: "Submission deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete submission",
        variant: "destructive",
      });
    }
  };

  if (!submissions || submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử hồ sơ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Chưa có hồ sơ nào được gửi
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử hồ sơ ({submissions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{submission.name}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    submission.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : submission.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {submission.status === "approved"
                    ? "Đã duyệt"
                    : submission.status === "rejected"
                      ? "Từ chối"
                      : "Đang xử lý"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Nhà sản xuất: {submission.manufacturer}</p>
                <p>Số đăng ký: {submission.registrationNumber}</p>
                <p>
                  Ngày gửi:{" "}
                  {new Date(submission.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
