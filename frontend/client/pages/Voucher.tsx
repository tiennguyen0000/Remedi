import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Gift,
  Star,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { QRCode } from "@/components/QRCode";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Voucher {
  id: string;
  ten_voucher: string;
  mo_ta: string;
  diem_can_thiet: number;
  so_luong_con_lai: number;
  trang_thai: string;
  ngay_het_han: string | null;
}

interface VoucherStats {
  id: string;
  ten_voucher: string;
  so_luong_con_lai: number;
  used: number;
}

export default function Voucher() {
  const { user, refreshUser } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stats, setStats] = useState<VoucherStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemedVoucherId, setRedeemedVoucherId] = useState<string | null>(null);
  const [qrCodeValue, setQrCodeValue] = useState<string>("");
  const isAdmin = user?.role === "ADMIN";
  const hasStats = stats.length > 0;

  const statsChartOptions: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: "Thống kê sử dụng voucher",
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Số lượng",
          },
        },
      },
    }),
    []
  );

  const statsChartData = useMemo(() => {
    const labels = stats.map((item) => item.ten_voucher);
    const usedValues = stats.map((item) => item.used);
    const remainingValues = stats.map((item) => item.so_luong_con_lai);

    return {
      labels,
      datasets: [
        {
          label: "Đã sử dụng",
          data: usedValues,
          backgroundColor: "rgba(96, 165, 250, 0.75)",
          borderRadius: 6,
        },
        {
          label: "Còn lại",
          data: remainingValues,
          backgroundColor: "rgba(52, 211, 153, 0.75)",
          borderRadius: 6,
        },
      ],
    };
  }, [stats]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vData, sData] = await Promise.all([
        apiFetch("/api/voucher", { method: "GET" }),
        apiFetch("/api/voucher/stats", { method: "GET" }),
      ]);
      setVouchers(vData || []);
      setStats(sData || []);
    } catch (error) {
      console.error("Error loading vouchers:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải voucher",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!selectedVoucher || !user) return;
    try {
      setRedeeming(true);
      const result = await apiFetch<{
        message: string;
        ok: boolean;
        new_points?: number;
        points_deducted?: number;
      }>(`/api/voucher/${selectedVoucher.id}/redeem`, {
        method: "POST",
      });
      
      // Generate QR code value
      const qrData = JSON.stringify({
        voucherId: selectedVoucher.id,
        voucherName: selectedVoucher.ten_voucher,
        userId: user.id,
        redeemedAt: new Date().toISOString(),
        pointsUsed: selectedVoucher.diem_can_thiet,
      });
      setQrCodeValue(qrData);
      setRedeemedVoucherId(selectedVoucher.id);
      
      // Refresh user data to get updated points
      await refreshUser();
      
      // Reload vouchers and stats
      await loadData();
      
      toast({
        title: "Thành công",
        description: `Đã đổi voucher ${selectedVoucher.ten_voucher} thành công!${result.new_points !== undefined ? ` Điểm còn lại: ${result.new_points}` : ""}`,
      });
      
      setRedeeming(false);
      // Don't close dialog, show QR code instead
    } catch (error: any) {
      console.error("Error redeeming voucher:", error);
      toast({
        title: "Lỗi",
        description: error.detail || error.error || error.message || "Không thể đổi voucher",
        variant: "destructive",
      });
      setRedeeming(false);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedVoucher(null);
    setRedeemedVoucherId(null);
    setQrCodeValue("");
  };

  const getVoucherImage = (voucher: Voucher) => {
    // Generate gradient based on voucher name
    const colors = [
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-orange-400 to-orange-600',
      'from-teal-400 to-teal-600',
    ];
    const colorIndex = voucher.id.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  const canRedeem = (v: Voucher) => {
    if (!user) return false;
    
    // Check if voucher is active
    if (v.trang_thai !== "active") return false;
    
    // Check if voucher has remaining quantity
    if (v.so_luong_con_lai <= 0) return false;
    
    // Check if user has enough points
    if (!user.diem_tich_luy || user.diem_tich_luy < v.diem_can_thiet) return false;
    
    // Check expiry date (if exists)
    if (v.ngay_het_han) {
      try {
        const expiryDate = new Date(v.ngay_het_han);
        if (expiryDate <= new Date()) return false;
      } catch (e) {
        console.error("Error parsing expiry date:", e);
        // If we can't parse the date, assume it's valid
      }
    }
    
    return true;
  };

  const getProgress = (v: Voucher) => {
    const stat = stats.find((s) => s.id === v.id);
    if (!stat) return 0;
    const total = stat.so_luong_con_lai + stat.used;
    return total > 0 ? (stat.used / total) * 100 : 0;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-96">
        <div>Đang tải...</div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Voucher</h1>
          <p className="text-muted-foreground">Đổi điểm lấy voucher</p>
        </div>
        <Card className="w-full sm:w-64">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Điểm</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {user?.diem_tich_luy || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="all">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="available">Có thể đổi</TabsTrigger>
          <TabsTrigger value="stats">Thống kê</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vouchers.map((v) => {
              const p = getProgress(v);
              const can = canRedeem(v);
              const gradientClass = getVoucherImage(v);
              return (
                <Card key={v.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Voucher Image/Header */}
                  <div className={`h-32 bg-gradient-to-br ${gradientClass} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-4 left-4 right-4">
                      <div className="flex items-center justify-between">
                        <Gift className="h-8 w-8 text-white/90" />
                        {can && (
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                            Có thể đổi
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-bold text-lg drop-shadow-lg">
                        {v.ten_voucher}
                      </p>
                    </div>
                  </div>
                  <CardHeader>
                    <CardDescription className="line-clamp-2">{v.mo_ta}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className={
                        "p-3 rounded-lg flex items-center justify-between " +
                        (can ? "bg-green-50" : "bg-yellow-50")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Star
                          className={
                            "h-5 w-5 " +
                            (can ? "text-green-600" : "text-yellow-600")
                          }
                        />
                        <span
                          className={
                            "font-semibold " +
                            (can ? "text-green-900" : "text-yellow-900")
                          }
                        >
                          {v.diem_can_thiet} điểm
                        </span>
                      </div>
                      {can ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <Progress value={p} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Còn: {v.so_luong_con_lai}
                      </p>
                    </div>
                    {v.ngay_het_han && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          HSD:{" "}
                          {new Date(v.ngay_het_han).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    )}
                    {!v.ngay_het_han && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Không có hạn sử dụng</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      disabled={!can}
                      onClick={() => {
                        setSelectedVoucher(v);
                        setShowDialog(true);
                        setRedeemedVoucherId(null);
                        setQrCodeValue("");
                      }}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      {can ? "Đổi ngay" : "Không đủ"}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="available" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vouchers.filter(canRedeem).map((v) => {
              const gradientClass = getVoucherImage(v);
              return (
                <Card key={v.id} className="border-green-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`h-32 bg-gradient-to-br ${gradientClass} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute top-4 left-4 right-4">
                      <div className="flex items-center justify-between">
                        <Gift className="h-8 w-8 text-white/90" />
                        <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                          Có thể đổi
                        </Badge>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-bold text-lg drop-shadow-lg">
                        {v.ten_voucher}
                      </p>
                    </div>
                  </div>
                  <CardHeader>
                    <CardDescription className="line-clamp-2">{v.mo_ta}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Star className="h-5 w-5 text-green-600 inline mr-2" />
                      <span className="font-bold text-green-900">
                        {v.diem_can_thiet} điểm
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedVoucher(v);
                        setShowDialog(true);
                        setRedeemedVoucherId(null);
                        setQrCodeValue("");
                      }}
                    >
                      Đổi ngay
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
            {vouchers.filter(canRedeem).length === 0 && (
              <div className="col-span-full text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p>Chưa đủ điểm</p>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="stats" className="mt-6">
          {isAdmin ? (
            hasStats ? (
              <Card>
                <CardHeader>
                  <CardTitle>Hiệu suất voucher</CardTitle>
                  <CardDescription>
                    So sánh số lượng voucher đã đổi và còn lại
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[360px] w-full">
                    <Bar options={statsChartOptions} data={statsChartData} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Chưa có dữ liệu thống kê voucher.
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Chỉ quản trị viên mới có thể xem thống kê voucher.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          {redeemedVoucherId && qrCodeValue ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">Đổi voucher thành công!</DialogTitle>
                <DialogDescription className="text-center">
                  Mã QR của bạn
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
                  <div className="mb-4">
                    <QRCode value={qrCodeValue} size={200} />
                  </div>
                  <p className="text-sm font-medium text-center mb-2">
                    {selectedVoucher?.ten_voucher}
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Vui lòng lưu mã QR này để sử dụng
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Đã trừ</p>
                    <p className="text-lg font-bold text-blue-600">
                      {selectedVoucher?.diem_can_thiet} điểm
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Điểm còn lại</p>
                    <p className="text-lg font-bold text-green-700">
                      {user?.diem_tich_luy || 0} điểm
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="w-full"
                >
                  Đóng
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Xác nhận đổi voucher</DialogTitle>
                <DialogDescription>
                  Bạn có chắc chắn muốn đổi voucher này?
                </DialogDescription>
              </DialogHeader>
              {selectedVoucher && (
                <div className="space-y-4 py-4">
                  <div className={`h-24 bg-gradient-to-br ${getVoucherImage(selectedVoucher)} rounded-lg relative overflow-hidden p-4`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                      <p className="font-bold text-lg text-white drop-shadow-lg">
                        {selectedVoucher.ten_voucher}
                      </p>
                      <p className="text-sm text-white/90 mt-1">
                        {selectedVoucher.mo_ta}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Chi phí</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {selectedVoucher.diem_can_thiet} điểm
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Điểm hiện tại</p>
                      <p className="text-lg font-bold text-blue-600">
                        {user?.diem_tich_luy || 0} điểm
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-muted-foreground mb-1">Điểm sau khi đổi</p>
                    <p className="text-lg font-bold text-green-700">
                      {Math.max(0, (user?.diem_tich_luy || 0) - selectedVoucher.diem_can_thiet)} điểm
                    </p>
                  </div>
                  {selectedVoucher.ngay_het_han && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Hạn sử dụng: {new Date(selectedVoucher.ngay_het_han).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={redeeming}
                >
                  Hủy
                </Button>
                <Button onClick={handleRedeem} disabled={redeeming}>
                  {redeeming ? "Đang xử lý..." : "Xác nhận đổi"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

