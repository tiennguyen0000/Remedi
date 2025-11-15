import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { 
  CheckCircle2, 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface ClassificationsManagementProps {
  classifications: any[];
  criteria: any[];
  submissions: any[];
  onRefresh: () => void;
  onClassificationSelect: (classification: any) => void;
  showDialog: boolean;
  onDialogChange: (open: boolean) => void;
  selectedClassification: any;
  user: any;
}

export default function ClassificationsManagement({
  classifications,
  criteria,
  submissions,
  onRefresh,
  onClassificationSelect,
  showDialog,
  onDialogChange,
  selectedClassification,
  user,
}: ClassificationsManagementProps) {
  const isReadOnly = user?.role === "CONGTACVIEN";
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
    id_ho_so_xu_ly: "",
    ket_qua_tong: "DAT",
    chi_tiet: [],
    ghi_chu_chung: "",
  });
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Statistics
  const stats = {
    total: classifications.length,
    dat: classifications.filter((c: any) => c.ket_qua_tong === 'DAT').length,
    khong_dat: classifications.filter((c: any) => c.ket_qua_tong === 'KHONG_DAT').length,
    xem_xet: classifications.filter((c: any) => c.ket_qua_tong === 'XEM_XET').length,
  };

  // Filtered classifications
  const filteredClassifications = classifications.filter((cls: any) => {
    const matchStatus = filterStatus === 'all' || cls.ket_qua_tong === filterStatus;
    const matchSearch = !searchTerm || 
      cls.id_ho_so_xu_ly?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.ghi_chu_chung?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.ten_nguoi_danh_gia?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleSubmit = async () => {
    if (!formData.id_ho_so_xu_ly) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn hồ sơ",
        variant: "destructive",
      });
      return;
    }

    // Validate chi_tiet
    if (!formData.chi_tiet || formData.chi_tiet.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đánh giá ít nhất một tiêu chí",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      if (selectedClassification) {
        await apiClient.updateClassificationResult(selectedClassification.id, formData);
        toast({ title: "Thành công", description: "Đã cập nhật kết quả phân loại" });
      } else {
        await apiClient.createClassificationResult(formData);
        toast({ title: "Thành công", description: "Đã tạo kết quả phân loại" });
      }
      onDialogChange(false);
      setFormData({
        id_ho_so_xu_ly: "",
        ket_qua_tong: "DAT",
        chi_tiet: [],
        ghi_chu_chung: "",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.detail || error.error || "Không thể lưu kết quả",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa kết quả này?")) return;
    try {
      await apiClient.deleteClassificationResult(id);
      toast({ title: "Thành công", description: "Đã xóa kết quả" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.detail || error.error || "Không thể xóa",
        variant: "destructive",
      });
    }
  };

  const initializeCriteriaDetails = () => {
    return criteria.map((c: any) => ({
      id_tieu_chi: c.id,
      ten_tieu_chi: c.ten_tieu_chi,
      ket_qua: "DAT",
      gia_tri_do: "",
      ghi_chu: "",
    }));
  };

  useEffect(() => {
    if (selectedClassification) {
      setFormData({
        id_ho_so_xu_ly: selectedClassification.id_ho_so_xu_ly || "",
        ket_qua_tong: selectedClassification.ket_qua_tong || "DAT",
        chi_tiet: selectedClassification.chi_tiet || initializeCriteriaDetails(),
        ghi_chu_chung: selectedClassification.ghi_chu_chung || "",
      });
    } else {
      setFormData({
        id_ho_so_xu_ly: "",
        ket_qua_tong: "DAT",
        chi_tiet: initializeCriteriaDetails(),
        ghi_chu_chung: "",
      });
    }
  }, [selectedClassification, criteria]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DAT":
        return <Badge className="bg-green-100 text-green-800 border-green-300">✓ Đạt</Badge>;
      case "KHONG_DAT":
        return <Badge className="bg-red-100 text-red-800 border-red-300">✗ Không đạt</Badge>;
      case "XEM_XET":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">! Xem xét</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DAT":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "KHONG_DAT":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "XEM_XET":
        return <Minus className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Tổng kết quả</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-3xl font-bold text-green-700">{stats.dat}</div>
              <div className="text-sm text-green-600 font-medium">Đạt yêu cầu</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? ((stats.dat / stats.total) * 100).toFixed(1) : 0}% tổng số
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingDown className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <div className="text-3xl font-bold text-red-700">{stats.khong_dat}</div>
              <div className="text-sm text-red-600 font-medium">Không đạt</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? ((stats.khong_dat / stats.total) * 100).toFixed(1) : 0}% tổng số
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Minus className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-3xl font-bold text-yellow-700">{stats.xem_xet}</div>
              <div className="text-sm text-yellow-600 font-medium">Cần xem xét</div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? ((stats.xem_xet / stats.total) * 100).toFixed(1) : 0}% tổng số
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
              <Input
                placeholder="🔍 Tìm kiếm theo ID hồ sơ, người đánh giá hoặc ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Lọc theo kết quả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📋 Tất cả ({stats.total})</SelectItem>
                  <SelectItem value="DAT">✓ Đạt ({stats.dat})</SelectItem>
                  <SelectItem value="KHONG_DAT">✗ Không đạt ({stats.khong_dat})</SelectItem>
                  <SelectItem value="XEM_XET">! Xem xét ({stats.xem_xet})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={onRefresh} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
              {!isReadOnly && (
                <Button
                  onClick={() => {
                    onClassificationSelect(null);
                    onDialogChange(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm mới
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      {(searchTerm || filterStatus !== 'all') && (
        <div className="text-sm text-muted-foreground">
          Hiển thị {filteredClassifications.length} / {stats.total} kết quả
        </div>
      )}

      {/* Results List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredClassifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm || filterStatus !== 'all' 
                  ? "Không tìm thấy kết quả phù hợp" 
                  : "Chưa có kết quả phân loại nào"}
              </p>
              <p className="text-sm text-muted-foreground">
                {!isReadOnly && !searchTerm && filterStatus === 'all' && "Nhấn 'Thêm mới' để tạo kết quả phân loại đầu tiên"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredClassifications.map((cls: any) => (
            <Card key={cls.id} className="hover:shadow-lg transition-all duration-200 border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(cls.ket_qua_tong)}
                      <CardTitle className="text-lg">
                        Hồ sơ #{cls.id_ho_so_xu_ly?.slice(0, 8)}...
                      </CardTitle>
                      {getStatusBadge(cls.ket_qua_tong)}
                    </div>
                    {cls.ten_nguoi_danh_gia && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span className="font-medium">Đánh giá bởi:</span> 
                        <span className="text-blue-600">{cls.ten_nguoi_danh_gia}</span>
                      </p>
                    )}
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onClassificationSelect(cls);
                          onDialogChange(true);
                        }}
                        className="hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cls.id)}
                        className="hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {cls.ghi_chu_chung && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 mb-1">💬 Ghi chú chung:</p>
                    <p className="text-sm text-blue-700">{cls.ghi_chu_chung}</p>
                  </div>
                )}
                
                {/* Chi tiết đánh giá */}
                {cls.chi_tiet && cls.chi_tiet.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">
                        📊 Chi tiết đánh giá ({cls.chi_tiet.length} tiêu chí)
                      </p>
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-600">
                          ✓ {cls.chi_tiet.filter((d: any) => d.ket_qua === 'DAT').length}
                        </span>
                        <span className="text-red-600">
                          ✗ {cls.chi_tiet.filter((d: any) => d.ket_qua === 'KHONG_DAT').length}
                        </span>
                        <span className="text-yellow-600">
                          ! {cls.chi_tiet.filter((d: any) => d.ket_qua === 'XEM_XET').length}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {cls.chi_tiet.map((detail: any, idx: number) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                            detail.ket_qua === 'DAT' ? 'bg-green-50 border-green-200' :
                            detail.ket_qua === 'KHONG_DAT' ? 'bg-red-50 border-red-200' :
                            'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {detail.ten_tieu_chi || detail.id_tieu_chi}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                              {detail.gia_tri_do && (
                                <p className="text-xs text-muted-foreground">
                                  📏 <span className="font-medium">Giá trị:</span> {detail.gia_tri_do}
                                </p>
                              )}
                              {detail.ghi_chu && (
                                <p className="text-xs text-muted-foreground italic truncate">
                                  📝 {detail.ghi_chu}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            {getStatusBadge(detail.ket_qua)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(cls.thoi_gian_danh_gia).toLocaleString("vi-VN")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Classification Dialog */}
      <Dialog open={showDialog} onOpenChange={onDialogChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedClassification ? "✏️ Cập nhật kết quả phân loại" : "➕ Thêm kết quả phân loại mới"}
            </DialogTitle>
            <DialogDescription>
              Đánh giá hồ sơ theo các tiêu chí phân loại. Kết quả tổng sẽ được tính toán tự động dựa trên các tiêu chí.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Select Submission */}
            <div>
              <label className="text-sm font-medium mb-2 block">📋 Hồ sơ cần đánh giá *</label>
              <Select
                value={formData.id_ho_so_xu_ly}
                onValueChange={(value) =>
                  setFormData({ ...formData, id_ho_so_xu_ly: value })
                }
                disabled={isReadOnly || !!selectedClassification}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn hồ sơ..." />
                </SelectTrigger>
                <SelectContent>
                  {submissions.map((sub: any) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      #{sub.id.slice(0, 8)} - {sub.loai_thuoc?.ten_hoat_chat || 'N/A'} - {sub.so_luong} {sub.don_vi_tinh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Criteria Evaluation */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                ✅ Đánh giá theo tiêu chí ({formData.chi_tiet.filter((d: any) => d.ket_qua !== 'DAT').length > 0 ? formData.chi_tiet.filter((d: any) => d.ket_qua === 'DAT').length + '/' + formData.chi_tiet.length + ' đạt' : 'Tất cả đạt'})
              </label>
              <div className="space-y-3 max-h-[400px] overflow-y-auto p-4 border-2 rounded-lg bg-gray-50">
                {formData.chi_tiet.map((detail: any, idx: number) => (
                  <Card key={idx} className={`border-2 ${
                    detail.ket_qua === 'DAT' ? 'border-green-200 bg-green-50/50' :
                    detail.ket_qua === 'KHONG_DAT' ? 'border-red-200 bg-red-50/50' :
                    'border-yellow-200 bg-yellow-50/50'
                  }`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-500">#{idx + 1}</span>
                          <p className="font-medium text-sm truncate">
                            {detail.ten_tieu_chi || criteria.find((c: any) => c.id === detail.id_tieu_chi)?.ten_tieu_chi}
                          </p>
                        </div>
                        <Select
                          value={detail.ket_qua}
                          onValueChange={(value) => {
                            const newChiTiet = [...formData.chi_tiet];
                            newChiTiet[idx].ket_qua = value;
                            setFormData({ ...formData, chi_tiet: newChiTiet });
                          }}
                          disabled={isReadOnly}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAT">✓ Đạt</SelectItem>
                            <SelectItem value="KHONG_DAT">✗ Không đạt</SelectItem>
                            <SelectItem value="XEM_XET">! Xem xét</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">📏 Giá trị đo</label>
                          <Input
                            value={detail.gia_tri_do}
                            onChange={(e) => {
                              const newChiTiet = [...formData.chi_tiet];
                              newChiTiet[idx].gia_tri_do = e.target.value;
                              setFormData({ ...formData, chi_tiet: newChiTiet });
                            }}
                            placeholder="VD: 98%, 5kg, 100ml..."
                            disabled={isReadOnly}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">📝 Ghi chú</label>
                          <Input
                            value={detail.ghi_chu}
                            onChange={(e) => {
                              const newChiTiet = [...formData.chi_tiet];
                              newChiTiet[idx].ghi_chu = e.target.value;
                              setFormData({ ...formData, chi_tiet: newChiTiet });
                            }}
                            placeholder="Ghi chú riêng cho tiêu chí này..."
                            disabled={isReadOnly}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Overall Result */}
            <div>
              <label className="text-sm font-medium mb-2 block">🎯 Kết quả tổng *</label>
              <Select
                value={formData.ket_qua_tong}
                onValueChange={(value) =>
                  setFormData({ ...formData, ket_qua_tong: value })
                }
                disabled={isReadOnly}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAT">✓ Đạt yêu cầu</SelectItem>
                  <SelectItem value="KHONG_DAT">✗ Không đạt yêu cầu</SelectItem>
                  <SelectItem value="XEM_XET">! Cần xem xét thêm</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                💡 Gợi ý: Chọn "Đạt" nếu tất cả tiêu chí đạt, "Không đạt" nếu có tiêu chí quan trọng không đạt
              </p>
            </div>

            {/* General Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">💬 Ghi chú chung</label>
              <Textarea
                value={formData.ghi_chu_chung}
                onChange={(e) =>
                  setFormData({ ...formData, ghi_chu_chung: e.target.value })
                }
                rows={4}
                placeholder="Nhập ghi chú chung về kết quả phân loại, lý do đánh giá, hoặc các khuyến nghị..."
                disabled={isReadOnly}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onDialogChange(false)} disabled={processing}>
              {isReadOnly ? "Đóng" : "Hủy"}
            </Button>
            {!isReadOnly && (
              <Button onClick={handleSubmit} disabled={processing} className="min-w-32">
                {processing ? "⏳ Đang xử lý..." : selectedClassification ? "💾 Cập nhật" : "✨ Tạo mới"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
