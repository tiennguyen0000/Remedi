import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardMetricsResponse } from "@shared/dashboardTypes";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SystemOverviewProps {
  data: DashboardMetricsResponse;
}

const emptyPlaceholder = (
  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground">
    Chưa có dữ liệu
  </div>
);

export function SystemOverview({ data }: SystemOverviewProps) {
  const submissionChartOptions: ChartOptions<"line"> = {
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

  const pieOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
    },
  };

  const voucherChartOptions: ChartOptions<"bar"> = {
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

  const submissionLabels = data.submissionTrend.map((item) => item.label);
  const submissionValues = data.submissionTrend.map((item) => item.value);
  const hasSubmissionData = submissionValues.some((value) => value > 0);

  const voucherLabels = data.voucherTrend.map((item) => item.label);
  const voucherValues = data.voucherTrend.map((item) => item.value);
  const hasVoucherData = voucherValues.some((value) => value > 0);

  const medicineLabels = data.medicineDistribution.map((item) => item.label);
  const medicineValues = data.medicineDistribution.map((item) => item.value);

  const roleLabels = data.userRoleDistribution.map((item) => item.label);
  const roleValues = data.userRoleDistribution.map((item) => item.value);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Lượt nộp thuốc theo tháng</CardTitle>
          <CardDescription>
            Xu hướng thu gom trong 6 tháng gần đây
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {hasSubmissionData ? (
            <Line
              options={submissionChartOptions}
              data={{
                labels: submissionLabels,
                datasets: [
                  {
                    data: submissionValues,
                    borderColor: "rgb(34, 197, 94)",
                    backgroundColor: "rgba(34, 197, 94, 0.18)",
                    fill: true,
                    tension: 0.38,
                  },
                ],
              }}
            />
          ) : (
            emptyPlaceholder
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cơ cấu loại thuốc</CardTitle>
            <CardDescription>
              Top 6 hoạt chất được thu gom nhiều nhất
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {medicineLabels.length ? (
              <Pie
                options={pieOptions}
                data={{
                  labels: medicineLabels,
                  datasets: [
                    {
                      data: medicineValues,
                      backgroundColor: [
                        "rgba(59, 130, 246, 0.85)",
                        "rgba(16, 185, 129, 0.85)",
                        "rgba(249, 115, 22, 0.85)",
                        "rgba(244, 114, 182, 0.85)",
                        "rgba(132, 204, 22, 0.85)",
                        "rgba(147, 197, 253, 0.85)",
                      ],
                    },
                  ],
                }}
              />
            ) : (
              emptyPlaceholder
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân bổ vai trò người dùng</CardTitle>
            <CardDescription>
              Tỷ lệ Admin, Cộng tác viên và Người dùng
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {roleLabels.length ? (
              <Pie
                options={pieOptions}
                data={{
                  labels: roleLabels,
                  datasets: [
                    {
                      data: roleValues,
                      backgroundColor: [
                        "rgba(34, 197, 94, 0.85)",
                        "rgba(99, 102, 241, 0.85)",
                        "rgba(239, 68, 68, 0.85)",
                      ],
                    },
                  ],
                }}
              />
            ) : (
              emptyPlaceholder
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đổi voucher theo tháng</CardTitle>
          <CardDescription>
            Số lượt đổi voucher trong 6 tháng gần đây
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {hasVoucherData ? (
            <Bar
              options={voucherChartOptions}
              data={{
                labels: voucherLabels,
                datasets: [
                  {
                    label: "Lượt đổi",
                    data: voucherValues,
                    backgroundColor: "rgba(99, 102, 241, 0.85)",
                    borderRadius: 6,
                  },
                ],
              }}
            />
          ) : (
            emptyPlaceholder
          )}
        </CardContent>
      </Card>
    </div>
  );
}
