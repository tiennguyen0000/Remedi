from fastapi import APIRouter, HTTPException, status, Depends, Query
from ..models import (
    Submission, SubmissionCreate, SubmissionUpdate, 
    EnrichedSubmission, ClassificationCreate
)
from ..database import get_db_connection
from ..auth import get_current_user, role_rank, require_reviewer
from uuid import uuid4
from datetime import datetime, date
from typing import Optional

router = APIRouter()

def serialize_dates(row_dict: dict) -> dict:
    """Convert date objects to strings for JSON serialization"""
    result = dict(row_dict)
    if result.get('han_dung') and isinstance(result['han_dung'], date):
        result['han_dung'] = result['han_dung'].isoformat()
    if result.get('thoi_gian_xu_ly') and isinstance(result['thoi_gian_xu_ly'], datetime):
        result['thoi_gian_xu_ly'] = result['thoi_gian_xu_ly'].isoformat()
    return result

@router.get("", response_model=list[Submission])
async def list_submissions(
    current_user: dict = Depends(get_current_user)
):
    """List submissions based on user role"""
    print(f"[SUBMISSIONS] list_submissions called by user: {current_user['ho_ten']}")
    async with get_db_connection() as conn:
        if role_rank(current_user['role']) >= 2:
            # Admin or Collaborator - see all
            print("[SUBMISSIONS] Fetching all submissions (admin/collaborator)")
            rows = await conn.fetch(
                "SELECT * FROM ho_so_xu_ly ORDER BY thoi_gian_xu_ly DESC"
            )
        else:
            # Regular user - only their own
            print(f"[SUBMISSIONS] Fetching submissions for user: {current_user['id']}")
            rows = await conn.fetch(
                "SELECT * FROM ho_so_xu_ly WHERE id_nguoi_nop = $1 ORDER BY thoi_gian_xu_ly DESC",
                current_user['id']
            )
        
        print(f"[SUBMISSIONS] Found {len(rows)} submissions")
        return [serialize_dates(row) for row in rows]

@router.get("/enriched", response_model=list[EnrichedSubmission])
async def list_enriched_submissions(
    mine: Optional[int] = Query(0),
    current_user: dict = Depends(get_current_user)
):
    """List enriched submissions with medicine and pharmacy details"""
    print(f"[SUBMISSIONS] list_enriched_submissions called by user: {current_user['ho_ten']}, mine={mine}")
    async with get_db_connection() as conn:
        # Determine which submissions to fetch
        if role_rank(current_user['role']) >= 2 and mine != 1:
            # Admin or Collaborator - see all
            print("[SUBMISSIONS] Fetching all enriched submissions (admin/collaborator)")
            submissions = await conn.fetch(
                """
                SELECT hs.*, 
                       lt.ten_hoat_chat, lt.thuong_hieu, lt.dang_bao_che,
                       nt.id as pharmacy_id, nt.ten_nha_thuoc as pharmacy_name, 
                       nt.dia_chi as pharmacy_address, nt.vi_do as lat, nt.kinh_do as lng
                FROM ho_so_xu_ly hs
                LEFT JOIN loai_thuoc lt ON hs.id_loai_thuoc = lt.id
                LEFT JOIN nha_thuoc nt ON hs.id_nha_thuoc = nt.id
                ORDER BY hs.thoi_gian_xu_ly DESC
                """
            )
        else:
            # Regular user or mine=1 - only their own
            print(f"[SUBMISSIONS] Fetching enriched submissions for user: {current_user['id']}")
            submissions = await conn.fetch(
                """
                SELECT hs.*, 
                       lt.ten_hoat_chat, lt.thuong_hieu, lt.dang_bao_che,
                       nt.id as pharmacy_id, nt.ten_nha_thuoc as pharmacy_name, 
                       nt.dia_chi as pharmacy_address, nt.vi_do as lat, nt.kinh_do as lng
                FROM ho_so_xu_ly hs
                LEFT JOIN loai_thuoc lt ON hs.id_loai_thuoc = lt.id
                LEFT JOIN nha_thuoc nt ON hs.id_nha_thuoc = nt.id
                WHERE hs.id_nguoi_nop = $1
                ORDER BY hs.thoi_gian_xu_ly DESC
                """,
                current_user['id']
            )
        
        print(f"[SUBMISSIONS] Found {len(submissions)} enriched submissions")
        
        # Create points map by matching diem_thuong with submissions based on timing
        points_map = {}
        
        # Enrich submissions
        enriched = []
        seen_ids = set()
        
        for sub in submissions:
            if sub['id'] in seen_ids:
                continue
            seen_ids.add(sub['id'])
            
            # Determine status
            result_lower = str(sub['ket_qua']).lower()
            if 'pending' in result_lower or 'cho' in result_lower:
                status = "PENDING"
            elif any(x in result_lower for x in ['tai', 'su_dung', 'approved', 'dat']):
                status = "APPROVED"
            else:
                status = "REJECTED"
            
            # Get points for this submission
            sub_id = str(sub['id'])
            submission_user_id = sub['id_nguoi_nop']  # Use submission's user ID
            points = points_map.get(sub_id, 0)
            
            # If status is APPROVED, try to get points from diem_thuong
            if status == "APPROVED" and points == 0:
                # Query diem_thuong for the submission's user around the submission time
                # Match based on timing and reason containing "nộp thuốc" or "Hồ sơ"
                sub_time = sub['thoi_gian_xu_ly']
                point_records = await conn.fetch(
                    """
                    SELECT diem FROM diem_thuong
                    WHERE id_nguoi_nop = $1 
                        AND trang_thai = 'COMPLETED'
                        AND (ly_do ILIKE '%nộp thuốc%' OR ly_do ILIKE '%Hồ sơ%')
                        AND ngay_cong >= ($2::timestamptz - INTERVAL '3 days')
                        AND ngay_cong <= ($2::timestamptz + INTERVAL '1 day')
                    ORDER BY ABS(EXTRACT(EPOCH FROM (ngay_cong - $2::timestamptz)))
                    LIMIT 1
                    """,
                    submission_user_id,
                    sub_time
                )
                if point_records:
                    points = int(point_records[0]['diem'] or 0)
                    points_map[sub_id] = points  # Cache it to avoid duplicate queries
            
            pharmacy_data = None
            if sub['pharmacy_id']:
                pharmacy_data = {
                    'id': str(sub['pharmacy_id']),
                    'ten': sub['pharmacy_name'],
                    'name': sub['pharmacy_name'],
                    'dia_chi': sub['pharmacy_address'],
                    'address': sub['pharmacy_address'],
                    'lat': float(sub['lat']) if sub['lat'] else None,
                    'lng': float(sub['lng']) if sub['lng'] else None,
                }
            
            enriched.append({
                'id': sub['id'],
                'createdAt': sub['thoi_gian_xu_ly'],
                'submittedAt': sub['thoi_gian_xu_ly'],
                'name': sub['ten_hoat_chat'] or 'Không rõ',
                'medicineName': sub['ten_hoat_chat'] or 'Không rõ',
                'type': sub['don_vi_tinh'] or '-',
                'unit': sub['don_vi_tinh'] or 'viên',
                'quantity': sub['so_luong'] or 0,
                'status': status,
                'points': points,
                'manufacturer': sub['thuong_hieu'] or '',
                'condition': 'unknown',
                'nha_thuoc': pharmacy_data,
                'raw': dict(sub)
            })
        
        return enriched

