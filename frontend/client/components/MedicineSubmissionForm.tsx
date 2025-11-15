import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useToast } from "@/hooks/use-toast";

interface MedicineSubmissionFormProps {
  onSubmit: (medicine: MedicineInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function MedicineSubmissionForm({
  onSubmit,
  isSubmitting = false,
}: MedicineSubmissionFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<MedicineInput>({
    name: "",
    quantity: 1,
    expiry: "",
    type: "",
    condition: "NEW",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên thuốc",
        variant: "destructive",
      });
      return;
    }

    if (!form.manufacturer.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nhà sản xuất",
        variant: "destructive",
      });
      return;
    }

    if (!form.registrationNumber.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số đăng ký",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSubmit(form);

      // Reset form on success
      setForm({
        name: "",
        quantity: 1,
        expiry: "",
        type: "",
        condition: "NEW",
        notes: "",
      });
      toast({
        description: "Gửi thành công",
      });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể gửi. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin thuốc</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Tên thuốc
            </label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nhập tên thuốc"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="quantity" className="text-sm font-medium">
                Số lượng
              </label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: parseInt(e.target.value, 10) })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="expiry" className="text-sm font-medium">
                Ngày hết hạn
              </label>
              <Input
                id="expiry"
                type="date"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              Loại thuốc
            </label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại thuốc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRESCRIPTION">Thuốc kê đơn</SelectItem>
                <SelectItem value="OTC">Thuốc không kê đơn</SelectItem>
                <SelectItem value="SUPPLEMENT">Thực phẩm chức năng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="condition" className="text-sm font-medium">
              Tình trạng
            </label>
            <Select
              value={form.condition}
              onValueChange={(value: "NEW" | "OPENED" | "EXPIRED") =>
                setForm({ ...form, condition: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn tình trạng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW">Mới</SelectItem>
                <SelectItem value="OPENED">Đã mở</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Ghi chú
            </label>
            <Textarea
              id="notes"
              placeholder="Ghi chú thêm về thuốc (không bắt buộc)"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Đang gửi..." : "Gửi"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
