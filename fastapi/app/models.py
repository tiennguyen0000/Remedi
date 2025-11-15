from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List
from datetime import datetime
from uuid import UUID

# User models
class UserBase(BaseModel):
    ho_ten: str
    so_dien_thoai: Optional[str] = None
    email: Optional[str] = None
    dia_chi: Optional[str] = None

class UserRegister(UserBase):
    password: str  # Required for registration
    role: Literal['ADMIN', 'CONGTACVIEN', 'USER'] = 'USER'
    requestCollaborator: Optional[bool] = False

class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str  # Required for login

class UserUpdate(BaseModel):
    ho_ten: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    email: Optional[str] = None
    dia_chi: Optional[str] = None
    old_password: Optional[str] = None  # Required if changing password
    new_password: Optional[str] = None

class User(UserBase):
    id: UUID
    role: str
    diem_tich_luy: int = 0
    ngay_tao: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Medicine Type models
class MedicineType(BaseModel):
    id: UUID
    ten_hoat_chat: str
    thuong_hieu: str
    ham_luong: str
    dang_bao_che: str
    ghi_chu: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Pharmacy models
class Pharmacy(BaseModel):
    id: UUID
    ten_nha_thuoc: str
    dia_chi: str
    so_dien_thoai: Optional[str] = None
    gio_mo_cua: Optional[str] = None
    vi_do: Optional[float] = None
    kinh_do: Optional[float] = None
    ghi_chu: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Submission models
class SubmissionCreate(BaseModel):
    id_loai_thuoc: UUID
    id_nha_thuoc: UUID
    so_luong: int
    don_vi_tinh: str
    han_dung: Optional[str] = None
    duong_dan_chung_nhan: Optional[str] = None
    ghi_chu: Optional[str] = None

class SubmissionUpdate(BaseModel):
    id_loai_thuoc: Optional[UUID] = None
    id_nha_thuoc: Optional[UUID] = None
    so_luong: Optional[int] = None
    don_vi_tinh: Optional[str] = None
    han_dung: Optional[str] = None
    duong_dan_chung_nhan: Optional[str] = None
    ghi_chu: Optional[str] = None
    ket_qua: Optional[str] = None

class Submission(BaseModel):
    id: UUID
    id_nguoi_nop: UUID
    id_nha_thuoc: UUID
    id_loai_thuoc: UUID
    so_luong: int
    don_vi_tinh: str
    han_dung: Optional[str] = None
    ket_qua: str
    duong_dan_chung_nhan: Optional[str] = None
    ghi_chu: Optional[str] = None
    thoi_gian_xu_ly: datetime
    
    model_config = ConfigDict(from_attributes=True)

class EnrichedSubmission(BaseModel):
    id: UUID
    createdAt: datetime
    submittedAt: datetime
    name: str
    medicineName: str
    type: str
    unit: str
    quantity: int
    status: Literal['PENDING', 'APPROVED', 'REJECTED']
    points: int = 0
    manufacturer: str = ""
    condition: str = "unknown"
    nha_thuoc: Optional[dict] = None
    raw: dict

# Classification models
class ClassificationCreate(BaseModel):
    ket_qua: Literal['TAI_SU_DUNG', 'TIEU_HUY', 'XEM_XET']
    gia_tri_do: Optional[str] = None
    bang_chung_url: Optional[str] = None
    ghi_chu: Optional[str] = None
    points: Optional[int] = 0

# Notification models
class NotificationCreate(BaseModel):
    id_nguoi_nhan: Optional[UUID] = None
    noi_dung: str
    loai_thong_bao: Literal['SYSTEM', 'SUBMISSION', 'VOUCHER', 'USER', 'FORUM', 'FORUM_COMMENT'] = 'SYSTEM'
    metadata: Optional[dict] = None

class Notification(BaseModel):
    id: UUID
    id_nguoi_gui: Optional[UUID] = None
    id_nguoi_nhan: Optional[UUID] = None
    noi_dung: str
    loai_thong_bao: str
    metadata: Optional[dict] = None
    ngay_tao: datetime
    da_xem: int
    
    model_config = ConfigDict(from_attributes=True)

# Chat models
class ChatMessageCreate(BaseModel):
    content: str
    user_id: Optional[UUID] = None
    message_type: Optional[str] = "user_chat"  # user_chat, admin_chat, chatbot

class ChatMessage(BaseModel):
    id: UUID
    sender_id: UUID
    recipient_id: Optional[UUID] = None
    content: str
    message_type: str
    conversation_id: Optional[UUID] = None
    created_at: datetime
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    recipient_name: Optional[str] = None
    is_read: Optional[bool] = False

# Voucher models
class VoucherCreate(BaseModel):
    ten_voucher: str
    mo_ta: Optional[str] = None
    diem_can_thiet: int
    so_luong_con_lai: int
    ngay_het_han: Optional[datetime] = None

class Voucher(BaseModel):
    id: UUID
    ten_voucher: str
    mo_ta: Optional[str] = None
    diem_can_thiet: int
    so_luong_con_lai: int
    trang_thai: str
    ngay_tao: datetime
    ngay_het_han: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# Feedback models
class FeedbackCreate(BaseModel):
    content: str
    rating: Optional[int] = None

class Feedback(BaseModel):
    id: UUID
    id_nguoi_nop: UUID
    noi_dung: str
    danh_gia: Optional[int] = None
    ngay_tao: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Forum models
class ForumPostCreate(BaseModel):
    title: str
    content: str
    images: Optional[List[str]] = []  # Array of image URLs
    attachments: Optional[List[dict]] = []  # Array of file objects
    tags: Optional[List[str]] = []

class ForumCommentCreate(BaseModel):
    content: str
    images: Optional[List[str]] = []  # Array of image URLs

class ForumPost(BaseModel):
    id: str
    title: str
    content: str
    images: Optional[List[str]] = []
    attachments: Optional[List[dict]] = []
    tags: Optional[List[str]] = []
    authorId: UUID
    authorName: str
    views: int = 0
    createdAt: datetime
    comments: list = []

# Metrics
class MetricPoint(BaseModel):
    label: str
    value: int = 0

class DistributionItem(BaseModel):
    label: str
    value: int = 0

class UserDashboardStats(BaseModel):
    points: int = 0
    level: str = "Bronze"
    submissions: int = 0
    approved: int = 0
    pending: int = 0
    rejected: int = 0
    returned: int = 0
    recalled: int = 0
    vouchersUsed: int = 0
    monthlyPoints: List[MetricPoint] = []

class DashboardMetrics(BaseModel):
    totalSubmissions: int = 0
    pendingSubmissions: int = 0
    totalUsers: int = 0
    totalVouchers: int = 0
    processedSubmissions: int = 0
    submissionTrend: List[MetricPoint] = []
    voucherTrend: List[MetricPoint] = []
    userRoleDistribution: List[DistributionItem] = []
    medicineDistribution: List[DistributionItem] = []
    userStats: Optional[UserDashboardStats] = None