@router.post("", response_model=Submission, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission: SubmissionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new submission"""
    print(f"[SUBMISSIONS] create_submission called by user: {current_user['ho_ten']}")
    print(f"[SUBMISSIONS] Submission data: {submission.dict()}")
    
    async with get_db_connection() as conn:
        # Validate foreign keys
        medicine = await conn.fetchrow(
            "SELECT id FROM loai_thuoc WHERE id = $1",
            submission.id_loai_thuoc
        )
        if not medicine:
            print(f"[SUBMISSIONS] Medicine type not found: {submission.id_loai_thuoc}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Medicine type not found"
            )
        
        pharmacy = await conn.fetchrow(
            "SELECT id FROM nha_thuoc WHERE id = $1",
            submission.id_nha_thuoc
        )
        if not pharmacy:
            print(f"[SUBMISSIONS] Pharmacy not found: {submission.id_nha_thuoc}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pharmacy not found"
            )
        
        print("[SUBMISSIONS] Validation passed, creating submission...")
        
        # Parse expiry date if provided
        expiry_date = None
        if submission.han_dung:
            try:
                # Parse string date 'YYYY-MM-DD' to date object
                if isinstance(submission.han_dung, str):
                    expiry_date = datetime.strptime(submission.han_dung, '%Y-%m-%d').date()
                else:
                    expiry_date = submission.han_dung
                print(f"[SUBMISSIONS] Parsed expiry date: {expiry_date}")
            except ValueError as e:
                print(f"[SUBMISSIONS] Invalid date format: {submission.han_dung}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid date format. Expected YYYY-MM-DD, got: {submission.han_dung}"
                )
        
        # Create submission
        submission_id = uuid4()
        row = await conn.fetchrow(
            """
            INSERT INTO ho_so_xu_ly 
            (id, id_nguoi_nop, id_nha_thuoc, id_loai_thuoc, so_luong, don_vi_tinh, 
             han_dung, ket_qua, duong_dan_chung_nhan, ghi_chu, thoi_gian_xu_ly)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
            RETURNING *
            """,
            submission_id,
            current_user['id'],
            submission.id_nha_thuoc,
            submission.id_loai_thuoc,
            submission.so_luong,
            submission.don_vi_tinh,
            expiry_date,
            submission.duong_dan_chung_nhan,
            submission.ghi_chu,
            datetime.utcnow()
        )
        
        print(f"[SUBMISSIONS] Submission created with id: {submission_id}")
        
        # Notify ADMIN only (not CONGTACVIEN)
        reviewers = await conn.fetch(
            "SELECT id FROM users WHERE role = 'ADMIN'"
        )
        
        print(f"[SUBMISSIONS] Notifying {len(reviewers)} admin(s)")
        
        for reviewer in reviewers:
            await conn.execute(
                """
                INSERT INTO thong_bao 
                (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                VALUES ($1, $2, $3, $4, 'SYSTEM', $5, 0)
                """,
                uuid4(),
                current_user['id'],
                reviewer['id'],
                f"Hồ sơ mới cần duyệt từ {current_user['ho_ten']}",
                datetime.utcnow()
            )
        
        print(f"[SUBMISSIONS] Submission created successfully")
        return serialize_dates(row)

@router.put("/{submission_id}", response_model=Submission)
async def update_submission(
    submission_id: str,
    updates: SubmissionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update submission"""
    async with get_db_connection() as conn:
        # Get submission
        submission = await conn.fetchrow(
            "SELECT * FROM ho_so_xu_ly WHERE id = $1",
            submission_id
        )
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check permissions
        can_edit = (
            role_rank(current_user['role']) >= 2 or
            (str(submission['id_nguoi_nop']) == str(current_user['id']) and submission['ket_qua'] == 'pending')
        )
        
        if not can_edit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot edit this submission"
            )
        
        # Build update query
        update_fields = []
        params = []
        param_count = 1
        
        for field, value in updates.model_dump(exclude_unset=True).items():
            if value is not None:
                # Parse date string for han_dung field
                if field == 'han_dung' and isinstance(value, str):
                    try:
                        value = datetime.strptime(value, '%Y-%m-%d').date()
                    except ValueError:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid date format for han_dung. Expected YYYY-MM-DD"
                        )
                
                update_fields.append(f"{field} = ${param_count}")
                params.append(value)
                param_count += 1
        
        if not update_fields:
            return dict(submission)
        
        params.append(submission_id)
        query = f"""
            UPDATE ho_so_xu_ly 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        updated = await conn.fetchrow(query, *params)
        return serialize_dates(updated)

@router.delete("/{submission_id}")
async def delete_submission(
    submission_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete submission"""
    async with get_db_connection() as conn:
        # Get submission
        submission = await conn.fetchrow(
            "SELECT * FROM ho_so_xu_ly WHERE id = $1",
            submission_id
        )
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check permissions
        can_delete = (
            role_rank(current_user['role']) >= 2 or
            (str(submission['id_nguoi_nop']) == str(current_user['id']) and submission['ket_qua'] == 'pending')
        )
        
        if not can_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete this submission"
            )
        
        await conn.execute(
            "DELETE FROM ho_so_xu_ly WHERE id = $1",
            submission_id
        )
        
        return {"ok": True}

