import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  FileText,
  BarChart3,
  Filter,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  ChevronLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react";

interface Props {
  classifications: any[];
  criteria: any[];
  onRefresh: () => void;
  user: any;
  allSubmissions?: any[];
}

export default function ClassificationResultsManagement({
  classifications,
  criteria,
  onRefresh,
  user,
  allSubmissions = [],
}: Props) {
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";
  const isReadOnly = user?.role === "CONGTACVIEN";
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "result">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // View mode
  const [viewMode, setViewMode] = useState<"list" | "grid" | "grouped">("list");
  
  // Grouping
  const [groupBy, setGroupBy] = useState<"none" | "submission" | "result" | "date">("none");
  
  // Form data for editing
  const [formData, setFormData] = useState<any>({
    ket_qua_tong: "",
    ghi_chu_chung: "",
    chi_tiet: [],
  });
  
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    evaluator: "",
    hasNotes: false,
  });
  
  // State for viewing submission details
  const [viewSubmissionDialog, setViewSubmissionDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };
  
  // View submission details
  const handleViewSubmission = (submissionId: string) => {
    setLoadingSubmission(true);
    setViewSubmissionDialog(true);
    
    // Find submission from allSubmissions
    const submission = allSubmissions.find((s: any) => s.id === submissionId);
    if (submission) {
      setSelectedSubmission(submission);
    }
    setLoadingSubmission(false);
  };

  // Handle edit
  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      ket_qua_tong: item.ket_qua_tong,
      ghi_chu_chung: item.ghi_chu_chung || "",
      chi_tiet: item.chi_tiet || [],
    });
    setShowEditDialog(true);
  };

  // Handle delete
  const handleDelete = (item: any) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedItem) return;
    
    setProcessing(true);
    try {
      const response = await apiClient.deleteClassificationResult(selectedItem.id);
      if (response.success) {
        toast({
          title: "Thành công",
          description: "Đã xóa kết quả phân loại",
        });
        setShowDeleteDialog(false);
        setSelectedItem(null);
        onRefresh();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể xóa kết quả phân loại",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Save edit
  const handleSave = async () => {
    if (!selectedItem) return;
    
    setProcessing(true);
    try {
      const response = await apiClient.updateClassificationResult(selectedItem.id, formData);
      if (response.success) {
        toast({
          title: "Thành công",
          description: "Đã cập nhật kết quả phân loại",
        });
        setShowEditDialog(false);
        setSelectedItem(null);
        onRefresh();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể cập nhật kết quả phân loại",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Update criteria result
  const updateCriteriaResult = (index: number, field: string, value: any) => {
    const newChiTiet = [...formData.chi_tiet];
    newChiTiet[index] = { ...newChiTiet[index], [field]: value };
    setFormData({ ...formData, chi_tiet: newChiTiet });
  };

  // Statistics
  const stats = {
    total: classifications.length,
    dat: classifications.filter((c: any) => c.ket_qua_tong === "DAT").length,
    khong_dat: classifications.filter((c: any) => c.ket_qua_tong === "KHONG_DAT")
      .length,
    xem_xet: classifications.filter((c: any) => c.ket_qua_tong === "XEM_XET")
      .length,
  };

  // Filtered classifications
  const filteredClassifications = classifications
    .filter((cls: any) => {
      const matchStatus =
        filterStatus === "all" || cls.ket_qua_tong === filterStatus;
      const matchSearch =
        !searchTerm ||
        cls.id_ho_so_xu_ly?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.ghi_chu_chung?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.ten_nguoi_danh_gia?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Advanced filters
      const matchDateFrom = !advancedFilters.dateFrom ||
        new Date(cls.thoi_gian_danh_gia) >= new Date(advancedFilters.dateFrom);
      const matchDateTo = !advancedFilters.dateTo ||
        new Date(cls.thoi_gian_danh_gia) <= new Date(advancedFilters.dateTo);
      const matchEvaluator = !advancedFilters.evaluator ||
        cls.ten_nguoi_danh_gia?.includes(advancedFilters.evaluator);
      const matchHasNotes = !advancedFilters.hasNotes ||
        (cls.ghi_chu_chung && cls.ghi_chu_chung.trim().length > 0);
        
      return matchStatus && matchSearch && matchDateFrom && matchDateTo && 
             matchEvaluator && matchHasNotes;
    })
    .sort((a: any, b: any) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.thoi_gian_danh_gia || 0).getTime() - new Date(b.thoi_gian_danh_gia || 0).getTime();
      } else if (sortBy === "result") {
        comparison = (a.ket_qua_tong || "").localeCompare(b.ket_qua_tong || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
  // Group classifications if needed
  const groupedClassifications = groupBy === "none" 
    ? { "all": filteredClassifications }
    : filteredClassifications.reduce((groups: any, cls: any) => {
        let key = "";
        if (groupBy === "submission") {
          key = cls.id_ho_so_xu_ly?.substring(0, 8) || "Unknown";
        } else if (groupBy === "result") {
          key = cls.ket_qua_tong || "Unknown";
        } else if (groupBy === "date") {
          key = new Date(cls.thoi_gian_danh_gia).toLocaleDateString("vi-VN");
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(cls);
        return groups;
      }, {});

  const totalPages = Math.ceil(filteredClassifications.length / itemsPerPage);
  const paginatedClassifications = groupBy === "none"
    ? filteredClassifications.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : filteredClassifications; // Show all when grouped
    
  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      ["ID hồ sơ", "Kết quả", "Người đánh giá", "Thời gian", "Ghi chú", "Chi tiết"].join(","),
      ...filteredClassifications.map((c: any) => {
        const chiTiet = c.chi_tiet || [];
        const dat = chiTiet.filter((d: any) => d.ket_qua === "DAT").length;
        const total = chiTiet.length;
        return [
          c.id_ho_so_xu_ly?.substring(0, 16),
          c.ket_qua_tong,
          c.ten_nguoi_danh_gia || "N/A",
          new Date(c.thoi_gian_danh_gia).toLocaleDateString("vi-VN"),
          `"${(c.ghi_chu_chung || "").replace(/"/g, '""')}"`,
          `${dat}/${total} đạt`
        ].join(",");
      })
    ].join("\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ket-qua-phan-loai-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "Thành công",
      description: "Đã xuất dữ liệu ra file CSV",
    });
  };
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, sortOrder, groupBy, advancedFilters]);

  // Get result badge
  const getResultBadge = (result: string) => {
    switch (result) {
      case "DAT":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Đạt
          </Badge>
        );
      case "KHONG_DAT":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Không đạt
          </Badge>
        );
      case "XEM_XET":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Xem xét
          </Badge>
        );
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  // Get criteria summary
  const getCriteriaSummary = (chiTiet: any[]) => {
    if (!chiTiet || chiTiet.length === 0) return "Chưa có tiêu chí";
    
    const dat = chiTiet.filter((c: any) => c.ket_qua === "DAT").length;
    const khongDat = chiTiet.filter((c: any) => c.ket_qua === "KHONG_DAT").length;
    const xemXet = chiTiet.filter((c: any) => c.ket_qua === "XEM_XET").length;
    const total = chiTiet.length;

    return (
      <div className="flex gap-4 text-sm">
        <span className="text-green-600 font-medium">{dat}/{total} đạt</span>
        <span className="text-red-600 font-medium">{khongDat}/{total} không đạt</span>
        {xemXet > 0 && <span className="text-yellow-600 font-medium">{xemXet}/{total} xem xét</span>}
      </div>
    );
  };
  
  // Render classification item
  const renderClassificationItem = (cls: any, isLastInGroup: boolean = false) => {
    const isExpanded = expandedItems.has(cls.id);
    const chiTiet = cls.chi_tiet || [];
    
    return (
      <div 
        key={cls.id} 
        className={`p-4 hover:bg-muted/30 transition-colors ${!isLastInGroup ? 'border-b' : ''}`}
      >
        {/* Header - Always Visible */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Top row: Result badge and ID */}
            <div className="flex items-center gap-3">
              {getResultBadge(cls.ket_qua_tong)}
              <span className="text-sm text-muted-foreground font-mono">
                <FileText className="inline h-3 w-3 mr-1" />
                {cls.id_ho_so_xu_ly?.substring(0, 8)}...
              </span>
            </div>

            {/* Criteria summary */}
            <div className="flex items-center gap-4">
              {getCriteriaSummary(chiTiet)}
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {cls.ten_nguoi_danh_gia && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {cls.ten_nguoi_danh_gia}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(cls.thoi_gian_danh_gia).toLocaleDateString("vi-VN")}
              </span>
            </div>

            {/* Note preview */}
            {cls.ghi_chu_chung && (
              <p className="text-sm text-muted-foreground italic">
                {cls.ghi_chu_chung.length > 100
                  ? `${cls.ghi_chu_chung.substring(0, 100)}...`
                  : cls.ghi_chu_chung}
              </p>
            )}
          </div>

          {/* Action Buttons - Redesigned with harmonious layout */}
          <div className="ml-4 flex items-center gap-2">
            {/* Expand/Collapse - Simple ghost button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpand(cls.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Ẩn
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 mr-1" />
                  Chi tiết ({chiTiet.length})
                </>
              )}
            </Button>
            
            {/* View Submission - Subtle outline */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (cls.id_ho_so_xu_ly) {
                  handleViewSubmission(cls.id_ho_so_xu_ly);
                }
              }}
              className="hover:bg-muted"
              title="Xem thông tin đầy đủ hồ sơ nộp thuốc"
            >
              <FileText className="h-3 w-3 mr-1" />
              Xem hồ sơ
            </Button>
            
            {/* Admin Actions - Subtle and minimal */}
            {isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(cls)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(cls)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && chiTiet.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <h4 className="font-semibold text-sm mb-3">
              Chi tiết tiêu chí đánh giá:
            </h4>
            {chiTiet.map((detail: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
              >
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    {detail.ten_tieu_chi || detail.ma_tieu_chi}
                  </span>
                  {detail.ghi_chu && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {detail.ghi_chu}
                    </p>
                  )}
                  {detail.gia_tri_do && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Giá trị: {detail.gia_tri_do}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  {getResultBadge(detail.ket_qua)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Kết quả phân loại
          </h2>
          <p className="text-muted-foreground">
            Quản lý và theo dõi kết quả đánh giá phân loại hồ sơ
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Statistics Cards with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Tổng số</span>
              <BarChart3 className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tổng kết quả phân loại
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center justify-between">
              <span>Đạt</span>
              <CheckCircle2 className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">
                {stats.dat}
              </span>
              {stats.total > 0 && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>{Math.round((stats.dat / stats.total) * 100)}%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đạt tiêu chuẩn phân loại
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center justify-between">
              <span>Không đạt</span>
              <XCircle className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-600">
                {stats.khong_dat}
              </span>
              {stats.total > 0 && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>{Math.round((stats.khong_dat / stats.total) * 100)}%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Không đạt tiêu chuẩn
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center justify-between">
              <span>Xem xét</span>
              <AlertCircle className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-yellow-600">
                {stats.xem_xet}
              </span>
              {stats.total > 0 && (
                <div className="flex items-center gap-1 text-sm text-yellow-600">
                  <Minus className="h-3 w-3" />
                  <span>{Math.round((stats.xem_xet / stats.total) * 100)}%</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cần xem xét thêm
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="list">Danh sách</TabsTrigger>
          <TabsTrigger value="grid">Lưới</TabsTrigger>
          <TabsTrigger value="grouped">Nhóm</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo ID hồ sơ, người đánh giá, ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="md:col-span-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kết quả</SelectItem>
              <SelectItem value="DAT">Đạt</SelectItem>
              <SelectItem value="KHONG_DAT">Không đạt</SelectItem>
              <SelectItem value="XEM_XET">Xem xét</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Ngày đánh giá</SelectItem>
              <SelectItem value="result">Kết quả</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không nhóm</SelectItem>
              <SelectItem value="submission">Nhóm theo hồ sơ</SelectItem>
              <SelectItem value="result">Nhóm theo kết quả</SelectItem>
              <SelectItem value="date">Nhóm theo ngày</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Filter className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bộ lọc nâng cao</DialogTitle>
                <DialogDescription>
                  Lọc kết quả phân loại theo nhiều tiêu chí
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Từ ngày</Label>
                    <Input
                      type="date"
                      value={advancedFilters.dateFrom}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, dateFrom: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Đến ngày</Label>
                    <Input
                      type="date"
                      value={advancedFilters.dateTo}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, dateTo: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Người đánh giá</Label>
                  <Input
                    value={advancedFilters.evaluator}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, evaluator: e.target.value})}
                    placeholder="Nhập tên người đánh giá"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hasNotes"
                    checked={advancedFilters.hasNotes}
                    onChange={(e) => setAdvancedFilters({...advancedFilters, hasNotes: e.target.checked})}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="hasNotes" className="cursor-pointer">
                    Chỉ hiển thị kết quả có ghi chú
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setAdvancedFilters({dateFrom: "", dateTo: "", evaluator: "", hasNotes: false})}
                  >
                    Xóa bộ lọc
                  </Button>
                  <Button className="flex-1">
                    Áp dụng
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Active Filters Display */}
      {(searchTerm || advancedFilters.dateFrom || advancedFilters.dateTo || 
        advancedFilters.evaluator || advancedFilters.hasNotes) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Bộ lọc đang áp dụng:</span>
          {searchTerm && (
            <Badge variant="secondary">
              Tìm kiếm: "{searchTerm}"
              <button onClick={() => setSearchTerm("")} className="ml-1">×</button>
            </Badge>
          )}
          {advancedFilters.dateFrom && (
            <Badge variant="secondary">
              Từ: {advancedFilters.dateFrom}
              <button onClick={() => setAdvancedFilters({...advancedFilters, dateFrom: ""})} className="ml-1">×</button>
            </Badge>
          )}
          {advancedFilters.dateTo && (
            <Badge variant="secondary">
              Đến: {advancedFilters.dateTo}
              <button onClick={() => setAdvancedFilters({...advancedFilters, dateTo: ""})} className="ml-1">×</button>
            </Badge>
          )}
          {advancedFilters.evaluator && (
            <Badge variant="secondary">
              Đánh giá: {advancedFilters.evaluator}
              <button onClick={() => setAdvancedFilters({...advancedFilters, evaluator: ""})} className="ml-1">×</button>
            </Badge>
          )}
          {advancedFilters.hasNotes && (
            <Badge variant="secondary">
              Có ghi chú
              <button onClick={() => setAdvancedFilters({...advancedFilters, hasNotes: false})} className="ml-1">×</button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Hiển thị {groupBy === "none" ? paginatedClassifications.length : filteredClassifications.length} / {filteredClassifications.length} kết quả
          {searchTerm && ` (tìm kiếm: "${searchTerm}")`}
        </p>
        {groupBy === "none" && (
          <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="25">25 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
              <SelectItem value="100">100 / trang</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {viewMode === "grouped" && groupBy !== "none" ? (
          // Grouped View
          Object.entries(groupedClassifications).map(([groupKey, items]: [string, any]) => (
            <Card key={groupKey} className="border-2">
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>
                    {groupBy === "submission" && `Hồ sơ: ${groupKey}...`}
                    {groupBy === "result" && getResultBadge(groupKey)}
                    {groupBy === "date" && `Ngày: ${groupKey}`}
                  </span>
                  <Badge variant="outline">{items.length} kết quả</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {items.map((cls: any, idx: number) => renderClassificationItem(cls, idx === items.length - 1))}
              </CardContent>
            </Card>
          ))
        ) : (
          // List/Grid View
          paginatedClassifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Không tìm thấy kết quả phân loại nào</p>
                <p className="text-sm mt-2">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
              </CardContent>
            </Card>
          ) : (
            paginatedClassifications.map((cls: any) => renderClassificationItem(cls, false))
          )
        )}
      </div>

      {/* Pagination - only for non-grouped view */}
      {groupBy === "none" && totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Trang {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = currentPage <= 3 
                ? i + 1 
                : currentPage >= totalPages - 2 
                  ? totalPages - 4 + i 
                  : currentPage - 2 + i;
              if (pageNum < 1 || pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa kết quả phân loại</DialogTitle>
            <DialogDescription>
              Cập nhật kết quả tổng và chi tiết đánh giá tiêu chí
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Overall Result */}
            <div className="space-y-2">
              <Label>Kết quả tổng</Label>
              <Select
                value={formData.ket_qua_tong}
                onValueChange={(value) =>
                  setFormData({ ...formData, ket_qua_tong: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAT">Đạt</SelectItem>
                  <SelectItem value="KHONG_DAT">Không đạt</SelectItem>
                  <SelectItem value="XEM_XET">Xem xét</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* General Notes */}
            <div className="space-y-2">
              <Label>Ghi chú chung</Label>
              <Textarea
                value={formData.ghi_chu_chung}
                onChange={(e) =>
                  setFormData({ ...formData, ghi_chu_chung: e.target.value })
                }
                placeholder="Nhập ghi chú chung cho kết quả phân loại..."
                rows={3}
              />
            </div>

            {/* Criteria Details */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Chi tiết tiêu chí</Label>
              {formData.chi_tiet?.map((detail: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="p-4 space-y-3">
                    <div className="font-medium text-sm">
                      {detail.ten_tieu_chi || criteria.find((c: any) => c.id === detail.id_tieu_chi)?.ten_tieu_chi}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Kết quả</Label>
                        <Select
                          value={detail.ket_qua}
                          onValueChange={(value) =>
                            updateCriteriaResult(idx, "ket_qua", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAT">Đạt</SelectItem>
                            <SelectItem value="KHONG_DAT">Không đạt</SelectItem>
                            <SelectItem value="XEM_XET">Xem xét</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Giá trị đo</Label>
                        <Input
                          value={detail.gia_tri_do || ""}
                          onChange={(e) =>
                            updateCriteriaResult(idx, "gia_tri_do", e.target.value)
                          }
                          placeholder="Nhập giá trị..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ghi chú</Label>
                      <Textarea
                        value={detail.ghi_chu || ""}
                        onChange={(e) =>
                          updateCriteriaResult(idx, "ghi_chu", e.target.value)
                        }
                        placeholder="Nhập ghi chú cho tiêu chí..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={processing}
            >
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={processing}>
              <Save className="h-4 w-4 mr-1" />
              {processing ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa kết quả phân loại này? Hành động này không thể hoàn tác.
              {selectedItem && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <div>ID hồ sơ: {selectedItem.id_ho_so_xu_ly?.substring(0, 16)}...</div>
                  <div>Kết quả: {selectedItem.ket_qua_tong}</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={processing}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Submission Dialog */}
      <Dialog open={viewSubmissionDialog} onOpenChange={setViewSubmissionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết hồ sơ nộp thuốc</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết của hồ sơ được phân loại
            </DialogDescription>
          </DialogHeader>

          {loadingSubmission ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Đang tải...</span>
            </div>
          ) : selectedSubmission ? (
            <div className="space-y-4">
              {/* Submission ID */}
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">Mã hồ sơ</Label>
                <p className="font-mono text-sm">{selectedSubmission.id}</p>
              </div>

              {/* Medicine Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin thuốc</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tên hoạt chất</Label>
                    <p className="font-medium">{selectedSubmission.ten_hoat_chat || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Thương hiệu</Label>
                    <p className="font-medium">{selectedSubmission.thuong_hieu || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hàm lượng</Label>
                    <p className="font-medium">{selectedSubmission.ham_luong || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Dạng bào chế</Label>
                    <p className="font-medium">{selectedSubmission.dang_bao_che || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Số lượng</Label>
                    <p className="font-medium">{selectedSubmission.so_luong} {selectedSubmission.don_vi_tinh}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hạn dùng</Label>
                    <p className="font-medium">
                      {selectedSubmission.han_dung 
                        ? new Date(selectedSubmission.han_dung).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* User & Pharmacy Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Người nộp</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Họ tên</Label>
                      <p className="font-medium">{selectedSubmission.ho_ten || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Nhà thuốc</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Tên nhà thuốc</Label>
                      <p className="font-medium">{selectedSubmission.ten_nha_thuoc || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Certificate - Prominent */}
              {selectedSubmission.duong_dan_chung_nhan && (
                <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                      <FileText className="h-5 w-5" />
                      📄 Chứng nhận đính kèm
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={selectedSubmission.duong_dan_chung_nhan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Xem file chứng nhận
                    </a>
                    <p className="text-xs text-blue-700 mt-2">Tài liệu xác thực hồ sơ nộp thuốc</p>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedSubmission.ghi_chu && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ghi chú</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedSubmission.ghi_chu}</p>
                  </CardContent>
                </Card>
              )}

              {/* Status & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                  <p className="font-medium">{selectedSubmission.ket_qua || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Thời gian xử lý</Label>
                  <p className="font-medium">
                    {selectedSubmission.thoi_gian_xu_ly
                      ? new Date(selectedSubmission.thoi_gian_xu_ly).toLocaleString("vi-VN")
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Không có dữ liệu
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSubmissionDialog(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
