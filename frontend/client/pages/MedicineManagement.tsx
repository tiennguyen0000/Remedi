import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { getAuthHeaders } from '@/lib/api';
import { MapPin, Star, Trash2, Edit2, Check, Upload, FileImage, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Combobox } from '@/components/Combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PharmacyMap } from '@/components/PharmacyMap';

export default function MedicineManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [medicineTypes, setMedicineTypes] = useState<any[]>([]);
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string>('');
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);
  
  const [formData, setFormData] = useState({
    medicineType: '',
    quantity: '',
    unit: '',
    expiryDate: '',
    condition: '',
    notes: '',
    pharmacyId: '',
  });

  const [editFormData, setEditFormData] = useState({
    medicineType: '',
    quantity: '',
    unit: '',
    expiryDate: '',
    condition: '',
    notes: '',
    pharmacyId: '',
  });
  const [editCertificateFile, setEditCertificateFile] = useState<File | null>(null);
  const [editCertificateUrl, setEditCertificateUrl] = useState<string>('');
  const [isUploadingEditCertificate, setIsUploadingEditCertificate] = useState(false);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    await Promise.all([
      loadSubmissions(),
      loadNearbyPharmacies(),
      loadDropdownData(),
    ]);
  };

  const loadDropdownData = async () => {
    try {
      const [unitsRes, conditionsRes, typesRes] = await Promise.all([
        apiClient.getMedicineUnits(),
        apiClient.getMedicineConditions(),
        apiClient.getMedicineTypes(),
      ]);

      if (unitsRes.success) setUnits(unitsRes.data || []);
      if (conditionsRes.success) setConditions(conditionsRes.data || []);
      if (typesRes.success) setMedicineTypes(typesRes.data || []);
    } catch (error) {
      console.error("[MedicineManagement] Failed to load dropdown data:", error);
    }
  };

  const loadSubmissions = async () => {
    if (!user) return;
    
    try {
      const response = await apiClient.getMySubmissions();
      if (response.success && response.data) {
        setSubmissions(response.data);
      }
    } catch (error) {
      console.error("[MedicineManagement] Failed to load submissions:", error);
      setSubmissions([]);
    }
  };

  const loadNearbyPharmacies = async () => {
    try {
      const response = await apiClient.getNearbyPharmacies();
      if (response.success && response.data) {
        setPharmacies(response.data);
      }
    } catch (error) {
      console.error("[MedicineManagement] Failed to load pharmacies:", error);
      setPharmacies([]);
    }
  };

  const handleCertificateUpload = async (file: File) => {
    setIsUploadingCertificate(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/certificate', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.success && data.url) {
        setCertificateUrl(data.url);
        toast({
          title: "Thành công",
          description: "Đã tải lên chứng nhận",
        });
      }
    } catch (error) {
      console.error('[MedicineManagement] Certificate upload error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải lên chứng nhận",
        variant: "destructive",
      });
      setCertificateFile(null);
    } finally {
      setIsUploadingCertificate(false);
    }
  };

  const handleEditCertificateUpload = async (file: File) => {
    setIsUploadingEditCertificate(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/certificate', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.success && data.url) {
        setEditCertificateUrl(data.url);
        toast({
          title: "Thành công",
          description: "Đã tải lên chứng nhận",
        });
      }
    } catch (error) {
      console.error('[MedicineManagement] Edit certificate upload error:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải lên chứng nhận",
        variant: "destructive",
      });
      setEditCertificateFile(null);
    } finally {
      setIsUploadingEditCertificate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.medicineType || !formData.pharmacyId || !formData.quantity || !formData.unit) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc (*)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id_loai_thuoc: formData.medicineType,
        id_nha_thuoc: formData.pharmacyId,
        so_luong: Number(formData.quantity),
        don_vi_tinh: formData.unit,
        han_dung: formData.expiryDate || null,
        ghi_chu: formData.notes || null,
        duong_dan_chung_nhan: certificateUrl || null,
      };
      
      const response = await apiClient.submitMedicine(payload);

      if (response.success) {
        toast({
          title: "Thành công",
          description: "Đã gửi hồ sơ thuốc thành công",
        });
        
        setFormData({
          medicineType: '',
          quantity: '',
          unit: '',
          expiryDate: '',
          condition: '',
          notes: '',
          pharmacyId: '',
        });
        setCertificateFile(null);
        setCertificateUrl('');
        setSelectedPharmacyId(undefined);
        
        loadSubmissions();
      }
    } catch (error: any) {
      console.error('[MedicineManagement] Submit error:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể gửi hồ sơ",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (submission: any) => {
    // Check both mapped status and raw ket_qua to ensure consistency
    const raw = submission.raw || submission;
    const ketQua = (raw.ket_qua || submission.status || '').toLowerCase();
    
    // Only allow editing pending submissions
    if (ketQua !== 'pending' && submission.status !== 'PENDING') {
      toast({
        title: "Lỗi",
        description: "Chỉ có thể sửa hồ sơ đang chờ duyệt",
        variant: "destructive",
      });
      return;
    }
    
    console.log('[Edit] Opening dialog with data:', {
      submission_id: submission.id,
      raw_data: raw,
      medicineTypes_count: medicineTypes.length,
      pharmacies_count: pharmacies.length,
      units_count: units.length
    });
    
    // Get data from raw if available, otherwise from submission directly
    const hanDung = raw.han_dung;
    let expiryDateStr = '';
    if (hanDung) {
      try {
        // Convert date to YYYY-MM-DD format
        if (typeof hanDung === 'string') {
          expiryDateStr = hanDung.split('T')[0];
        } else if (hanDung instanceof Date) {
          expiryDateStr = hanDung.toISOString().split('T')[0];
        } else {
          // If it's a date object from database
          const date = new Date(hanDung);
          if (!isNaN(date.getTime())) {
            expiryDateStr = date.toISOString().split('T')[0];
          }
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }
    
    const formData = {
      medicineType: raw.id_loai_thuoc || '',
      quantity: (raw.so_luong || submission.quantity || 0).toString(),
      unit: raw.don_vi_tinh || submission.unit || '',
      expiryDate: expiryDateStr,
      condition: '',
      notes: raw.ghi_chu || '',
      pharmacyId: raw.id_nha_thuoc || '',
    };
    
    console.log('[Edit] Setting form data:', formData);
    
    setEditingSubmission(submission);
    setEditFormData(formData);
    setEditCertificateUrl(raw.duong_dan_chung_nhan || '');
    setEditCertificateFile(null);
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!editingSubmission) return;
    
    if (!editFormData.medicineType || !editFormData.pharmacyId || !editFormData.quantity || !editFormData.unit) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        id_loai_thuoc: editFormData.medicineType,
        id_nha_thuoc: editFormData.pharmacyId,
        so_luong: Number(editFormData.quantity),
        don_vi_tinh: editFormData.unit,
        han_dung: editFormData.expiryDate || null,
        ghi_chu: editFormData.notes || null,
        duong_dan_chung_nhan: editCertificateUrl || null,
      };
      
      await apiClient.updateSubmission(editingSubmission.id, payload);
      toast({
        title: "Thành công",
        description: "Đã cập nhật hồ sơ thành công",
      });
      setShowEditDialog(false);
      setEditingSubmission(null);
      loadSubmissions();
    } catch (error: any) {
      console.error('[MedicineManagement] Update error:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật hồ sơ",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa hồ sơ này?")) {
      return;
    }

    try {
      await apiClient.deleteSubmission(id);
      toast({ title: "Đã xóa hồ sơ" });
      loadSubmissions();
    } catch (error: any) {
      console.error('[MedicineManagement] Delete error:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa hồ sơ",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-50';
      case 'REJECTED': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'REJECTED': return 'Từ chối';
      default: return 'Đang chờ';
    }
  };

  // Handle pharmacy selection from map
  const handlePharmacySelect = (pharmacy: any | null) => {
    if (pharmacy) {
      setSelectedPharmacyId(pharmacy.id);
      setFormData({ ...formData, pharmacyId: pharmacy.id });
      toast({
        title: "Đã chọn nhà thuốc",
        description: pharmacy.ten_nha_thuoc || pharmacy.ten || "Nhà thuốc",
      });
    }
  };

  // Handle location click on map
  const handleLocationClick = (lat: number, lng: number, pharmacy?: any) => {
    if (pharmacy) {
      // Pharmacy found at clicked location
      handlePharmacySelect(pharmacy);
    }
    // If no pharmacy, error is already shown in PharmacyMap component
  };

  // Prepare options for comboboxes
  const medicineTypeOptions = medicineTypes.map((type) => ({
    value: type.id,
    label: `${type.ten_hoat_chat} - ${type.thuong_hieu} (${type.ham_luong})`,
    ...type,
  }));

  const pharmacyOptions = pharmacies.map((pharmacy) => ({
    value: pharmacy.id,
    label: pharmacy.ten_nha_thuoc || pharmacy.ten,
    ...pharmacy,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Thu gom & Trao đổi thuốc</h1>

      {!user ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Vui lòng đăng nhập để nộp thuốc
            </p>
            <Link to="/login">
              <Button>Đăng nhập</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Tabs defaultValue="submit" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="submit">Nộp thuốc</TabsTrigger>
                <TabsTrigger value="exchange">
                  Trao đổi thuốc
                  <span className="ml-1 text-xs text-muted-foreground">(Coming soon)</span>
                </TabsTrigger>
                <TabsTrigger value="history">Lịch sử hồ sơ</TabsTrigger>
              </TabsList>

              <TabsContent value="submit">
                <Card>
                  <CardHeader>
                    <CardTitle>Thông tin thuốc cần nộp</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="medicineType">
                            Loại thuốc <span className="text-red-500">*</span>
                          </Label>
                          <Combobox
                            options={medicineTypeOptions}
                            value={formData.medicineType}
                            onValueChange={(value) => setFormData({ ...formData, medicineType: value })}
                            placeholder="Chọn hoặc tìm kiếm loại thuốc"
                            searchPlaceholder="Tìm kiếm loại thuốc..."
                            emptyMessage="Không tìm thấy loại thuốc"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quantity">
                            Số lượng <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            placeholder="10"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="unit">
                            Đơn vị tính <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.unit}
                            onValueChange={(value) => setFormData({ ...formData, unit: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn đơn vị" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="expiryDate">Hạn dùng</Label>
                          <Input
                            id="expiryDate"
                            type="date"
                            value={formData.expiryDate}
                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="pharmacyId">
                          Nhà thuốc nhận <span className="text-red-500">*</span>
                        </Label>
                        <Combobox
                          options={pharmacyOptions}
                          value={formData.pharmacyId}
                          onValueChange={(value) => {
                            setFormData({ ...formData, pharmacyId: value });
                            setSelectedPharmacyId(value);
                          }}
                          placeholder="Chọn hoặc tìm kiếm nhà thuốc"
                          searchPlaceholder="Tìm kiếm nhà thuốc..."
                          emptyMessage="Không tìm thấy nhà thuốc"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Hoặc chọn từ bản đồ ở mục bên cạnh
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Thêm ghi chú về thuốc..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="certificate">Chứng nhận (Tùy chọn)</Label>
                        <div className="mt-2">
                          {certificateUrl ? (
                            <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                              <FileImage className="h-5 w-5 text-primary" />
                              <span className="text-sm flex-1 truncate">
                                {certificateFile?.name || 'Chứng nhận đã tải lên'}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCertificateFile(null);
                                  setCertificateUrl('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Input
                                id="certificate"
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setCertificateFile(file);
                                    handleCertificateUpload(file);
                                  }
                                }}
                                disabled={isUploadingCertificate}
                                className="flex-1"
                              />
                              {isUploadingCertificate && (
                                <span className="text-sm text-muted-foreground">Đang tải...</span>
                              )}
                            </div>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Hỗ trợ: JPEG, PNG, GIF, WebP, PDF (Tối đa 10MB)
                          </p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Đang gửi..." : "Gửi hồ sơ"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="exchange">
                <Card>
                  <CardHeader>
                    <CardTitle>Trao đổi thuốc (Coming soon)</CardTitle>
                  </CardHeader>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Tính năng đang được phát triển. Vui lòng quay lại sau.
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Lịch sử nộp thuốc ({submissions.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">Chưa có hồ sơ nào</p>
                    ) : (
                      <div className="space-y-4">
                        {submissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="border rounded-lg p-4 transition-colors hover:bg-accent/50"
                          >
                            <div className="mb-2 flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold">
                                  {submission.medicineName || submission.name || "Thuốc"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {submission.quantity || submission.raw?.so_luong}{" "}
                                  {submission.unit || submission.raw?.don_vi_tinh}
                                </p>
                                {submission.raw?.han_dung && (
                                  <p className="text-sm text-muted-foreground">
                                    Hạn dùng: {new Date(submission.raw.han_dung).toLocaleDateString("vi-VN")}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(submission.status)}`}>
                                  {getStatusText(submission.status)}
                                </span>
                                {(submission.status === "PENDING" || (submission.raw?.ket_qua || '').toLowerCase() === 'pending') && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(submission)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(submission.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {submission.nha_thuoc && (
                              <p className="text-sm text-muted-foreground">
                                <MapPin className="mr-1 inline h-3 w-3" />
                                {submission.nha_thuoc.ten_nha_thuoc || submission.nha_thuoc.ten}
                              </p>
                            )}
                            {submission.status === "APPROVED" && submission.points > 0 && (
                              <p className="mt-2 text-sm font-semibold text-green-600">
                                <Star className="mr-1 inline h-3 w-3" /> +{submission.points} điểm thưởng
                              </p>
                            )}
                            {submission.raw?.ghi_chu && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                Ghi chú: {submission.raw.ghi_chu}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="h-full" style={{ position: 'relative', zIndex: 1 }}>
              <CardHeader>
                <CardTitle>Nhà thuốc liên kết</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PharmacyMap
                  pharmacies={pharmacies}
                  selectedPharmacyId={selectedPharmacyId}
                  onPharmacySelect={handlePharmacySelect}
                  onLocationClick={handleLocationClick}
                  userLocation={userLocation}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !z-[9999999]" style={{ zIndex: 9999999, position: 'fixed' }}>
          <DialogHeader>
            <DialogTitle>Sửa hồ sơ</DialogTitle>
            <DialogDescription>
              Chỉnh sửa thông tin hồ sơ nộp thuốc
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-medicineType">Loại thuốc <span className="text-red-500">*</span></Label>
                {(() => {
                  console.log('[Edit Dialog] Medicine Type Combobox:', {
                    options_count: medicineTypeOptions.length,
                    current_value: editFormData.medicineType,
                    sample_option: medicineTypeOptions[0],
                    selected_label: medicineTypeOptions.find(o => o.value === editFormData.medicineType)?.label
                  });
                  return null;
                })()}
                <Combobox
                  key={`medicine-${editFormData.medicineType}`}
                  options={medicineTypeOptions}
                  value={editFormData.medicineType}
                  onValueChange={(value) => {
                    console.log('[Edit] Medicine type changed to:', value);
                    setEditFormData({...editFormData, medicineType: value});
                  }}
                  placeholder="Chọn hoặc tìm kiếm loại thuốc"
                  searchPlaceholder="Tìm kiếm loại thuốc..."
                  emptyMessage="Không tìm thấy loại thuốc"
                />
              </div>
              <div>
                <Label htmlFor="edit-quantity">Số lượng <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="1"
                  value={editFormData.quantity}
                  onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})}
                  required
                />
              </div>
                      </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-unit">Đơn vị tính <span className="text-red-500">*</span></Label>
                <Select
                  value={editFormData.unit}
                  onValueChange={(value) => setEditFormData({...editFormData, unit: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn đơn vị" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-expiryDate">Hạn dùng</Label>
                <Input
                  id="edit-expiryDate"
                  type="date"
                  value={editFormData.expiryDate}
                  onChange={(e) => setEditFormData({...editFormData, expiryDate: e.target.value})}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-pharmacyId">Nhà thuốc nhận <span className="text-red-500">*</span></Label>
              {(() => {
                console.log('[Edit Dialog] Pharmacy Combobox:', {
                  options_count: pharmacyOptions.length,
                  current_value: editFormData.pharmacyId,
                  sample_option: pharmacyOptions[0],
                  selected_label: pharmacyOptions.find(o => o.value === editFormData.pharmacyId)?.label
                });
                return null;
              })()}
              <Combobox
                key={`pharmacy-${editFormData.pharmacyId}`}
                options={pharmacyOptions}
                value={editFormData.pharmacyId}
                onValueChange={(value) => {
                  console.log('[Edit] Pharmacy changed to:', value);
                  setEditFormData({...editFormData, pharmacyId: value});
                }}
                placeholder="Chọn hoặc tìm kiếm nhà thuốc"
                searchPlaceholder="Tìm kiếm nhà thuốc..."
                emptyMessage="Không tìm thấy nhà thuốc"
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Ghi chú</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                placeholder="Thêm ghi chú về thuốc..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-certificate">Chứng nhận (Tùy chọn)</Label>
              <div className="mt-2">
                {editCertificateUrl ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <FileImage className="h-5 w-5 text-primary" />
                    <span className="text-sm flex-1 truncate">
                      {editCertificateFile?.name || 'Chứng nhận đã tải lên'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditCertificateFile(null);
                        setEditCertificateUrl('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-certificate"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setEditCertificateFile(file);
                          handleEditCertificateUpload(file);
                        }
                      }}
                      disabled={isUploadingEditCertificate}
                      className="flex-1"
                    />
                    {isUploadingEditCertificate && (
                      <span className="text-sm text-muted-foreground">Đang tải...</span>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Hỗ trợ: JPEG, PNG, GIF, WebP, PDF (Tối đa 10MB)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingSubmission(null);
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleUpdate}>
              <Check className="h-4 w-4 mr-2" />
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
