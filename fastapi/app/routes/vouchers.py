from fastapi import APIRouter, HTTPException, status, Depends
from ..models import Voucher, VoucherCreate
from ..database import get_db_connection
from ..auth import get_current_user, require_admin
from uuid import uuid4
from datetime import datetime, date

router = APIRouter()

@router.get("", response_model=list[Voucher])
async def list_vouchers(current_user: dict = Depends(get_current_user)):
    """List all active vouchers"""
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT 
                id, 
                ten_voucher, 
                COALESCE(mo_ta, '') as mo_ta,
                diem_can_thiet, 
                so_luong_con_lai, 
                trang_thai, 
                ngay_tao,
                ngay_het_han
            FROM voucher 
            WHERE trang_thai = 'active' 
            ORDER BY diem_can_thiet ASC
            """
        )
        # Pydantic will handle the conversion from date to datetime
        return [dict(row) for row in rows]

@router.post("", response_model=Voucher, status_code=status.HTTP_201_CREATED)
async def create_voucher(
    voucher: VoucherCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create voucher (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        voucher_id = uuid4()
        row = await conn.fetchrow(
            """
            INSERT INTO voucher 
            (id, ten_voucher, mo_ta, diem_can_thiet, so_luong_con_lai, ngay_tao, ngay_het_han)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            """,
            voucher_id,
            voucher.ten_voucher,
            voucher.mo_ta,
            voucher.diem_can_thiet,
            voucher.so_luong_con_lai,
            datetime.utcnow(),
            voucher.ngay_het_han
        )
        return dict(row)

@router.put("/{voucher_id}", response_model=Voucher)
async def update_voucher(
    voucher_id: str,
    voucher: VoucherCreate,
    current_user: dict = Depends(get_current_user)
):
    """Update voucher (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM voucher WHERE id = $1",
            voucher_id
        )
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voucher not found"
            )
        
        row = await conn.fetchrow(
            """
            UPDATE voucher 
            SET ten_voucher = $1, mo_ta = $2, diem_can_thiet = $3, 
                so_luong_con_lai = $4, ngay_het_han = $5
            WHERE id = $6
            RETURNING *
            """,
            voucher.ten_voucher,
            voucher.mo_ta,
            voucher.diem_can_thiet,
            voucher.so_luong_con_lai,
            voucher.ngay_het_han,
            voucher_id
        )
        return dict(row)

@router.delete("/{voucher_id}")
async def delete_voucher(
    voucher_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete voucher (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        result = await conn.execute(
            "DELETE FROM voucher WHERE id = $1",
            voucher_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voucher not found"
            )
        
        return {"ok": True}

@router.post("/{voucher_id}/redeem")
async def redeem_voucher(
    voucher_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Redeem voucher"""
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Get voucher with lock for update
            voucher = await conn.fetchrow(
                "SELECT * FROM voucher WHERE id = $1 AND trang_thai = 'active' FOR UPDATE",
                voucher_id
            )
            
            if not voucher:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Voucher không tồn tại hoặc đã hết hạn"
                )
            
            # Check expiry date
            if voucher['ngay_het_han']:
                if voucher['ngay_het_han'] < date.today():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Voucher đã hết hạn"
                )
            
            if voucher['so_luong_con_lai'] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Voucher đã hết"
                )
            
            if current_user['diem_tich_luy'] < voucher['diem_can_thiet']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không đủ điểm"
            )
            
            # Deduct points from user first
            await conn.execute(
                "UPDATE users SET diem_tich_luy = diem_tich_luy - $1 WHERE id = $2",
                voucher['diem_can_thiet'],
                current_user['id']
            )
            
            # Decrease voucher quantity
            await conn.execute(
                "UPDATE voucher SET so_luong_con_lai = so_luong_con_lai - 1 WHERE id = $1",
                voucher_id
            )
            
            # Record usage with correct column names
            usage_id = uuid4()
            redeemed_at = datetime.utcnow()
            await conn.execute(
                """
                INSERT INTO voucher_usage (id, voucher_id, user_id, redeemed_at, points_used)
                VALUES ($1, $2, $3, $4, $5)
                """,
                usage_id,
                voucher_id,
                current_user['id'],
                redeemed_at,
                voucher['diem_can_thiet']
            )
            
            # Create notification
            await conn.execute(
                """
                INSERT INTO thong_bao 
                (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, ngay_tao, da_xem)
                VALUES ($1, $2, $3, $4, 'VOUCHER', $5, 0)
                """,
                uuid4(),
                None,  # System notification
                current_user['id'],
                f"Bạn đã đổi thành công voucher {voucher['ten_voucher']}",
                datetime.utcnow()
            )
            
            # Get updated user points
            updated_user = await conn.fetchrow(
                "SELECT diem_tich_luy FROM users WHERE id = $1",
                current_user['id']
            )
            
            return {
                "message": "Đổi voucher thành công",
                "ok": True,
                "new_points": updated_user['diem_tich_luy'],
                "points_deducted": voucher['diem_can_thiet']
            }

@router.get("/stats")
async def voucher_stats(current_user: dict = Depends(get_current_user)):
    """Get voucher statistics"""
    async with get_db_connection() as conn:
        vouchers = await conn.fetch("SELECT * FROM voucher")
        
        stats = []
        for v in vouchers:
            usage_count = await conn.fetchval(
                "SELECT COUNT(*) FROM voucher_usage WHERE voucher_id = $1",
                v['id']
            )
            stats.append({
                'id': str(v['id']),
                'ten_voucher': v['ten_voucher'],
                'so_luong_con_lai': v['so_luong_con_lai'],
                'used': usage_count
            })
        
        return stats
