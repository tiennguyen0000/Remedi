import React from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit2Icon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface EditSubmissionDialogProps {
  submission: {
    id: string;
    name?: string;
    type: string;
    quantity: number;
    han_dung?: string;
    ghi_chu?: string;
    id_loai_thuoc?: string;
    id_nha_thuoc?: string;
  };
  onSubmit: () => void;
}

export function EditSubmissionDialog({
  submission,
  onSubmit,
}: EditSubmissionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [medicines, setMedicines] = React.useState<any[]>([]);
  const [pharmacies, setPharmacies] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({
    id_loai_thuoc: submission.id_loai_thuoc || "",
    id_nha_thuoc: submission.id_nha_thuoc || "",
    quantity: submission.quantity,
    type: submission.type,
    han_dung: submission.han_dung || "",
    ghi_chu: submission.ghi_chu || "",
  });
  const { toast } = useToast();

  // Load medicines and pharmacies when dialog opens
  React.useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [medicinesData, pharmaciesData] = await Promise.all([
        apiFetch("/api/loai-thuoc"),
        apiFetch("/api/nha-thuoc"),
      ]);
      setMedicines(medicinesData);
      setPharmacies(pharmaciesData);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData: any = {
        so_luong: form.quantity,
        don_vi_tinh: form.type,
      };
      
      // Include optional fields if they have values
      if (form.id_loai_thuoc) updateData.id_loai_thuoc = form.id_loai_thuoc;
      if (form.id_nha_thuoc) updateData.id_nha_thuoc = form.id_nha_thuoc;
      if (form.han_dung) updateData.han_dung = form.han_dung;
      if (form.ghi_chu) updateData.ghi_chu = form.ghi_chu;
      
      await apiFetch(`/api/ho-so-xu-ly/${submission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      toast({
        description: "Đã cập nhật thành công",
      });
      setOpen(false);
      onSubmit();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật hồ sơ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2">
          <Edit2Icon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cho hồ sơ thuốc {submission.name || submission.id}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Medicine Type Selection */}
          <div className="grid gap-2">
            <Label htmlFor="medicine">Loại thuốc</Label>
            <Select
              value={form.id_loai_thuoc}
              onValueChange={(value) =>
                setForm({ ...form, id_loai_thuoc: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại thuốc" />
              </SelectTrigger>
              <SelectContent>
                {medicines.map((med) => (
                  <SelectItem key={med.id} value={med.id}>
                    {med.ten_hoat_chat} - {med.thuong_hieu} ({med.ham_luong})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pharmacy Selection */}
          <div className="grid gap-2">
            <Label htmlFor="pharmacy">Nhà thuốc</Label>
            <Select
              value={form.id_nha_thuoc}
              onValueChange={(value) =>
                setForm({ ...form, id_nha_thuoc: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhà thuốc" />
              </SelectTrigger>
              <SelectContent>
                {pharmacies.map((pharm) => (
                  <SelectItem key={pharm.id} value={pharm.id}>
                    {pharm.ten_nha_thuoc} - {pharm.dia_chi}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="grid gap-2">
            <Label htmlFor="quantity">Số lượng</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              step="0.001"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) })
              }
              required
            />
          </div>

          {/* Unit */}
          <div className="grid gap-2">
            <Label htmlFor="unit">Đơn vị</Label>
            <Input
              id="unit"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              placeholder="VD: viên, hộp, chai..."
              required
            />
          </div>

          {/* Expiry Date */}
          <div className="grid gap-2">
            <Label htmlFor="expiry">Hạn dùng (tùy chọn)</Label>
            <Input
              id="expiry"
              type="date"
              value={form.han_dung}
              onChange={(e) => setForm({ ...form, han_dung: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="notes"
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              placeholder="Thêm ghi chú về thuốc..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
