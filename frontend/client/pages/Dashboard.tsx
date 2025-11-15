import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import {
  TrendingUp,
  Users,
  Package,
  Gift,
  Star,
  ArrowRight,
  Heart,
  Leaf,
  Recycle,
  Loader2,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardMetricsResponse } from "@shared/dashboardTypes";
import { SystemOverview } from "./dashboard/SystemOverview";
import { UserOverview } from "./dashboard/UserOverview";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardMetricsResponse | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSystemStats, setShowSystemStats] = useState(false);

  const emptyMetrics: DashboardMetricsResponse = {
    totalSubmissions: 0,
    pendingSubmissions: 0,
    processedSubmissions: 0,
    totalUsers: 0,
    totalVouchers: 0,
    submissionTrend: [],
    voucherTrend: [],
    userRoleDistribution: [],
    medicineDistribution: [],
    userStats: null,
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, feedbacksRes] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getFeedbacks(),
      ]);

      const metrics = statsRes.success && statsRes.data
        ? (statsRes.data as DashboardMetricsResponse)
        : emptyMetrics;

      setStats({
        ...emptyMetrics,
        ...metrics,
        submissionTrend: metrics.submissionTrend ?? [],
        voucherTrend: metrics.voucherTrend ?? [],
        userRoleDistribution: metrics.userRoleDistribution ?? [],
        medicineDistribution: metrics.medicineDistribution ?? [],
        userStats: metrics.userStats ?? null,
      });

      if (feedbacksRes.success) {
        setFeedbacks(feedbacksRes.data || []);
      } else {
        setFeedbacks([]);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setStats(emptyMetrics);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Recycle,
      title: "Thu gom thuốc thừa",
      description:
        "Nộp thuốc thừa, hết hạn một cách dễ dàng và nhận điểm thưởng",
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      icon: Heart,
      title: "Chia sẻ yêu thương",
      description:
        "Thuốc còn hạn sẽ được chuyển đến người cần, giúp đỡ cộng đồng",
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      icon: Leaf,
      title: "Bảo vệ môi trường",
      description: "Xử lý thuốc hết hạn đúng cách, giảm ô nhiễm môi trường",
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: Gift,
      title: "Nhận ưu đãi",
      description: "Đổi điểm thưởng lấy voucher và nhiều quà tặng hấp dẫn",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
  ];

  const userStats = stats?.userStats ?? null;

  // Overview items chỉ hiển thị khi đã đăng nhập và có userStats
  // Dữ liệu từ userStats (cá nhân), không phải từ stats (toàn hệ thống)
  const overviewItems = isAuthenticated && userStats
    ? [
        {
          title: "Tổng hồ sơ",
          icon: Package,
          value: userStats.submissions,
          subtitle: `${userStats.pending.toLocaleString("vi-VN")} đang chờ xử lý`,
        },
        {
          title: "Điểm tích lũy",
          icon: Star,
          value: userStats.points,
          subtitle: `Hạng ${userStats.level}`,
        },
        {
          title: "Voucher đã dùng",
          icon: Gift,
          value: userStats.vouchersUsed,
          subtitle: "Voucher đã quy đổi",
        },
        {
          title: "Hồ sơ hoàn tất",
          icon: TrendingUp,
          value: userStats.approved,
          subtitle: "Đã được duyệt",
        },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
      {/* Hero Section */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 md:p-12 overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <Package className="h-64 w-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Chào mừng đến với Remedi
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-6">
            Nền tảng thu gom và trao đổi thuốc thừa, hết hạn - Vì một cộng đồng
            khỏe mạnh và môi trường xanh
          </p>
          {isAuthenticated ? (
            <div className="flex gap-4">
              <Link to="/submit">
                <Button size="lg" variant="secondary">
                  Nộp thuốc ngay
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/voucher">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Xem voucher
                </Button>
              </Link>
            </div>
          ) : (
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Đăng nhập để bắt đầu
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* System Statistics Toggle Section */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Thống kê hệ thống</h3>
                <p className="text-sm text-muted-foreground">
                  Xem biểu đồ và số liệu tổng quan của toàn hệ thống
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSystemStats(!showSystemStats)}
              className="gap-2"
            >
              {showSystemStats ? (
                <>
                  Ẩn thống kê
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Xem thống kê
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Charts - Collapsible */}
      {showSystemStats && stats && (
        <div className="animate-in fade-in-50 slide-in-from-top-4 duration-500">
          <SystemOverview data={stats} />
        </div>
      )}

      {showSystemStats && !stats && loading && (
        <Card className="h-[360px] animate-pulse border border-dashed border-muted">
          <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Đang tải biểu đồ thống kê...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Overview */}
      {isAuthenticated && userStats && (
        <div className="animate-in fade-in-50 duration-500 slide-in-from-bottom-4">
          <UserOverview stats={userStats} />
        </div>
      )}
      {isAuthenticated && loading && !userStats && (
        <Card className="border border-dashed border-muted bg-muted/20 animate-pulse">
          <CardContent className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tải thống kê cá nhân...</span>
          </CardContent>
        </Card>
      )}
      {isAuthenticated && !loading && !userStats && (
        <Card className="border border-dashed border-muted bg-muted/20">
          <CardContent className="py-6 text-sm text-muted-foreground text-center">
            Không thể tải thống kê cá nhân. Vui lòng thử lại sau.
          </CardContent>
        </Card>
      )}

      {/* Features Section */}
      <div className="animate-in fade-in-50 duration-700">
        <h2 className="text-2xl font-bold mb-6">Tính năng nổi bật</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group border border-border/70 bg-card/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-in fade-in-50 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-6">
                  <div
                    className={`${feature.bg} w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <Icon className={`h-6 w-6 ${feature.color} transition-transform duration-300`} />
                  </div>
                  <h3 className="font-semibold mb-2 text-foreground transition-colors duration-200 group-hover:text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <Card className="animate-in fade-in-50 duration-700 slide-in-from-bottom-4">
        <CardHeader>
          <CardTitle>Cách thức hoạt động</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Đăng ký & Nộp thuốc",
                description:
                  "Tạo tài khoản và điền thông tin thuốc cần nộp. Chọn nhà thuốc gần nhất để tiện lợi.",
              },
              {
                step: "2",
                title: "Xử lý & Phân loại",
                description:
                  "Hệ thống phân loại thuốc còn hạn và hết hạn. Thuốc còn hạn sẽ được chuyển đến người cần.",
              },
              {
                step: "3",
                title: "Nhận thưởng",
                description:
                  "Nhận điểm thưởng và đổi lấy voucher, quà tặng hấp dẫn từ hệ thống.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="text-center animate-in fade-in-50 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 transition-all duration-300 hover:scale-110 hover:bg-primary/20">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <div className="animate-in fade-in-50 duration-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Đánh giá từ người dùng</h2>
          {feedbacks.length > 3 && (
            <p className="text-sm text-muted-foreground">
              {feedbacks.length} đánh giá
            </p>
          )}
        </div>
        {feedbacks.length === 0 ? (
          <Card className="animate-in fade-in-50 duration-500">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">Chưa có đánh giá nào</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feedbacks.slice(0, 6).map((feedback, index) => (
              <Card
                key={feedback.id}
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in fade-in-50 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 transition-all duration-200 ${
                            i < (feedback.rating || feedback.danh_gia || 5)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {feedback.ngay_tao 
                        ? new Date(feedback.ngay_tao).toLocaleDateString("vi-VN")
                        : feedback.createdAt 
                        ? new Date(feedback.createdAt).toLocaleDateString("vi-VN")
                        : ""}
                    </div>
                  </div>
                  <p className="text-sm text-foreground mb-4 line-clamp-3">
                    {feedback.noi_dung || feedback.content || "Không có nội dung"}
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-110">
                      <span className="text-sm font-semibold text-primary">
                        {(feedback.userName || feedback.id_nguoi_nop || "U").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {feedback.userName || "Người dùng ẩn danh"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Đã đánh giá
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* CTA Section */}
      {!isAuthenticated && (
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-none">
          <CardContent className="pt-6 pb-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Sẵn sàng bắt đầu?</h2>
            <p className="mb-6 opacity-90">
              Tham gia cùng hàng ngàn người dùng đã tin tưởng Remedi
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary">
                Đăng ký ngay
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
