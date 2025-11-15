export interface BaseResponse {
  success: boolean;
  message?: string;
}

// Forum Types
export * from "./forumTypes";

// Notification Types
export interface NotificationType {
  id: string;
  id_nguoi_gui: string | null;
  id_nguoi_nhan: string | null;
  noi_dung: string;
  loai_thong_bao: "SYSTEM" | "FORUM" | "FORUM_COMMENT";
  ngay_tao: string;
  da_xem: number;
  metadata?: any;
}

// User Types
export interface UserProfile {
  id: string;
  ho_ten: string;
  email: string;
  role: "ADMIN" | "CONGTACVIEN" | "USER";
  created_at: string;
  diem_thuong: number;
  name?: string; // Fallback to ho_ten if not set
  avatar?: string;
}

// Medicine Types
export interface MedicineSubmission {
  id: string;
  userId: string;
  medicines: Medicine[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  quantity: number;
  expiry: string;
  type: string;
  condition: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  points?: number;
  createdAt: string;
  updatedAt: string;
}
