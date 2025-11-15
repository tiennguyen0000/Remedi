from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
from ..database import get_db_connection
from ..auth import get_current_user, require_admin
from pydantic import BaseModel

router = APIRouter()

# ============================================================
# MODELS
# ============================================================

class CriteriaResponse(BaseModel):
    id: str
    ma_tieu_chi: str
    ten_tieu_chi: str
    mo_ta: Optional[str]
    kieu_du_lieu: str
    hoat_dong: bool

class ClassificationResult(BaseModel):
    id_tieu_chi: str
    ket_qua: str
    gia_tri_do: Optional[str] = None
    bang_chung_url: Optional[str] = None
    ghi_chu: Optional[str] = None

class SubmissionApprovalRequest(BaseModel):
    ket_qua: str
    classifications: List[ClassificationResult]
    ghi_chu: Optional[str] = None

# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/criteria", response_model=List[CriteriaResponse])
async def get_active_criteria(current_user: dict = Depends(get_current_user)):
    """Get all active classification criteria (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT id::text, ma_tieu_chi, ten_tieu_chi, mo_ta, kieu_du_lieu, hoat_dong
            FROM tieu_chi_phan_loai
            WHERE hoat_dong = true
            ORDER BY ngay_tao ASC
            """
        )
        return [dict(row) for row in rows]

@router.get("/pending")
async def get_pending_submissions(current_user: dict = Depends(get_current_user)):
    """Get all pending submissions for approval (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT 
                hs.id,
                hs.id_nguoi_nop,
                u.ho_ten,
                u.email,
                nt.ten_nha_thuoc,
                lt.ten_hoat_chat,
                lt.thuong_hieu,
                hs.so_luong,
                hs.don_vi_tinh,
                hs.han_dung::text,
                hs.ket_qua,
                hs.ghi_chu,
                hs.thoi_gian_xu_ly::text,
                hs.duong_dan_chung_nhan
            FROM ho_so_xu_ly hs
            JOIN users u ON hs.id_nguoi_nop = u.id
            JOIN nha_thuoc nt ON hs.id_nha_thuoc = nt.id
            JOIN loai_thuoc lt ON hs.id_loai_thuoc = lt.id
            WHERE hs.ket_qua = 'pending'
            ORDER BY hs.thoi_gian_xu_ly DESC
            """
        )
        
        submissions = []
        for row in rows:
            sub = dict(row)
            
            # Get existing classifications
            class_rows = await conn.fetch(
                """
                SELECT 
                    kq.id,
                    kq.id_tieu_chi,
                    tc.ten_tieu_chi,
                    kq.ket_qua,
                    kq.gia_tri_do,
                    kq.bang_chung_url,
                    kq.ghi_chu,
                    kq.thoi_gian_danh_gia::text
                FROM ket_qua_phan_loai kq
                JOIN tieu_chi_phan_loai tc ON kq.id_tieu_chi = tc.id
                WHERE kq.id_ho_so_xu_ly = $1
                ORDER BY kq.thoi_gian_danh_gia DESC
                """,
                sub['id']
            )
            sub['classifications'] = [dict(r) for r in class_rows]
            submissions.append(sub)
        
        return submissions

