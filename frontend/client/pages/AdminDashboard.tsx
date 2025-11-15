import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ClassificationResultsManagement from "@/components/ClassificationResultsManagement";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Gift,
  MessageSquare,
  BarChart3,
  Settings,
  Users,
  Send,
  Trash2,
  Edit2,
  Plus,
  Star,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { AdminChatbot } from "@/components/AdminChatbot";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>(
    user?.role === "CONGTACVIEN" ? "classifications" : "submissions"
  );
  
  // Submissions
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]); // All submissions for dropdowns
  const [submissions, setSubmissions] = useState<any[]>([]); // Filtered submissions
  const [submissionFilter, setSubmissionFilter] = useState<string>(""); // Show all by default
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  
  // Classification Results
  const [classificationResults, setClassificationResults] = useState<any[]>([]);
  const [selectedClassification, setSelectedClassification] = useState<any | null>(null);
  const [showClassificationDialog, setShowClassificationDialog] = useState(false);
  
  // Vouchers
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  
  // Notifications
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationType, setNotificationType] = useState<"system" | "user">("system");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Criteria
  const [criteria, setCriteria] = useState<any[]>([]);

  useEffect(() => {
    if (user && (user.role === "ADMIN" || user.role === "CONGTACVIEN")) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // Filter submissions when filter changes
    if (submissionFilter) {
      const filtered = allSubmissions.filter((s) => s.ket_qua === submissionFilter);
      setSubmissions(filtered);
    } else {
      setSubmissions(allSubmissions);
    }
  }, [submissionFilter, allSubmissions]);

  const loadData = async () => {
    try {
      setLoading(true);
      const isAdmin = user?.role === "ADMIN";
      const isCollaborator = user?.role === "CONGTACVIEN";
      
      if (isCollaborator) {
        // CONGTACVIEN only needs classifications and criteria
        const [classificationRes, criteriaRes] = await Promise.all([
          apiClient.getClassificationResults(),
          apiClient.getCriteria(),
        ]);
        
        if (classificationRes.success) {
          setClassificationResults(Array.isArray(classificationRes.data) ? classificationRes.data : []);
        }
        if (criteriaRes.success) {
          setCriteria(Array.isArray(criteriaRes.data) ? criteriaRes.data : []);
        }
        
        // Set empty arrays for admin-only data
        setAllSubmissions([]);
        setSubmissions([]);
        setVouchers([]);
        setUsers([]);
        setStatistics(null);
      } else if (isAdmin) {
        // Admin loads all data
        const promises: Promise<any>[] = [
          apiClient.getAdminStatistics(),
          apiClient.getAdminSubmissions(),
          apiClient.getClassificationResults(),
          apiClient.getCriteria(),
          apiClient.getAdminVouchers(),
          apiClient.getUsers(),
        ];

        const [
          statsRes,
          allSubmissionsRes,
          classificationRes,
          criteriaRes,
          vouchersRes,
          usersRes,
        ] = await Promise.all(promises);

        if (statsRes.success) setStatistics(statsRes.data || null);
        if (allSubmissionsRes.success) {
          const submissionsData = Array.isArray(allSubmissionsRes.data) ? allSubmissionsRes.data : [];
          
          // 🔍 DEBUG: Check certificate data
          console.log('📊 [AdminDashboard] Total submissions loaded:', submissionsData.length);
          const approvedWithCerts = submissionsData.filter((s: any) => 
            s.ket_qua === 'approved' && s.duong_dan_chung_nhan
          );
          console.log('✅ [AdminDashboard] Approved submissions with certificates:', approvedWithCerts.length);
          
          if (approvedWithCerts.length > 0) {
            console.log('📄 [AdminDashboard] Sample submission with certificate:', {
              id: approvedWithCerts[0].id?.substring(0, 8),
              ho_ten: approvedWithCerts[0].ho_ten,
              ket_qua: approvedWithCerts[0].ket_qua,
              duong_dan_chung_nhan: approvedWithCerts[0].duong_dan_chung_nhan,
            });
          } else {
            console.warn('⚠️ [AdminDashboard] No approved submissions with certificates found!');
            console.log('Sample submission structure:', submissionsData[0]);
          }
          
          setAllSubmissions(submissionsData);
          // Apply filter
          if (submissionFilter) {
            const filtered = submissionsData.filter((s: any) => s.ket_qua === submissionFilter);
            setSubmissions(filtered);
          } else {
            setSubmissions(submissionsData);
          }
        }
        if (classificationRes.success) setClassificationResults(Array.isArray(classificationRes.data) ? classificationRes.data : []);
        if (criteriaRes.success) setCriteria(Array.isArray(criteriaRes.data) ? criteriaRes.data : []);
        if (vouchersRes.success) setVouchers(Array.isArray(vouchersRes.data) ? vouchersRes.data : []);
        if (usersRes.success) setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Lỗi",
        description: error.detail || error.error || error.message || "Không thể tải dữ liệu",
        variant: "destructive",
      });
      // Set empty arrays on error to prevent crashes
      setAllSubmissions([]);
      setSubmissions([]);
      setVouchers([]);
      setClassificationResults([]);
      setCriteria([]);
      setUsers([]);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  // Authorization check
  if (user?.role !== "ADMIN" && user?.role !== "CONGTACVIEN") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">Không có quyền truy cập</p>
              <p className="text-muted-foreground">
                Chỉ Admin và Cộng tác viên mới có thể truy cập trang này
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div>Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý hệ thống</h1>
          <p className="text-muted-foreground">
            Quản lý hồ sơ, voucher, thông báo và thống kê
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {user?.role === "ADMIN" ? "Quản trị viên" : "Cộng tác viên"}
        </Badge>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Tổng hồ sơ</p>
                  <p className="text-2xl font-bold">{statistics.submissions?.total || 0}</p>
                  <p className="text-xs text-yellow-600">
                    Chờ: {statistics.submissions?.pending || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Voucher</p>
                  <p className="text-2xl font-bold">{statistics.vouchers?.active || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Còn lại: {statistics.vouchers?.total_remaining || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Người dùng</p>
                  <p className="text-2xl font-bold">{statistics.users?.users || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Tổng điểm: {statistics.users?.total_points || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Điểm thưởng</p>
                  <p className="text-2xl font-bold">{statistics.points?.total_awarded || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    Giao dịch: {statistics.points?.completed_transactions || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${user?.role === "ADMIN" ? "grid-cols-7" : "grid-cols-1"}`}>
          {user?.role === "ADMIN" && (
            <TabsTrigger value="submissions">
              <FileText className="h-4 w-4 mr-2" />
              Hồ sơ
            </TabsTrigger>
          )}
          <TabsTrigger value="classifications">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Kết quả phân loại
          </TabsTrigger>
          {user?.role === "ADMIN" && (
            <>
              <TabsTrigger value="collaborators">
                <Users className="h-4 w-4 mr-2" />
                Cộng tác viên
              </TabsTrigger>
              <TabsTrigger value="vouchers">
                <Gift className="h-4 w-4 mr-2" />
                Voucher
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <MessageSquare className="h-4 w-4 mr-2" />
                Thông báo
              </TabsTrigger>
              <TabsTrigger value="chatbot">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chatbot
              </TabsTrigger>
              <TabsTrigger value="statistics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Thống kê
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Submissions Tab - Admin only */}
        {user?.role === "ADMIN" && (
          <TabsContent value="submissions">
            <SubmissionsManagement
              submissions={submissions}
              criteria={criteria}
              submissionFilter={submissionFilter}
              onFilterChange={setSubmissionFilter}
              onRefresh={loadData}
              onSubmissionSelect={setSelectedSubmission}
              showDialog={showSubmissionDialog}
              onDialogChange={setShowSubmissionDialog}
              selectedSubmission={selectedSubmission}
              user={user}
            />
          </TabsContent>
        )}

        {/* Classifications Tab */}
        <TabsContent value="classifications">
          <ClassificationResultsManagement
            classifications={classificationResults}
            criteria={criteria}
            onRefresh={loadData}
            user={user}
            allSubmissions={allSubmissions}
          />
        </TabsContent>

        {/* Collaborators Tab - Admin only */}
        {user?.role === "ADMIN" && (
          <TabsContent value="collaborators">
            <CollaboratorsManagement onRefresh={loadData} />
          </TabsContent>
        )}

        {/* Vouchers Tab - Admin only */}
        {user?.role === "ADMIN" && (
          <TabsContent value="vouchers">
            <VouchersManagement
              vouchers={vouchers}
              onRefresh={loadData}
              onVoucherSelect={setSelectedVoucher}
              showDialog={showVoucherDialog}
              onDialogChange={setShowVoucherDialog}
              selectedVoucher={selectedVoucher}
            />
          </TabsContent>
        )}

        {/* Notifications Tab - Admin only */}
        {user?.role === "ADMIN" && (
          <TabsContent value="notifications">
            <NotificationsManagement
              users={users}
              onRefresh={loadData}
              showDialog={showNotificationDialog}
              onDialogChange={setShowNotificationDialog}
              notificationType={notificationType}
              onNotificationTypeChange={setNotificationType}
            />
          </TabsContent>
        )}

        {/* Chatbot Tab - Admin only */}
        {user?.role === "ADMIN" && (
          <TabsContent value="chatbot">
            <AdminChatbot users={users} />
          </TabsContent>
        )}

        {/* Statistics Tab - Admin only */}
        {user?.role === "ADMIN" && (
          <TabsContent value="statistics">
            <StatisticsDashboard statistics={statistics} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Submissions Management Component
function SubmissionsManagement({
  submissions,
  criteria,
  submissionFilter,
  onFilterChange,
  onRefresh,
  onSubmissionSelect,
  showDialog,
  onDialogChange,
  selectedSubmission,
  user,
}: any) {
  const { toast } = useToast();
  const [actionData, setActionData] = useState<any>({
    action: "approve",
    points_system: "system",
    points: null,
    ghi_chu: "",
    classifications: [],
  });
  const [processing, setProcessing] = useState(false);
  
  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "status" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");
  
  // Quick view
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  
  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: "",
    dateTo: "",
    pharmacyId: "",
    minQuantity: "",
    maxQuantity: "",
  });

  // Filter and sort submissions
  const filteredSubmissions = submissions
    .filter((sub: any) => {
      const matchesSearch = searchQuery === "" || 
        sub.ten_hoat_chat?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.thuong_hieu?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.ho_ten?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Advanced filters
      const matchesDateFrom = !advancedFilters.dateFrom || 
        new Date(sub.thoi_gian_xu_ly) >= new Date(advancedFilters.dateFrom);
      const matchesDateTo = !advancedFilters.dateTo || 
        new Date(sub.thoi_gian_xu_ly) <= new Date(advancedFilters.dateTo);
      const matchesMinQty = !advancedFilters.minQuantity || 
        (sub.so_luong || 0) >= parseInt(advancedFilters.minQuantity);
      const matchesMaxQty = !advancedFilters.maxQuantity || 
        (sub.so_luong || 0) <= parseInt(advancedFilters.maxQuantity);
      const matchesPharmacy = !advancedFilters.pharmacyId || 
        sub.id_nha_thuoc === advancedFilters.pharmacyId;
        
      return matchesSearch && matchesDateFrom && matchesDateTo && 
             matchesMinQty && matchesMaxQty && matchesPharmacy;
    })
    .sort((a: any, b: any) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison = new Date(a.thoi_gian_xu_ly || 0).getTime() - new Date(b.thoi_gian_xu_ly || 0).getTime();
      } else if (sortBy === "status") {
        comparison = (a.ket_qua || "").localeCompare(b.ket_qua || "");
      } else if (sortBy === "name") {
        comparison = (a.ho_ten || "").localeCompare(b.ho_ten || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Bulk action handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSubmissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSubmissions.map((s: any) => s.id)));
    }
  };
  
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const handleBulkAction = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một hồ sơ",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setProcessing(true);
      // TODO: Implement bulk action API call
      const promises = Array.from(selectedIds).map(id => 
        apiClient.handleSubmissionAction(id, { action: bulkAction })
      );
      await Promise.all(promises);
      
      toast({
        title: "Thành công",
        description: `Đã xử lý ${selectedIds.size} hồ sơ`,
      });
      setSelectedIds(new Set());
      setShowBulkDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xử lý hàng loạt",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      ["ID", "Thuốc", "Thương hiệu", "Người nộp", "Số lượng", "Đơn vị", "Trạng thái", "Ngày nộp"].join(","),
      ...filteredSubmissions.map((s: any) => 
        [
          s.id,
          s.ten_hoat_chat,
          s.thuong_hieu,
          s.ho_ten,
          s.so_luong,
          s.don_vi_tinh,
          s.ket_qua,
          new Date(s.thoi_gian_xu_ly).toLocaleDateString("vi-VN")
        ].join(",")
      )
    ].join("\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ho-so-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "Thành công",
      description: "Đã xuất dữ liệu ra file CSV",
    });
  };

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, submissionFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (selectedSubmission && criteria.length > 0) {
      const initialClassifications = criteria.map((c: any) => ({
        id_tieu_chi: c.id,
        ket_qua: "DAT",
        gia_tri_do: "",
        ghi_chu: "",
      }));
      setActionData({
        action: "approve",
        points_system: "system",
        points: null,
        ghi_chu: "",
        classifications: initialClassifications,
      });
    }
  }, [selectedSubmission, criteria]);

  const handleAction = async () => {
    if (!selectedSubmission) return;

    // Validate points if provided
    if (actionData.points !== null && actionData.points !== undefined && actionData.points < 0) {
      toast({
        title: "Lỗi",
        description: "Điểm thưởng không thể âm",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const result = await apiClient.handleSubmissionAction(selectedSubmission.id, actionData);
      toast({
        title: "Thành công",
        description: result.data?.message || "Đã xử lý hồ sơ thành công",
      });
      onDialogChange(false);
      // Reset form after success
      setActionData({
        action: "approve",
        points_system: "system",
        points: null,
        ghi_chu: "",
        classifications: criteria.length > 0 ? criteria.map((c: any) => ({
          id_tieu_chi: c.id,
          ket_qua: "DAT",
          gia_tri_do: "",
          ghi_chu: "",
        })) : [],
      });
      onRefresh();
    } catch (error: any) {
      console.error("Error handling submission action:", error);
      toast({
        title: "Lỗi",
        description: error.detail || error.error || error.message || "Không thể xử lý hồ sơ",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Chờ duyệt</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Đã duyệt</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Từ chối</Badge>;
      case "returned_to_pharmacy":
        return <Badge className="bg-blue-100 text-blue-800">Trả về nhà thuốc</Badge>;
      case "recalled":
        return <Badge className="bg-orange-100 text-orange-800">Thu hồi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Quản lý Hồ sơ</h3>
          <Badge variant="outline">
            {filteredSubmissions.length} hồ sơ
          </Badge>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowBulkDialog(true)}
              className="bg-blue-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Xử lý {selectedIds.size} đã chọn
            </Button>
          )}
          <Button variant="outline" onClick={exportToCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
          <Button onClick={onRefresh} variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên thuốc, thương hiệu, người nộp, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Select
            value={submissionFilter && submissionFilter.length > 0 ? submissionFilter : "all"}
            onValueChange={(value) => onFilterChange(value === "all" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
              <SelectItem value="returned_to_pharmacy">Trả về nhà thuốc</SelectItem>
              <SelectItem value="recalled">Thu hồi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Ngày nộp</SelectItem>
              <SelectItem value="status">Trạng thái</SelectItem>
              <SelectItem value="name">Người nộp</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="25">25 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
              <SelectItem value="100">100 / trang</SelectItem>
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
                  Lọc hồ sơ theo nhiều tiêu chí
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Số lượng tối thiểu</Label>
                    <Input
                      type="number"
                      value={advancedFilters.minQuantity}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, minQuantity: e.target.value})}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Số lượng tối đa</Label>
                    <Input
                      type="number"
                      value={advancedFilters.maxQuantity}
                      onChange={(e) => setAdvancedFilters({...advancedFilters, maxQuantity: e.target.value})}
                      placeholder="9999"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setAdvancedFilters({dateFrom: "", dateTo: "", pharmacyId: "", minQuantity: "", maxQuantity: ""})}
                  >
                    Xóa bộ lọc
                  </Button>
                  <Button className="flex-1" onClick={() => setCurrentPage(1)}>
                    Áp dụng
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchQuery || advancedFilters.dateFrom || advancedFilters.dateTo || 
        advancedFilters.minQuantity || advancedFilters.maxQuantity) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Bộ lọc đang áp dụng:</span>
          {searchQuery && (
            <Badge variant="secondary">
              Tìm kiếm: "{searchQuery}"
              <button onClick={() => setSearchQuery("")} className="ml-1">×</button>
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
          {advancedFilters.minQuantity && (
            <Badge variant="secondary">
              SL ≥ {advancedFilters.minQuantity}
              <button onClick={() => setAdvancedFilters({...advancedFilters, minQuantity: ""})} className="ml-1">×</button>
            </Badge>
          )}
          {advancedFilters.maxQuantity && (
            <Badge variant="secondary">
              SL ≤ {advancedFilters.maxQuantity}
              <button onClick={() => setAdvancedFilters({...advancedFilters, maxQuantity: ""})} className="ml-1">×</button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Hiển thị {paginatedSubmissions.length} / {filteredSubmissions.length} hồ sơ
          {searchQuery && ` (tìm kiếm: "${searchQuery}")`}
        </p>
        {selectedIds.size > 0 && (
          <p className="text-blue-600 font-medium">
            Đã chọn {selectedIds.size} hồ sơ
          </p>
        )}
      </div>

      {/* Submissions Table/Grid */}
      <div className="space-y-2">
        {/* Table Header with Select All */}
        {paginatedSubmissions.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg text-sm font-medium">
            <input
              type="checkbox"
              checked={selectedIds.size === paginatedSubmissions.length && paginatedSubmissions.length > 0}
              onChange={toggleSelectAll}
              className="h-4 w-4"
            />
            <div className="flex-1 grid grid-cols-5 gap-4">
              <span>Thuốc & Người nộp</span>
              <span>Số lượng</span>
              <span>Nhà thuốc</span>
              <span>Ngày nộp</span>
              <span>Trạng thái</span>
            </div>
            <div className="w-32 text-right">Thao tác</div>
          </div>
        )}
        
        {paginatedSubmissions.map((sub: any) => (
          <Card 
            key={sub.id} 
            className={`transition-all ${
              selectedIds.has(sub.id) ? 'ring-2 ring-blue-500 bg-blue-50/50' : 'hover:shadow-md'
            } ${quickViewId === sub.id ? 'ring-2 ring-purple-500' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(sub.id)}
                  onChange={() => toggleSelect(sub.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div>
                    <p className="font-medium">{sub.ten_hoat_chat} - {sub.thuong_hieu}</p>
                    <p className="text-sm text-muted-foreground">{sub.ho_ten}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {sub.id.substring(0, 8)}...
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">{sub.so_luong} {sub.don_vi_tinh}</p>
                  </div>
                  <div>
                    <p className="text-sm">{sub.ten_nha_thuoc}</p>
                  </div>
                  <div>
                    <p className="text-sm">
                      {sub.thoi_gian_xu_ly
                        ? new Date(sub.thoi_gian_xu_ly).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(sub.ket_qua)}
                  </div>
                </div>
                <div className="flex gap-2 w-32 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickViewId(quickViewId === sub.id ? null : sub.id)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onSubmissionSelect(sub);
                      onDialogChange(true);
                    }}
                    disabled={sub.ket_qua !== "pending" && user?.role !== "ADMIN"}
                  >
                    {sub.ket_qua === "pending" ? "Xử lý" : "Chi tiết"}
                  </Button>
                </div>
              </div>
              
              {/* Quick View */}
              {quickViewId === sub.id && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Hàm lượng:</span>
                      <p className="font-medium">{sub.ham_luong || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dạng bào chế:</span>
                      <p className="font-medium">{sub.dang_bao_che || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hạn dùng:</span>
                      <p className="font-medium">
                        {sub.han_dung ? new Date(sub.han_dung).toLocaleDateString("vi-VN") : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Điểm đã trao:</span>
                      <p className="font-medium">{sub.diem_da_trao || 0} điểm</p>
                    </div>
                  </div>
                  
                  {/* Certificate - Detailed view in Quick View */}
                  {sub.duong_dan_chung_nhan && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <FileText className="h-5 w-5 text-blue-700" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-900">📄 Chứng nhận đính kèm</p>
                            <p className="text-xs text-blue-700">Tài liệu xác thực hồ sơ</p>
                          </div>
                        </div>
                        <Button
                          onClick={async () => {
                            try {
                              const filename = sub.duong_dan_chung_nhan.split('/').pop();
                              const response = await fetch(`/api/certificates/download/${filename}`, {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                                }
                              });
                              if (!response.ok) throw new Error('Download failed');
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', filename);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Failed to download certificate:', error);
                              toast({ title: "Lỗi", description: "Không thể tải chứng nhận", variant: "destructive" });
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Xem chứng nhận
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {sub.ghi_chu && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <span className="font-semibold">Ghi chú:</span> {sub.ghi_chu}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {paginatedSubmissions.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? `Không tìm thấy kết quả cho "${searchQuery}"` : "Không có hồ sơ nào"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý hàng loạt</DialogTitle>
            <DialogDescription>
              Xử lý {selectedIds.size} hồ sơ đã chọn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Chọn hành động</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hành động" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Duyệt tất cả</SelectItem>
                  <SelectItem value="reject">Từ chối tất cả</SelectItem>
                  <SelectItem value="return_to_pharmacy">Trả về nhà thuốc</SelectItem>
                  <SelectItem value="recall">Thu hồi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Lưu ý: Hành động này sẽ áp dụng cho tất cả {selectedIds.size} hồ sơ đã chọn và không thể hoàn tác.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Hủy
            </Button>
            <Button 
              onClick={handleBulkAction} 
              disabled={!bulkAction || processing}
            >
              {processing ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Action Dialog */}
      <Dialog open={showDialog} onOpenChange={onDialogChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Xử lý hồ sơ</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <>
                  Hồ sơ: {selectedSubmission.ten_hoat_chat} - {selectedSubmission.thuong_hieu}
                  <br />
                  Người nộp: {selectedSubmission.ho_ten}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Hành động</Label>
                <RadioGroup
                  value={actionData.action}
                  onValueChange={(v) => setActionData({ ...actionData, action: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approve" id="approve" />
                    <Label htmlFor="approve" className="text-green-600 font-semibold">
                      Duyệt hồ sơ
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reject" id="reject" />
                    <Label htmlFor="reject" className="text-red-600 font-semibold">
                      Từ chối
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="return_to_pharmacy" id="return" />
                    <Label htmlFor="return" className="text-blue-600 font-semibold">
                      Trả về nhà thuốc
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recall" id="recall" />
                    <Label htmlFor="recall" className="text-orange-600 font-semibold">
                      Thu hồi
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {actionData.action === "approve" && (
                <div className="space-y-3">
                  <Label>Hệ thống tính điểm</Label>
                  <RadioGroup
                    value={actionData.points_system}
                    onValueChange={(v) =>
                      setActionData({ ...actionData, points_system: v })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="system" id="system" />
                      <Label htmlFor="system">Hệ thống (mặc định)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pharmacy" id="pharmacy" />
                      <Label htmlFor="pharmacy">Nhà thuốc</Label>
                    </div>
                  </RadioGroup>
                  <div>
                    <Label>Điểm thưởng (tùy chọn, để trống để dùng mặc định)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={actionData.points ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setActionData({
                          ...actionData,
                          points: value && value !== "" ? parseInt(value, 10) : null,
                        });
                      }}
                      placeholder="Để trống để tự động tính"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Nếu để trống, hệ thống sẽ tự động tính dựa trên số lượng
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Label>Đánh giá tiêu chí</Label>
                {criteria.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Chưa có tiêu chí phân loại nào. Vui lòng thêm tiêu chí trước.
                  </p>
                ) : (
                  criteria.map((c: any) => {
                    const classification = actionData.classifications.find(
                      (cl: any) => cl.id_tieu_chi === c.id
                    );
                    return (
                      <div key={c.id} className="p-4 border rounded-lg space-y-3">
                        <Label className="font-semibold">{c.ten_tieu_chi}</Label>
                        {c.mo_ta && (
                          <p className="text-sm text-muted-foreground">{c.mo_ta}</p>
                        )}
                        <RadioGroup
                          value={classification?.ket_qua || "DAT"}
                          onValueChange={(v) => {
                            const updated = actionData.classifications.map((cl: any) =>
                              cl.id_tieu_chi === c.id ? { ...cl, ket_qua: v } : cl
                            );
                            setActionData({ ...actionData, classifications: updated });
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="DAT" id={`${c.id}-dat`} />
                            <Label htmlFor={`${c.id}-dat`} className="text-green-600">
                              Đạt
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="KHONG_DAT" id={`${c.id}-khongdat`} />
                            <Label htmlFor={`${c.id}-khongdat`} className="text-red-600">
                              Không đạt
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="XEM_XET" id={`${c.id}-xemxet`} />
                            <Label htmlFor={`${c.id}-xemxet`} className="text-yellow-600">
                              Xem xét
                            </Label>
                          </div>
                        </RadioGroup>
                        <Input
                          placeholder="Giá trị đo (tùy chọn)"
                          value={classification?.gia_tri_do || ""}
                          onChange={(e) => {
                            const updated = actionData.classifications.map((cl: any) =>
                              cl.id_tieu_chi === c.id
                                ? { ...cl, gia_tri_do: e.target.value }
                                : cl
                            );
                            setActionData({ ...actionData, classifications: updated });
                          }}
                        />
                        <Input
                          placeholder="Ghi chú (tùy chọn)"
                          value={classification?.ghi_chu || ""}
                          onChange={(e) => {
                            const updated = actionData.classifications.map((cl: any) =>
                              cl.id_tieu_chi === c.id
                                ? { ...cl, ghi_chu: e.target.value }
                                : cl
                            );
                            setActionData({ ...actionData, classifications: updated });
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <div>
                <Label>Ghi chú chung</Label>
                <Textarea
                  value={actionData.ghi_chu}
                  onChange={(e) =>
                    setActionData({ ...actionData, ghi_chu: e.target.value })
                  }
                  placeholder="Ghi chú về việc xử lý hồ sơ..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onDialogChange(false)} disabled={processing}>
              Hủy
            </Button>
            <Button onClick={handleAction} disabled={processing}>
              {processing ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Classifications Management Component
function ClassificationsManagement({
  classifications,
  criteria,
  submissions,
  onRefresh,
  onClassificationSelect,
  showDialog,
  onDialogChange,
  selectedClassification,
  user,
}: any) {
  const isReadOnly = user?.role === "CONGTACVIEN";
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
    id_ho_so_xu_ly: "",
    id_tieu_chi: "",
    ket_qua: "DAT",
    gia_tri_do: "",
    ghi_chu: "",
  });
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!formData.id_ho_so_xu_ly || !formData.id_tieu_chi) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn hồ sơ và tiêu chí",
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

  useEffect(() => {
    if (selectedClassification) {
      setFormData({
        id_ho_so_xu_ly: selectedClassification.id_ho_so_xu_ly || "",
        id_tieu_chi: selectedClassification.id_tieu_chi || "",
        ket_qua: selectedClassification.ket_qua || "DAT",
        gia_tri_do: selectedClassification.gia_tri_do || "",
        ghi_chu: selectedClassification.ghi_chu || "",
      });
    } else {
      setFormData({
        id_ho_so_xu_ly: "",
        id_tieu_chi: "",
        ket_qua: "DAT",
        gia_tri_do: "",
        ghi_chu: "",
      });
    }
  }, [selectedClassification]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Kết quả phân loại</h3>
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

      <div className="grid grid-cols-1 gap-4">
        {classifications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Chưa có kết quả phân loại nào</p>
          </div>
        ) : (
          classifications.slice(0, 50).map((cls: any) => (
            <Card key={cls.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold">{cls.ten_tieu_chi || "Tiêu chí"}</p>
                    <p className="text-sm text-muted-foreground">
                      Hồ sơ: {cls.id_ho_so_xu_ly || cls.ho_so_id ? (cls.id_ho_so_xu_ly || cls.ho_so_id).substring(0, 8) : "N/A"}
                    </p>
                    <Badge
                      className={
                        cls.ket_qua === "DAT"
                          ? "bg-green-100 text-green-800"
                          : cls.ket_qua === "KHONG_DAT"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {cls.ket_qua === "DAT"
                        ? "Đạt"
                        : cls.ket_qua === "KHONG_DAT"
                        ? "Không đạt"
                        : "Xem xét"}
                    </Badge>
                    {cls.gia_tri_do && (
                      <p className="text-sm">Giá trị: {cls.gia_tri_do}</p>
                    )}
                    {cls.ghi_chu && (
                      <p className="text-sm text-muted-foreground">{cls.ghi_chu}</p>
                    )}
                    {cls.thoi_gian_danh_gia && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(cls.thoi_gian_danh_gia).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {isReadOnly ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onClassificationSelect(cls);
                          onDialogChange(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onClassificationSelect(cls);
                            onDialogChange(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(cls.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={onDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isReadOnly 
                ? "Chi tiết kết quả phân loại"
                : selectedClassification 
                  ? "Sửa kết quả" 
                  : "Thêm kết quả phân loại"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Hồ sơ *</Label>
              <Select
                value={formData.id_ho_so_xu_ly}
                onValueChange={(v) => setFormData({ ...formData, id_ho_so_xu_ly: v })}
                disabled={isReadOnly || !submissions || submissions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={submissions.length === 0 ? "Chưa có hồ sơ" : "Chọn hồ sơ"} />
                </SelectTrigger>
                <SelectContent>
                  {submissions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.ten_hoat_chat || s.thuong_hieu || "Hồ sơ"} - {s.ho_ten || "N/A"} ({s.id.substring(0, 8)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!submissions || submissions.length === 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Chưa có hồ sơ nào
                </p>
              )}
            </div>
            <div>
              <Label>Tiêu chí *</Label>
              <Select
                value={formData.id_tieu_chi}
                onValueChange={(v) => setFormData({ ...formData, id_tieu_chi: v })}
                disabled={isReadOnly || !criteria || criteria.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={criteria.length === 0 ? "Chưa có tiêu chí" : "Chọn tiêu chí"} />
                </SelectTrigger>
                <SelectContent>
                  {criteria.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.ten_tieu_chi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!criteria || criteria.length === 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Chưa có tiêu chí phân loại nào
                </p>
              )}
            </div>
            <div>
              <Label>Kết quả *</Label>
              <Select
                value={formData.ket_qua}
                onValueChange={(v) => setFormData({ ...formData, ket_qua: v })}
                disabled={isReadOnly}
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
            <div>
              <Label>Giá trị đo</Label>
              <Input
                value={formData.gia_tri_do}
                onChange={(e) =>
                  setFormData({ ...formData, gia_tri_do: e.target.value })
                }
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Textarea
                value={formData.ghi_chu}
                onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                rows={3}
                disabled={isReadOnly}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDialogChange(false)}>
              {isReadOnly ? "Đóng" : "Hủy"}
            </Button>
            {!isReadOnly && (
              <Button onClick={handleSubmit} disabled={processing}>
                {processing ? "Đang lưu..." : "Lưu"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Vouchers Management Component
function VouchersManagement({
  vouchers,
  onRefresh,
  onVoucherSelect,
  showDialog,
  onDialogChange,
  selectedVoucher,
}: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
    ten_voucher: "",
    mo_ta: "",
    diem_can_thiet: 0,
    so_luong_con_lai: 0,
    ngay_het_han: "",
    trang_thai: "active",
  });
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    // Validate inputs
    if (!formData.ten_voucher || !formData.ten_voucher.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên voucher",
        variant: "destructive",
      });
      return;
    }

    if (formData.diem_can_thiet < 0) {
      toast({
        title: "Lỗi",
        description: "Điểm cần thiết không thể âm",
        variant: "destructive",
      });
      return;
    }

    if (formData.so_luong_con_lai < 0) {
      toast({
        title: "Lỗi",
        description: "Số lượng còn lại không thể âm",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      if (selectedVoucher) {
        await apiClient.updateVoucher(selectedVoucher.id, formData);
        toast({ title: "Thành công", description: "Đã cập nhật voucher" });
      } else {
        await apiClient.createVoucher(formData);
        toast({ title: "Thành công", description: "Đã tạo voucher" });
      }
      onDialogChange(false);
      // Reset form
      setFormData({
        ten_voucher: "",
        mo_ta: "",
        diem_can_thiet: 0,
        so_luong_con_lai: 0,
        ngay_het_han: "",
        trang_thai: "active",
      });
      onRefresh();
    } catch (error: any) {
      console.error("Error saving voucher:", error);
      toast({
        title: "Lỗi",
        description: error.detail || error.error || error.message || "Không thể lưu voucher",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa voucher này?")) return;
    try {
      await apiClient.deleteVoucher(id);
      toast({ title: "Thành công", description: "Đã xóa voucher" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.detail || error.error || "Không thể xóa",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedVoucher) {
      setFormData({
        ten_voucher: selectedVoucher.ten_voucher || "",
        mo_ta: selectedVoucher.mo_ta || "",
        diem_can_thiet: selectedVoucher.diem_can_thiet || 0,
        so_luong_con_lai: selectedVoucher.so_luong_con_lai || 0,
        ngay_het_han: selectedVoucher.ngay_het_han
          ? new Date(selectedVoucher.ngay_het_han).toISOString().split("T")[0]
          : "",
        trang_thai: selectedVoucher.trang_thai || "active",
      });
    } else {
      setFormData({
        ten_voucher: "",
        mo_ta: "",
        diem_can_thiet: 0,
        so_luong_con_lai: 0,
        ngay_het_han: "",
        trang_thai: "active",
      });
    }
  }, [selectedVoucher]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quản lý Voucher</h3>
        <Button
          onClick={() => {
            onVoucherSelect(null);
            onDialogChange(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm voucher
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vouchers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Chưa có voucher nào</p>
          </div>
        ) : (
          vouchers.map((voucher: any) => (
            <Card key={voucher.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex-1">{voucher.ten_voucher}</CardTitle>
                  <Badge
                    className={
                      voucher.trang_thai === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {voucher.trang_thai === "active" ? "Hoạt động" : "Không hoạt động"}
                  </Badge>
                </div>
                <CardDescription>{voucher.mo_ta || "Không có mô tả"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Điểm cần thiết:</span> {voucher.diem_can_thiet}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Số lượng còn lại:</span>{" "}
                  {voucher.so_luong_con_lai}
                </p>
                {voucher.ngay_het_han && (
                  <p className="text-sm">
                    <span className="font-semibold">Hạn sử dụng:</span>{" "}
                    {new Date(voucher.ngay_het_han).toLocaleDateString("vi-VN")}
                  </p>
                )}
              </CardContent>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      onVoucherSelect(voucher);
                      onDialogChange(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Sửa
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(voucher.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={onDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVoucher ? "Sửa voucher" : "Thêm voucher"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Tên voucher *</Label>
              <Input
                value={formData.ten_voucher}
                onChange={(e) => setFormData({ ...formData, ten_voucher: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea
                value={formData.mo_ta}
                onChange={(e) => setFormData({ ...formData, mo_ta: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Điểm cần thiết *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.diem_can_thiet}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      diem_can_thiet: value && value !== "" ? Math.max(0, parseInt(value, 10) || 0) : 0,
                    });
                  }}
                  required
                />
              </div>
              <div>
                <Label>Số lượng còn lại *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.so_luong_con_lai}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      so_luong_con_lai: value && value !== "" ? Math.max(0, parseInt(value, 10) || 0) : 0,
                    });
                  }}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Hạn sử dụng</Label>
              <Input
                type="date"
                value={formData.ngay_het_han}
                onChange={(e) => setFormData({ ...formData, ngay_het_han: e.target.value })}
              />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select
                value={formData.trang_thai}
                onValueChange={(v) => setFormData({ ...formData, trang_thai: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onDialogChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={processing}>
              {processing ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Notifications Management Component
function NotificationsManagement({
  users,
  onRefresh,
  showDialog,
  onDialogChange,
  notificationType,
  onNotificationTypeChange,
}: any) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
    noi_dung: "",
    loai_thong_bao: "SYSTEM",
    target_users: [],
    user_id: "",
  });
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    // Validate inputs
    if (!formData.noi_dung || !formData.noi_dung.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung thông báo",
        variant: "destructive",
      });
      return;
    }

    if (notificationType === "user" && !formData.user_id) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn user để gửi tin nhắn",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      if (notificationType === "system") {
        const result = await apiClient.createSystemNotification({
          noi_dung: formData.noi_dung.trim(),
          loai_thong_bao: formData.loai_thong_bao,
          target_users: formData.target_users.length > 0 ? formData.target_users : null,
        });
        toast({ 
          title: "Thành công", 
          description: result.data?.message || "Đã gửi thông báo hệ thống" 
        });
      } else {
        await apiClient.sendUserMessage({
          user_id: formData.user_id,
          noi_dung: formData.noi_dung.trim(),
          loai_thong_bao: formData.loai_thong_bao,
        });
        toast({ title: "Thành công", description: "Đã gửi tin nhắn" });
      }
      // Reset form after success
      setFormData({
        noi_dung: "",
        loai_thong_bao: "SYSTEM",
        target_users: [],
        user_id: "",
      });
      onRefresh();
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast({
        title: "Lỗi",
        description: error.detail || error.error || error.message || "Không thể gửi thông báo",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quản lý Thông báo</h3>
        <div className="flex gap-2">
          <Button
            variant={notificationType === "system" ? "default" : "outline"}
            onClick={() => onNotificationTypeChange("system")}
          >
            Thông báo hệ thống
          </Button>
          <Button
            variant={notificationType === "user" ? "default" : "outline"}
            onClick={() => onNotificationTypeChange("user")}
          >
            Gửi cho user
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {notificationType === "system"
              ? "Gửi thông báo hệ thống"
              : "Gửi tin nhắn cho user"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationType === "user" && (
            <div>
              <Label>Chọn user *</Label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData({ ...formData, user_id: v })}
                disabled={!users || users.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={users.length === 0 ? "Chưa có user" : "Chọn user"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.ho_ten || "User"} ({u.email || u.so_dien_thoai || "N/A"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!users || users.length === 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Chưa có user nào trong hệ thống
                </p>
              )}
            </div>
          )}
          <div>
            <Label>Loại thông báo</Label>
            <Select
              value={formData.loai_thong_bao}
              onValueChange={(v) => setFormData({ ...formData, loai_thong_bao: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SYSTEM">Hệ thống</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="SUBMISSION">Hồ sơ</SelectItem>
                <SelectItem value="VOUCHER">Voucher</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nội dung *</Label>
            <Textarea
              value={formData.noi_dung}
              onChange={(e) => setFormData({ ...formData, noi_dung: e.target.value })}
              rows={5}
              placeholder="Nhập nội dung thông báo..."
              required
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={processing || !formData.noi_dung || (notificationType === "user" && !formData.user_id)}
          >
            <Send className="h-4 w-4 mr-2" />
            {processing ? "Đang gửi..." : "Gửi"}
          </Button>
          {notificationType === "user" && !formData.user_id && (
            <p className="text-xs text-muted-foreground">
              Vui lòng chọn user để gửi tin nhắn
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Statistics Dashboard Component
function StatisticsDashboard({ statistics }: any) {
  if (!statistics) {
    return <div>Đang tải thống kê...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Tổng:</span>
              <span className="font-bold">{statistics.submissions?.total || 0}</span>
            </div>
            <div className="flex justify-between text-yellow-600">
              <span>Chờ duyệt:</span>
              <span className="font-bold">{statistics.submissions?.pending || 0}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Đã duyệt:</span>
              <span className="font-bold">{statistics.submissions?.approved || 0}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Từ chối:</span>
              <span className="font-bold">{statistics.submissions?.rejected || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voucher</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Tổng:</span>
              <span className="font-bold">{statistics.vouchers?.total || 0}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Hoạt động:</span>
              <span className="font-bold">{statistics.vouchers?.active || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Còn lại:</span>
              <span className="font-bold">{statistics.vouchers?.total_remaining || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Người dùng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Tổng:</span>
              <span className="font-bold">{statistics.users?.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Users:</span>
              <span className="font-bold">{statistics.users?.users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tổng điểm:</span>
              <span className="font-bold">{statistics.users?.total_points || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Điểm thưởng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Tổng giao dịch:</span>
              <span className="font-bold">
                {statistics.points?.total_transactions || 0}
              </span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Đã trao:</span>
              <span className="font-bold">{statistics.points?.total_awarded || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Hoàn thành:</span>
              <span className="font-bold">
                {statistics.points?.completed_transactions || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân loại</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Tổng:</span>
              <span className="font-bold">{statistics.classifications?.total || 0}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Đạt:</span>
              <span className="font-bold">{statistics.classifications?.dat || 0}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Không đạt:</span>
              <span className="font-bold">
                {statistics.classifications?.khong_dat || 0}
              </span>
            </div>
            <div className="flex justify-between text-yellow-600">
              <span>Xem xét:</span>
              <span className="font-bold">{statistics.classifications?.xem_xet || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Collaborators Management Component
function CollaboratorsManagement({ onRefresh }: any) {
  const { toast } = useToast();
  const [collaboratorRequests, setCollaboratorRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollaboratorRequests();
  }, []);

  const loadCollaboratorRequests = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getCollaboratorRequests();
      if (response.success) {
        setCollaboratorRequests(response.data || []);
      }
    } catch (error: any) {
      console.error("Error loading collaborator requests:", error);
      setCollaboratorRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const response = await apiClient.approveCollaboratorRequest(userId, action);
      if (response.success) {
        toast({
          title: "Thành công",
          description: action === 'approve' ? "Đã phê duyệt yêu cầu" : "Đã từ chối yêu cầu",
        });
        loadCollaboratorRequests();
        onRefresh(); // Refresh parent data
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.detail || error.error || "Không thể xử lý yêu cầu",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Duyệt yêu cầu Cộng tác viên</h3>
        <Button onClick={loadCollaboratorRequests} variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div>Đang tải...</div>
        </div>
      ) : collaboratorRequests.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Không có yêu cầu nào đang chờ duyệt</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {collaboratorRequests.map((request: any) => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{request.ho_ten}</h4>
                      <Badge variant="secondary">
                        {new Date(request.ngay_tao).toLocaleDateString("vi-VN")}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Email:</strong> {request.email || "Không có"}</p>
                      <p><strong>SĐT:</strong> {request.so_dien_thoai || "Không có"}</p>
                      <p><strong>Địa chỉ:</strong> {request.dia_chi || "Không có"}</p>
                      <p><strong>Điểm tích lũy:</strong> {request.diem_tich_luy || 0} điểm</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleApproveReject(request.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Phê duyệt
                    </Button>
                    <Button
                      onClick={() => handleApproveReject(request.id, 'reject')}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Từ chối
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

