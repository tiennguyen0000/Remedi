"""
Admin management routes
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime
from uuid import uuid4
from pydantic import BaseModel
from ..database import get_db_connection
from ..auth import get_current_user, require_admin

router = APIRouter()

# ============================================================
# MODELS
# ============================================================

class SubmissionActionRequest(BaseModel):
    action: str  # "approve", "reject", "return_to_pharmacy", "recall"
    points_system: Optional[str] = "system"  # "system" or "pharmacy"
    points: Optional[int] = None
    ghi_chu: Optional[str] = None
    classifications: Optional[List[dict]] = None

class VoucherManageRequest(BaseModel):
    ten_voucher: str
    mo_ta: Optional[str] = None
    diem_can_thiet: int
    so_luong_con_lai: int
    ngay_het_han: Optional[str] = None
    trang_thai: Optional[str] = "active"

class SystemNotificationRequest(BaseModel):
    noi_dung: str
    loai_thong_bao: str = "SYSTEM"
    target_users: Optional[List[str]] = None  # List of user IDs, None = all users

class UserMessageRequest(BaseModel):
    user_id: str
    noi_dung: str
    loai_thong_bao: str = "USER"

class ClassificationResultRequest(BaseModel):
    id_ho_so_xu_ly: str
    id_tieu_chi: str
    ket_qua: str
    gia_tri_do: Optional[str] = None
    bang_chung_url: Optional[str] = None
    ghi_chu: Optional[str] = None

# ============================================================
# SUBMISSION MANAGEMENT
# ============================================================

@router.get("/submissions")
async def get_all_submissions(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    """Get all submissions (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        query = """
            SELECT 
                hs.*,
                u.ho_ten, u.email,
                nt.ten_nha_thuoc, nt.id as nha_thuoc_id,
                lt.ten_hoat_chat, lt.thuong_hieu
            FROM ho_so_xu_ly hs
            LEFT JOIN users u ON hs.id_nguoi_nop = u.id
            LEFT JOIN nha_thuoc nt ON hs.id_nha_thuoc = nt.id
            LEFT JOIN loai_thuoc lt ON hs.id_loai_thuoc = lt.id
        """
        params = []
        if status_filter:
            query += " WHERE hs.ket_qua = $1"
            params.append(status_filter)
        query += " ORDER BY hs.thoi_gian_xu_ly DESC"
        
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.post("/submissions/{submission_id}/action")
async def handle_submission_action(
    submission_id: str,
    action_data: SubmissionActionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Handle submission actions: approve, reject, return to pharmacy, recall (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Get submission
            submission = await conn.fetchrow(
                """
                SELECT hs.*, u.id as user_id, u.diem_tich_luy
                FROM ho_so_xu_ly hs
                JOIN users u ON hs.id_nguoi_nop = u.id
                WHERE hs.id = $1
                """,
                submission_id
            )
            
            if not submission:
                raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
            
            # Update submission status
            action_map = {
                "approve": "approved",
                "reject": "rejected",
                "return_to_pharmacy": "returned_to_pharmacy",
                "recall": "recalled"
            }
            new_status = action_map.get(action_data.action)
            if not new_status:
                raise HTTPException(status_code=400, detail="Hành động không hợp lệ")
            
            await conn.execute(
                """
                UPDATE ho_so_xu_ly
                SET ket_qua = $1, ghi_chu = $2
                WHERE id = $3
                """,
                new_status,
                action_data.ghi_chu,
                submission_id
            )
            
            # Save classifications if provided
            if action_data.classifications:
                # Validate classifications
                valid_ket_qua = ['DAT', 'KHONG_DAT', 'XEM_XET']
                for classification in action_data.classifications:
                    if not classification.get('id_tieu_chi'):
                        raise HTTPException(status_code=400, detail="Thiếu id_tieu_chi trong classification")
                    if classification.get('ket_qua') not in valid_ket_qua:
                        raise HTTPException(status_code=400, detail=f"Kết quả không hợp lệ: {classification.get('ket_qua')}")
                
                # Calculate overall result from criteria results
                ket_qua_list = [c.get('ket_qua') for c in action_data.classifications]
                if all(kq == 'DAT' for kq in ket_qua_list):
                    ket_qua_tong = 'DAT'
                elif any(kq == 'KHONG_DAT' for kq in ket_qua_list):
                    ket_qua_tong = 'KHONG_DAT'
                else:
                    ket_qua_tong = 'XEM_XET'
                
                # Delete existing classification result for this submission first
                await conn.execute(
                    "DELETE FROM ket_qua_phan_loai WHERE id_ho_so_xu_ly = $1",
                    submission_id
                )
                
                # Insert overall classification result
                ket_qua_id = str(uuid4())
                await conn.execute(
                    """
                    INSERT INTO ket_qua_phan_loai 
                    (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    ket_qua_id,
                    submission_id,
                    ket_qua_tong,
                    current_user['id'],
                    action_data.ghi_chu
                )
                
                # Insert detailed criteria evaluations
                for classification in action_data.classifications:
                    # Verify criteria exists
                    criteria_check = await conn.fetchrow(
                        "SELECT id FROM tieu_chi_phan_loai WHERE id = $1",
                        classification.get('id_tieu_chi')
                    )
                    if not criteria_check:
                        raise HTTPException(status_code=404, detail=f"Không tìm thấy tiêu chí: {classification.get('id_tieu_chi')}")
                    
                    await conn.execute(
                        """
                        INSERT INTO chi_tiet_danh_gia 
                        (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, bang_chung_url, ghi_chu)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        ket_qua_id,
                        classification.get('id_tieu_chi'),
                        classification.get('ket_qua'),
                        classification.get('gia_tri_do') or None,
                        classification.get('bang_chung_url') or None,
                        classification.get('ghi_chu') or None
                    )
            
            # Calculate and award points if approved
            points_awarded = 0
            if new_status == "approved":
                if action_data.points is not None and action_data.points >= 0:
                    points_awarded = action_data.points
                else:
                    # Default calculation based on quantity
                    so_luong = submission.get('so_luong', 0) or 0
                    if action_data.points_system == "pharmacy":
                        # Pharmacy-based points (could be different calculation)
                        points_awarded = max(15, (so_luong // 10) * 15)
                    else:
                        # System-based points
                        points_awarded = max(10, (so_luong // 10) * 10)
                
                # Update user points
                await conn.execute(
                    "UPDATE users SET diem_tich_luy = diem_tich_luy + $1 WHERE id = $2",
                    points_awarded,
                    submission['user_id']
                )
                
                # Record points in diem_thuong
                await conn.execute(
                    """
                    INSERT INTO diem_thuong (id, id_nguoi_nop, diem, ly_do, trang_thai)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    str(uuid4()),
                    submission['user_id'],
                    points_awarded,
                    f"Nộp thuốc thành công - Hồ sơ #{submission_id[:8]} ({action_data.points_system})",
                    "completed"
                )
                
                # Create notification
                await conn.execute(
                    """
                    INSERT INTO thong_bao (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    str(uuid4()),
                    current_user['id'],
                    submission['user_id'],
                    f"Hồ sơ nộp thuốc của bạn đã được duyệt. Bạn nhận được {points_awarded} điểm!",
                    'SUBMISSION',
                    datetime.utcnow(),
                    0
                )
            elif new_status == "rejected":
                # Create rejection notification
                await conn.execute(
                    """
                    INSERT INTO thong_bao (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    str(uuid4()),
                    current_user['id'],
                    submission['user_id'],
                    f"Hồ sơ nộp thuốc của bạn đã bị từ chối. Lý do: {action_data.ghi_chu or 'Không đạt tiêu chuẩn'}",
                    'SUBMISSION',
                    datetime.utcnow(),
                    0
                )
            elif new_status == "returned_to_pharmacy":
                # Create return to pharmacy notification
                await conn.execute(
                    """
                    INSERT INTO thong_bao (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    str(uuid4()),
                    current_user['id'],
                    submission['user_id'],
                    f"Hồ sơ nộp thuốc của bạn đã được trả về nhà thuốc. Lý do: {action_data.ghi_chu or 'Cần bổ sung thông tin'}",
                    'SUBMISSION',
                    datetime.utcnow(),
                    0
                )
            elif new_status == "recalled":
                # Create recall notification
                await conn.execute(
                    """
                    INSERT INTO thong_bao (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    str(uuid4()),
                    current_user['id'],
                    submission['user_id'],
                    f"Hồ sơ nộp thuốc của bạn đã bị thu hồi. Lý do: {action_data.ghi_chu or 'Vi phạm quy định'}",
                    'SUBMISSION',
                    datetime.utcnow(),
                    0
                )
            
            return {
                "message": "Xử lý hồ sơ thành công",
                "status": new_status,
                "points_awarded": points_awarded
            }

# ============================================================
# CLASSIFICATION RESULTS MANAGEMENT
# ============================================================

@router.get("/classification-results")
async def get_classification_results(
    submission_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get classification results with detailed criteria evaluations (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        if submission_id:
            # Get overall result
            result = await conn.fetchrow("""
                SELECT kq.*, u.ho_ten as ten_nguoi_danh_gia
                FROM ket_qua_phan_loai kq
                LEFT JOIN users u ON kq.nguoi_danh_gia = u.id
                WHERE kq.id_ho_so_xu_ly = $1
            """, submission_id)
            
            if not result:
                return []
            
            # Get criteria details
            details = await conn.fetch("""
                SELECT ct.*, tc.ten_tieu_chi, tc.ma_tieu_chi, tc.kieu_du_lieu
                FROM chi_tiet_danh_gia ct
                JOIN tieu_chi_phan_loai tc ON ct.id_tieu_chi = tc.id
                WHERE ct.id_ket_qua = $1
            """, result['id'])
            
            result_dict = dict(result)
            result_dict['chi_tiet'] = [dict(d) for d in details]
            return [result_dict]
        else:
            # Get all results
            results = await conn.fetch("""
                SELECT kq.*, u.ho_ten as ten_nguoi_danh_gia, 
                       hs.id as ho_so_id, hs.ket_qua as ho_so_ket_qua
                FROM ket_qua_phan_loai kq
                LEFT JOIN users u ON kq.nguoi_danh_gia = u.id
                JOIN ho_so_xu_ly hs ON kq.id_ho_so_xu_ly = hs.id
                ORDER BY kq.thoi_gian_danh_gia DESC
                LIMIT 100
            """)
            
            result_list = []
            for result in results:
                # Get criteria details for each result
                details = await conn.fetch("""
                    SELECT ct.*, tc.ten_tieu_chi, tc.ma_tieu_chi
                    FROM chi_tiet_danh_gia ct
                    JOIN tieu_chi_phan_loai tc ON ct.id_tieu_chi = tc.id
                    WHERE ct.id_ket_qua = $1
                """, result['id'])
                
                result_dict = dict(result)
                result_dict['chi_tiet'] = [dict(d) for d in details]
                result_list.append(result_dict)
            
            return result_list

@router.post("/classification-results")
async def create_classification_result(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create overall classification result with criteria details (Admin only)"""
    await require_admin(current_user)
    
    submission_id = data.get('id_ho_so_xu_ly')
    ket_qua_tong = data.get('ket_qua_tong')
    chi_tiet_list = data.get('chi_tiet', [])
    ghi_chu_chung = data.get('ghi_chu_chung')
    
    if not submission_id or not ket_qua_tong:
        raise HTTPException(status_code=400, detail="Thiếu id_ho_so_xu_ly hoặc ket_qua_tong")
    
    if ket_qua_tong not in ['DAT', 'KHONG_DAT', 'XEM_XET']:
        raise HTTPException(status_code=400, detail="Kết quả tổng không hợp lệ")
    
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Verify submission exists
            submission = await conn.fetchrow("SELECT id FROM ho_so_xu_ly WHERE id = $1", submission_id)
            if not submission:
                raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
            
            # Delete existing result if any
            await conn.execute("DELETE FROM ket_qua_phan_loai WHERE id_ho_so_xu_ly = $1", submission_id)
            
            # Create overall result
            ket_qua_id = str(uuid4())
            await conn.execute("""
                INSERT INTO ket_qua_phan_loai 
                (id, id_ho_so_xu_ly, ket_qua_tong, nguoi_danh_gia, ghi_chu_chung)
                VALUES ($1, $2, $3, $4, $5)
            """, ket_qua_id, submission_id, ket_qua_tong, current_user['id'], ghi_chu_chung)
            
            # Insert criteria details
            for detail in chi_tiet_list:
                if detail.get('ket_qua') not in ['DAT', 'KHONG_DAT', 'XEM_XET']:
                    continue
                
                await conn.execute("""
                    INSERT INTO chi_tiet_danh_gia 
                    (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, bang_chung_url, ghi_chu)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, 
                    ket_qua_id,
                    detail.get('id_tieu_chi'),
                    detail.get('ket_qua'),
                    detail.get('gia_tri_do'),
                    detail.get('bang_chung_url'),
                    detail.get('ghi_chu')
                )
            
            # Get created result with details
            result = await conn.fetchrow("SELECT * FROM ket_qua_phan_loai WHERE id = $1", ket_qua_id)
            details = await conn.fetch("""
                SELECT ct.*, tc.ten_tieu_chi 
                FROM chi_tiet_danh_gia ct
                JOIN tieu_chi_phan_loai tc ON ct.id_tieu_chi = tc.id
                WHERE ct.id_ket_qua = $1
            """, ket_qua_id)
            
            result_dict = dict(result)
            result_dict['chi_tiet'] = [dict(d) for d in details]
            return result_dict

@router.put("/classification-results/{result_id}")
async def update_classification_result(
    result_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update overall classification result with criteria details (Admin only)"""
    await require_admin(current_user)
    
    ket_qua_tong = data.get('ket_qua_tong')
    chi_tiet_list = data.get('chi_tiet', [])
    ghi_chu_chung = data.get('ghi_chu_chung')
    
    if ket_qua_tong and ket_qua_tong not in ['DAT', 'KHONG_DAT', 'XEM_XET']:
        raise HTTPException(status_code=400, detail="Kết quả tổng không hợp lệ")
    
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Verify result exists
            existing = await conn.fetchrow("SELECT id FROM ket_qua_phan_loai WHERE id = $1", result_id)
            if not existing:
                raise HTTPException(status_code=404, detail="Không tìm thấy kết quả phân loại")
            
            # Update overall result
            await conn.execute("""
                UPDATE ket_qua_phan_loai
                SET ket_qua_tong = COALESCE($1, ket_qua_tong), 
                    ghi_chu_chung = COALESCE($2, ghi_chu_chung)
                WHERE id = $3
            """, ket_qua_tong, ghi_chu_chung, result_id)
            
            # Update criteria details if provided
            if chi_tiet_list:
                # Delete old details
                await conn.execute("DELETE FROM chi_tiet_danh_gia WHERE id_ket_qua = $1", result_id)
                
                # Insert new details
                for detail in chi_tiet_list:
                    if detail.get('ket_qua') not in ['DAT', 'KHONG_DAT', 'XEM_XET']:
                        continue
                    
                    await conn.execute("""
                        INSERT INTO chi_tiet_danh_gia 
                        (id_ket_qua, id_tieu_chi, ket_qua, gia_tri_do, bang_chung_url, ghi_chu)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    """, 
                        result_id,
                        detail.get('id_tieu_chi'),
                        detail.get('ket_qua'),
                        detail.get('gia_tri_do'),
                        detail.get('bang_chung_url'),
                        detail.get('ghi_chu')
                    )
            
            # Get updated result
            result = await conn.fetchrow("SELECT * FROM ket_qua_phan_loai WHERE id = $1", result_id)
            details = await conn.fetch("""
                SELECT ct.*, tc.ten_tieu_chi 
                FROM chi_tiet_danh_gia ct
                JOIN tieu_chi_phan_loai tc ON ct.id_tieu_chi = tc.id
                WHERE ct.id_ket_qua = $1
            """, result_id)
            
            result_dict = dict(result)
            result_dict['chi_tiet'] = [dict(d) for d in details]
            return result_dict

@router.delete("/classification-results/{result_id}")
async def delete_classification_result(
    result_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete classification result (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        # Verify result exists
        existing = await conn.fetchrow(
            "SELECT id FROM ket_qua_phan_loai WHERE id = $1",
            result_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy kết quả phân loại")
        
        await conn.execute(
            "DELETE FROM ket_qua_phan_loai WHERE id = $1",
            result_id
        )
        return {"ok": True, "message": "Đã xóa kết quả phân loại"}

# ============================================================
# VOUCHER MANAGEMENT
# ============================================================

@router.get("/vouchers")
async def get_all_vouchers(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user)
):
    """Get all vouchers (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        query = "SELECT * FROM voucher"
        params = []
        if status_filter:
            query += " WHERE trang_thai = $1"
            params.append(status_filter)
        query += " ORDER BY ngay_tao DESC"
        
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.post("/vouchers")
async def create_voucher(
    voucher: VoucherManageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create voucher (Admin only)"""
    await require_admin(current_user)
    
    # Validate inputs
    if voucher.diem_can_thiet < 0:
        raise HTTPException(status_code=400, detail="Điểm cần thiết không thể âm")
    if voucher.so_luong_con_lai < 0:
        raise HTTPException(status_code=400, detail="Số lượng còn lại không thể âm")
    if voucher.trang_thai not in ['active', 'inactive', 'expired']:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    
    async with get_db_connection() as conn:
        voucher_id = str(uuid4())
        ngay_het_han = None
        if voucher.ngay_het_han:
            try:
                ngay_het_han = datetime.strptime(voucher.ngay_het_han, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD")
        
        await conn.execute(
            """
            INSERT INTO voucher 
            (id, ten_voucher, mo_ta, diem_can_thiet, so_luong_con_lai, ngay_het_han, trang_thai, ngay_tao)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            voucher_id,
            voucher.ten_voucher,
            voucher.mo_ta,
            voucher.diem_can_thiet,
            voucher.so_luong_con_lai,
            ngay_het_han,
            voucher.trang_thai,
            datetime.utcnow()
        )
        
        row = await conn.fetchrow("SELECT * FROM voucher WHERE id = $1", voucher_id)
        return dict(row)

@router.put("/vouchers/{voucher_id}")
async def update_voucher(
    voucher_id: str,
    voucher: VoucherManageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update voucher (Admin only)"""
    await require_admin(current_user)
    
    # Validate inputs
    if voucher.diem_can_thiet < 0:
        raise HTTPException(status_code=400, detail="Điểm cần thiết không thể âm")
    if voucher.so_luong_con_lai < 0:
        raise HTTPException(status_code=400, detail="Số lượng còn lại không thể âm")
    if voucher.trang_thai not in ['active', 'inactive', 'expired']:
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    
    async with get_db_connection() as conn:
        # Verify voucher exists
        existing = await conn.fetchrow(
            "SELECT id FROM voucher WHERE id = $1",
            voucher_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy voucher")
        
        ngay_het_han = None
        if voucher.ngay_het_han:
            try:
                ngay_het_han = datetime.strptime(voucher.ngay_het_han, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD")
        
        await conn.execute(
            """
            UPDATE voucher 
            SET ten_voucher = $1, mo_ta = $2, diem_can_thiet = $3, 
                so_luong_con_lai = $4, ngay_het_han = $5, trang_thai = $6
            WHERE id = $7
            """,
            voucher.ten_voucher,
            voucher.mo_ta,
            voucher.diem_can_thiet,
            voucher.so_luong_con_lai,
            ngay_het_han,
            voucher.trang_thai,
            voucher_id
        )
        
        row = await conn.fetchrow("SELECT * FROM voucher WHERE id = $1", voucher_id)
        return dict(row)

@router.delete("/vouchers/{voucher_id}")
async def delete_voucher(
    voucher_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete voucher (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        # Verify voucher exists
        existing = await conn.fetchrow(
            "SELECT id FROM voucher WHERE id = $1",
            voucher_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Không tìm thấy voucher")
        
        # Check if voucher has been used
        usage = await conn.fetchrow(
            "SELECT COUNT(*)::int as count FROM voucher_usage WHERE voucher_id = $1",
            voucher_id
        )
        
        if usage and usage['count'] > 0:
            # Soft delete - mark as inactive
            await conn.execute(
                "UPDATE voucher SET trang_thai = 'inactive' WHERE id = $1",
                voucher_id
            )
            return {"ok": True, "message": "Voucher đã được đánh dấu không hoạt động (đã có người sử dụng)"}
        else:
            # Hard delete
            await conn.execute("DELETE FROM voucher WHERE id = $1", voucher_id)
            return {"ok": True, "message": "Đã xóa voucher"}

# ============================================================
# NOTIFICATION MANAGEMENT
# ============================================================

@router.post("/notifications/system")
async def create_system_notification(
    notification: SystemNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create system notification (Admin only)"""
    await require_admin(current_user)
    
    # Validate notification type
    valid_types = ['SYSTEM', 'USER', 'SUBMISSION', 'VOUCHER']
    if notification.loai_thong_bao not in valid_types:
        raise HTTPException(status_code=400, detail=f"Loại thông báo không hợp lệ. Phải là một trong: {', '.join(valid_types)}")
    
    if not notification.noi_dung or not notification.noi_dung.strip():
        raise HTTPException(status_code=400, detail="Nội dung thông báo không được để trống")
    
    async with get_db_connection() as conn:
        notification_count = 0
        
        if notification.target_users:
            # Send to specific users
            for user_id in notification.target_users:
                # Verify user exists
                user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
                if user:
                    await conn.execute(
                        """
                        INSERT INTO thong_bao 
                        (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        str(uuid4()),
                        current_user['id'],
                        user_id,
                        notification.noi_dung.strip(),
                        notification.loai_thong_bao,
                        datetime.utcnow(),
                        0
                    )
                    notification_count += 1
        else:
            # Send to all users
            users = await conn.fetch("SELECT id FROM users")
            for user in users:
                await conn.execute(
                    """
                    INSERT INTO thong_bao 
                    (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    str(uuid4()),
                    current_user['id'],
                    user['id'],
                    notification.noi_dung.strip(),
                    notification.loai_thong_bao,
                    datetime.utcnow(),
                    0
                )
                notification_count += 1
        
        return {"ok": True, "message": f"Đã gửi {notification_count} thông báo"}

@router.post("/notifications/user")
async def create_user_message(
    message: UserMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send message to specific user (Admin only)"""
    await require_admin(current_user)
    
    # Validate inputs
    if not message.user_id:
        raise HTTPException(status_code=400, detail="User ID không được để trống")
    if not message.noi_dung or not message.noi_dung.strip():
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được để trống")
    
    # Validate notification type
    valid_types = ['SYSTEM', 'USER', 'SUBMISSION', 'VOUCHER']
    if message.loai_thong_bao not in valid_types:
        raise HTTPException(status_code=400, detail=f"Loại thông báo không hợp lệ. Phải là một trong: {', '.join(valid_types)}")
    
    async with get_db_connection() as conn:
        # Verify user exists
        user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", message.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Không tìm thấy user")
        
        await conn.execute(
            """
            INSERT INTO thong_bao 
            (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            str(uuid4()),
            current_user['id'],
            message.user_id,
            message.noi_dung.strip(),
            message.loai_thong_bao,
            datetime.utcnow(),
            0
        )
        
        return {"ok": True, "message": "Đã gửi tin nhắn"}

# ============================================================
# COLLABORATOR MANAGEMENT
# ============================================================

@router.get("/collaborator-requests")
async def get_collaborator_requests(current_user: dict = Depends(get_current_user)):
    """Get all pending collaborator requests (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        rows = await conn.fetch("""
            SELECT id, ho_ten, email, so_dien_thoai, dia_chi, diem_tich_luy, ngay_tao
            FROM users 
            WHERE role = 'USER' 
            AND yeu_cau_cong_tac_vien = true
            ORDER BY ngay_tao DESC
        """)
        return [dict(row) for row in rows]

@router.post("/collaborator-requests/{user_id}/{action}")
async def approve_collaborator_request(
    user_id: str,
    action: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject collaborator request (Admin only)"""
    await require_admin(current_user)
    
    if action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Check if user exists and has pending request
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1 AND yeu_cau_cong_tac_vien = true",
                user_id
            )
            
            if not user:
                raise HTTPException(
                    status_code=404, 
                    detail="User not found or no pending collaborator request"
                )
            
            if action == 'approve':
                # Upgrade to collaborator
                await conn.execute(
                    "UPDATE users SET role = 'CONGTACVIEN', yeu_cau_cong_tac_vien = false WHERE id = $1",
                    user_id
                )
                
                # Send notification to user
                await conn.execute("""
                    INSERT INTO thong_bao (id, id_nguoi_nhan, noi_dung, loai_thong_bao)
                    VALUES ($1, $2, $3, 'SYSTEM')
                """, 
                    str(uuid4()),
                    user_id,
                    "✅ Chúc mừng! Yêu cầu trở thành Cộng tác viên của bạn đã được phê duyệt. Bạn giờ có thể truy cập các tính năng dành cho Cộng tác viên."
                )
                
                message = "Đã phê duyệt yêu cầu Cộng tác viên"
                
            else:  # reject
                # Reset request flag
                await conn.execute(
                    "UPDATE users SET yeu_cau_cong_tac_vien = false WHERE id = $1",
                    user_id
                )
                
                # Send notification to user
                await conn.execute("""
                    INSERT INTO thong_bao (id, id_nguoi_nhan, noi_dung, loai_thong_bao)
                    VALUES ($1, $2, $3, 'SYSTEM')
                """, 
                    str(uuid4()),
                    user_id,
                    "❌ Rất tiếc, yêu cầu trở thành Cộng tác viên của bạn đã bị từ chối. Vui lòng liên hệ admin để biết thêm chi tiết hoặc gửi lại yêu cầu sau."
                )
                
                message = "Đã từ chối yêu cầu Cộng tác viên"
            
            return {"message": message, "action": action, "user_id": user_id}

# ============================================================
# STATISTICS
# ============================================================

@router.get("/statistics")
async def get_admin_statistics(
    current_user: dict = Depends(get_current_user)
):
    """Get admin statistics (Admin/CTV only)"""
    if current_user['role'] not in ['ADMIN', 'CONGTACVIEN']:
        raise HTTPException(status_code=403, detail="Chỉ Admin/Cộng tác viên mới có quyền")
    
    async with get_db_connection() as conn:
        # Submissions stats
        submissions_stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) FILTER (WHERE ket_qua = 'pending') as pending,
                COUNT(*) FILTER (WHERE ket_qua = 'approved') as approved,
                COUNT(*) FILTER (WHERE ket_qua = 'rejected') as rejected,
                COUNT(*) FILTER (WHERE ket_qua = 'returned_to_pharmacy') as returned,
                COUNT(*) FILTER (WHERE ket_qua = 'recalled') as recalled,
                COUNT(*) as total
            FROM ho_so_xu_ly
            """
        )
        
        # Vouchers stats
        vouchers_stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) FILTER (WHERE trang_thai = 'active') as active,
                COUNT(*) FILTER (WHERE trang_thai = 'inactive') as inactive,
                COUNT(*) as total,
                COALESCE(SUM(so_luong_con_lai), 0) as total_remaining
            FROM voucher
            """
        )
        
        # Users stats
        users_stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE role = 'USER') as users,
                COUNT(*) FILTER (WHERE role = 'CONGTACVIEN') as collaborators,
                COUNT(*) FILTER (WHERE role = 'ADMIN') as admins,
                COALESCE(SUM(diem_tich_luy), 0) as total_points
            FROM users
            """
        )
        
        # Points stats
        points_stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(diem) FILTER (WHERE trang_thai = 'COMPLETED'), 0) as total_awarded,
                COUNT(*) FILTER (WHERE trang_thai = 'COMPLETED') as completed_transactions
            FROM diem_thuong
            """
        )
        
        # Classification stats
        classification_stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE ket_qua_tong = 'DAT') as dat,
                COUNT(*) FILTER (WHERE ket_qua_tong = 'KHONG_DAT') as khong_dat,
                COUNT(*) FILTER (WHERE ket_qua_tong = 'XEM_XET') as xem_xet
            FROM ket_qua_phan_loai
            """
        )
        
        return {
            "submissions": dict(submissions_stats),
            "vouchers": dict(vouchers_stats),
            "users": dict(users_stats),
            "points": dict(points_stats),
            "classifications": dict(classification_stats)
        }