@router.get("/{submission_id}")
async def get_submission_detail(
    submission_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed submission info (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT 
                hs.id,
                hs.id_nguoi_nop,
                u.ho_ten,
                u.email,
                nt.ten_nha_thuoc,
                lt.ten_hoat_chat,
                lt.thuong_hieu,
                hs.so_luong,
                hs.don_vi_tinh,
                hs.han_dung::text,
                hs.ket_qua,
                hs.ghi_chu,
                hs.thoi_gian_xu_ly::text,
                hs.duong_dan_chung_nhan
            FROM ho_so_xu_ly hs
            JOIN users u ON hs.id_nguoi_nop = u.id
            JOIN nha_thuoc nt ON hs.id_nha_thuoc = nt.id
            JOIN loai_thuoc lt ON hs.id_loai_thuoc = lt.id
            WHERE hs.id = $1
            """,
            submission_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
        
        submission = dict(row)
        
        # Get classifications
        class_rows = await conn.fetch(
            """
            SELECT 
                kq.id,
                kq.id_tieu_chi,
                tc.ten_tieu_chi,
                kq.ket_qua,
                kq.gia_tri_do,
                kq.bang_chung_url,
                kq.ghi_chu,
                kq.thoi_gian_danh_gia::text
            FROM ket_qua_phan_loai kq
            JOIN tieu_chi_phan_loai tc ON kq.id_tieu_chi = tc.id
            WHERE kq.id_ho_so_xu_ly = $1
            ORDER BY kq.thoi_gian_danh_gia DESC
            """,
            submission_id
        )
        submission['classifications'] = [dict(r) for r in class_rows]
        
        return submission

@router.post("/{submission_id}/approve")
async def approve_submission(
    submission_id: str,
    approval_data: SubmissionApprovalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject submission with classification (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    if approval_data.ket_qua not in ['approved', 'rejected']:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Check submission exists and is pending
            submission = await conn.fetchrow(
                """
                SELECT hs.*, u.diem_tich_luy, u.id as user_id
                FROM ho_so_xu_ly hs
                JOIN users u ON hs.id_nguoi_nop = u.id
                WHERE hs.id = $1 AND hs.ket_qua = 'pending'
                """,
                submission_id
            )
            
            if not submission:
                raise HTTPException(status_code=404, detail="Hồ sơ không tồn tại hoặc đã được xử lý")
            
            # Update submission status
            await conn.execute(
                """
                UPDATE ho_so_xu_ly
                SET ket_qua = $1, ghi_chu = $2
                WHERE id = $3
                """,
                approval_data.ket_qua,
                approval_data.ghi_chu,
                submission_id
            )
            
            # Save classification results
            for classification in approval_data.classifications:
                await conn.execute(
                    """
                    INSERT INTO ket_qua_phan_loai 
                    (id, id_ho_so_xu_ly, id_tieu_chi, ket_qua, gia_tri_do, bang_chung_url, ghi_chu)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    str(uuid4()),
                    submission_id,
                    classification.id_tieu_chi,
                    classification.ket_qua,
                    classification.gia_tri_do,
                    classification.bang_chung_url,
                    classification.ghi_chu
                )
            
            points_awarded = 0
            
            # Award points if approved
            if approval_data.ket_qua == 'approved':
                points_awarded = max(10, (submission['so_luong'] // 10) * 10)
                
                await conn.execute(
                    "UPDATE users SET diem_tich_luy = diem_tich_luy + $1 WHERE id = $2",
                    points_awarded,
                    submission['user_id']
                )
                
                await conn.execute(
                    "UPDATE ho_so_xu_ly SET diem_da_trao = $1 WHERE id = $2",
                    points_awarded,
                    submission_id
                )
                
                await conn.execute(
                    """
                    INSERT INTO diem_thuong (id, id_nguoi_nop, diem, ly_do, trang_thai)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    str(uuid4()),
                    submission['user_id'],
                    points_awarded,
                    f"Nộp thuốc thành công - Hồ sơ #{submission_id[:8]}",
                    "completed"
                )
                
                # Note: Certificate will be auto-generated by certificate-service
                
                await conn.execute(
                    """
                    INSERT INTO thong_bao (id, id_nguoi_nhan, noi_dung, loai_thong_bao)
                    VALUES ($1, $2, $3, $4)
                    """,
                    str(uuid4()),
                    submission['user_id'],
                    f"Hồ sơ nộp thuốc của bạn đã được duyệt. Bạn nhận được {points_awarded} điểm!",
                    'SUBMISSION'
                )
            else:
                await conn.execute(
                    """
                    INSERT INTO thong_bao (id, id_nguoi_nhan, noi_dung, loai_thong_bao)
                    VALUES ($1, $2, $3, $4)
                    """,
                    str(uuid4()),
                    submission['user_id'],
                    f"Hồ sơ nộp thuốc của bạn đã bị từ chối. Lý do: {approval_data.ghi_chu or 'Không đạt tiêu chuẩn'}",
                    'SUBMISSION'
                )
            
            return {
                "message": "Xử lý hồ sơ thành công",
                "status": approval_data.ket_qua,
                "points_awarded": points_awarded
            }

@router.get("/statistics/overview")
async def get_approval_statistics(current_user: dict = Depends(get_current_user)):
    """Get approval statistics (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        overview = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) FILTER (WHERE ket_qua = 'pending') as pending,
                COUNT(*) FILTER (WHERE ket_qua = 'approved') as approved,
                COUNT(*) FILTER (WHERE ket_qua = 'rejected') as rejected,
                COUNT(*) as total
            FROM ho_so_xu_ly
            """
        )
        
        criteria_rows = await conn.fetch(
            """
            SELECT 
                tc.ten_tieu_chi,
                COUNT(*) FILTER (WHERE kq.ket_qua = 'DAT') as dat,
                COUNT(*) FILTER (WHERE kq.ket_qua = 'KHONG_DAT') as khong_dat,
                COUNT(*) FILTER (WHERE kq.ket_qua = 'XEM_XET') as xem_xet,
                COUNT(*) as total
            FROM tieu_chi_phan_loai tc
            LEFT JOIN ket_qua_phan_loai kq ON tc.id = kq.id_tieu_chi
            WHERE tc.hoat_dong = true
            GROUP BY tc.id, tc.ten_tieu_chi
            ORDER BY tc.ten_tieu_chi
            """
        )
        
        return {
            "overview": dict(overview),
            "criteria_stats": [dict(row) for row in criteria_rows]
        }