@router.post("/{submission_id}/classify")
async def classify_submission(
    submission_id: str,
    classification: ClassificationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Classify submission (Admin/Collaborator only)"""
    # Check reviewer permission
    await require_reviewer(current_user)
    
    async with get_db_connection() as conn:
        # Get submission
        submission = await conn.fetchrow(
            "SELECT * FROM ho_so_xu_ly WHERE id = $1",
            submission_id
        )
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Map ket_qua to classification result
        result_map = {
            'TAI_SU_DUNG': 'DAT',
            'TIEU_HUY': 'KHONG_DAT',
            'XEM_XET': 'XEM_XET'
        }
        
        # Create classification record
        classification_id = uuid4()
        await conn.execute(
            """
            INSERT INTO ket_qua_phan_loai 
            (id, id_ho_so_xu_ly, ket_qua, gia_tri_do, bang_chung_url, ghi_chu, thoi_gian_danh_gia)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            classification_id,
            submission_id,
            result_map[classification.ket_qua],
            classification.gia_tri_do,
            classification.bang_chung_url,
            classification.ghi_chu,
            datetime.utcnow()
        )
        
        # Update submission status
        await conn.execute(
            "UPDATE ho_so_xu_ly SET ket_qua = $1 WHERE id = $2",
            classification.ket_qua,
            submission_id
        )
        
        # Award points if applicable
        if classification.points and classification.points > 0:
            await conn.execute(
                """
                INSERT INTO diem_thuong 
                (id, id_nguoi_nop, diem, ly_do, trang_thai, ngay_cong)
                VALUES ($1, $2, $3, $4, 'DA_CONG', $5)
                """,
                uuid4(),
                submission['id_nguoi_nop'],
                classification.points,
                'Tái sử dụng' if classification.ket_qua == 'TAI_SU_DUNG' else 'Tiêu hủy',
                datetime.utcnow()
            )
            
            # Update user points
            await conn.execute(
                "UPDATE users SET diem_tich_luy = diem_tich_luy + $1 WHERE id = $2",
                points,
                submission['id_nguoi_nop']
            )
        
        # Notify user
        await conn.execute(
            """
            INSERT INTO thong_bao 
            (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
            VALUES ($1, $2, $3, $4, 'SYSTEM', $5, 0)
            """,
            uuid4(),
            current_user['id'],
            submission['id_nguoi_nop'],
            f"Hồ sơ {submission_id} đã được phân loại: {classification.ket_qua}",
            datetime.utcnow()
        )
        
        return {"ok": True, "classification_id": str(classification_id)}
