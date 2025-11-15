import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserDashboardStats } from "@shared/dashboardTypes";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import {
  Award,
  CheckCircle2,
  Clock,
  RefreshCcw,
  Ticket,
  XCircle,
  Undo2,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface UserOverviewProps {
  stats: UserDashboardStats;
}

const levelColors: Record<string, string> = {
  Bronze: "bg-amber-500/15 text-amber-600 border border-amber-500/30",
  Silver: "bg-slate-200 text-slate-700 border border-slate-300",
  Gold: "bg-yellow-500/15 text-yellow-600 border border-yellow-500/30",
  Platinum: "bg-sky-500/15 text-sky-600 border border-sky-500/30",
};

export function UserOverview({ stats }: UserOverviewProps) {
  const pointsChartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const pointsValues = stats.monthlyPoints.map((item) => item.value);
  const hasPointsHistory = pointsValues.some((value) => value > 0);

  const levelBadgeClass =
    levelColors[stats.level] ?? "bg-primary/10 text-primary border border-primary/20";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Thống kê cá nhân</CardTitle>
          <CardDescription>
            Tổng hợp hiệu suất nộp thuốc và tích điểm của bạn
          </CardDescription>
        </div>
        <Badge className={`px-3 py-1 text-sm font-medium ${levelBadgeClass}`}>
          Hạng {stats.level}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border bg-card/50 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Điểm thưởng
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-3xl font-bold text-primary">
              {stats.points.toLocaleString("vi-VN")}
            </div>
          </div>
          <div className="rounded-xl border bg-card/50 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Tổng hồ sơ
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {stats.submissions.toLocaleString("vi-VN")}
            </div>
          </div>
          <div className="rounded-xl border bg-card/50 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Voucher đã đổi
              <Ticket className="h-4 w-4 text-purple-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-purple-600">
              {stats.vouchersUsed.toLocaleString("vi-VN")}
            </div>
          </div>
          <div className="rounded-xl border bg-card/50 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Hồ sơ đang chờ
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-600">
              {stats.pending.toLocaleString("vi-VN")}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UserStatusCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Đã duyệt"
            value={stats.approved}
            className="text-green-600"
          />
          <UserStatusCard
            icon={<XCircle className="h-4 w-4" />}
            label="Từ chối"
            value={stats.rejected}
            className="text-rose-600"
          />
          <UserStatusCard
            icon={<Undo2 className="h-4 w-4" />}
            label="Trả về"
            value={stats.returned}
            className="text-blue-600"
          />
          <UserStatusCard
            icon={<RefreshCcw className="h-4 w-4" />}
            label="Thu hồi"
            value={stats.recalled}
            className="text-slate-600"
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Điểm thưởng theo từng tháng
            </h3>
            <span className="text-xs text-muted-foreground">
              So sánh 6 tháng gần nhất
            </span>
          </div>
          <div className="h-[280px] rounded-xl border bg-card/50 p-4 shadow-sm">
            {hasPointsHistory ? (
              <Line
                options={pointsChartOptions}
                data={{
                  labels: stats.monthlyPoints.map((item) => item.label),
                  datasets: [
                    {
                      data: pointsValues,
                      borderColor: "rgb(59, 130, 246)",
                      backgroundColor: "rgba(59, 130, 246, 0.18)",
                      fill: true,
                      tension: 0.35,
                    },
                  ],
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có điểm thưởng trong 6 tháng gần đây
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface UserStatusCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  className?: string;
}

function UserStatusCard({ label, value, icon, className }: UserStatusCardProps) {
  return (
    <div className="rounded-xl border bg-card/50 p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <span className={className}>{icon}</span>
      </div>
      <div className={`mt-2 text-2xl font-semibold ${className}`}>
        {value.toLocaleString("vi-VN")}
      </div>
    </div>
  );
}

