"""
Comprehensive CRUD routes for all tables
"""
from fastapi import APIRouter, HTTPException, status, Depends
from ..database import get_db_connection
from ..auth import get_current_user, require_admin
from uuid import uuid4
from datetime import datetime
from typing import Optional, List, Dict, Any

router = APIRouter()

# ============================================================
# GENERIC CRUD FUNCTIONS
# ============================================================

async def get_all_records(table_name: str, order_by: str = "ngay_tao DESC"):
    """Get all records from a table"""
    async with get_db_connection() as conn:
        query = f"SELECT * FROM {table_name} ORDER BY {order_by}"
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]

async def get_record_by_id(table_name: str, record_id: str):
    """Get single record by ID"""
    async with get_db_connection() as conn:
        query = f"SELECT * FROM {table_name} WHERE id = $1"
        row = await conn.fetchrow(query, record_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record not found in {table_name}"
            )
        return dict(row)

async def create_record(table_name: str, data: dict):
    """Create new record"""
    async with get_db_connection() as conn:
        # Add ID and timestamp
        data['id'] = str(uuid4())
        if 'ngay_tao' not in data:
            data['ngay_tao'] = datetime.utcnow()
        
        # Build INSERT query
        columns = list(data.keys())
        placeholders = [f"${i+1}" for i in range(len(columns))]
        values = [data[col] for col in columns]
        
        query = f"""
            INSERT INTO {table_name} ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
            RETURNING *
        """
        row = await conn.fetchrow(query, *values)
        return dict(row)

async def update_record(table_name: str, record_id: str, data: dict):
    """Update existing record"""
    async with get_db_connection() as conn:
        # Build UPDATE query
        set_clauses = [f"{col} = ${i+2}" for i, col in enumerate(data.keys())]
        values = [record_id] + list(data.values())
        
        query = f"""
            UPDATE {table_name}
            SET {', '.join(set_clauses)}
            WHERE id = $1
            RETURNING *
        """
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record not found in {table_name}"
            )
        return dict(row)

async def delete_record(table_name: str, record_id: str):
    """Delete record"""
    async with get_db_connection() as conn:
        result = await conn.execute(
            f"DELETE FROM {table_name} WHERE id = $1",
            record_id
        )
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record not found in {table_name}"
            )
        return {"ok": True, "message": "Deleted successfully"}

# ============================================================
# NHA THUOC (Pharmacies) CRUD
# ============================================================

@router.get("/nha-thuoc")
async def list_pharmacies():
    """List all pharmacies"""
    return await get_all_records("nha_thuoc", "ten_nha_thuoc")

@router.get("/nha-thuoc/{pharmacy_id}")
async def get_pharmacy(pharmacy_id: str):
    """Get single pharmacy"""
    return await get_record_by_id("nha_thuoc", pharmacy_id)

@router.post("/nha-thuoc", status_code=status.HTTP_201_CREATED)
async def create_pharmacy(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create pharmacy (Admin only)"""
    await require_admin(current_user)
    return await create_record("nha_thuoc", data)

@router.put("/nha-thuoc/{pharmacy_id}")
async def update_pharmacy(
    pharmacy_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update pharmacy (Admin only)"""
    await require_admin(current_user)
    return await update_record("nha_thuoc", pharmacy_id, data)

@router.delete("/nha-thuoc/{pharmacy_id}")
async def delete_pharmacy(
    pharmacy_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete pharmacy (Admin only)"""
    await require_admin(current_user)
    return await delete_record("nha_thuoc", pharmacy_id)

# ============================================================
# LOAI THUOC (Medicine Types) CRUD
# ============================================================

@router.get("/loai-thuoc")
async def list_medicine_types():
    """List all medicine types"""
    return await get_all_records("loai_thuoc", "ten_hoat_chat")

@router.get("/loai-thuoc/{type_id}")
async def get_medicine_type(type_id: str):
    """Get single medicine type"""
    return await get_record_by_id("loai_thuoc", type_id)

@router.post("/loai-thuoc", status_code=status.HTTP_201_CREATED)
async def create_medicine_type(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create medicine type (Admin only)"""
    await require_admin(current_user)
    return await create_record("loai_thuoc", data)

@router.put("/loai-thuoc/{type_id}")
async def update_medicine_type(
    type_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update medicine type (Admin only)"""
    await require_admin(current_user)
    return await update_record("loai_thuoc", type_id, data)

@router.delete("/loai-thuoc/{type_id}")
async def delete_medicine_type(
    type_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete medicine type (Admin only)"""
    await require_admin(current_user)
    return await delete_record("loai_thuoc", type_id)

# ============================================================
# THONG BAO (Notifications) CRUD
# ============================================================

@router.get("/thong-bao")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    """List user's notifications"""
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM thong_bao 
            WHERE id_nguoi_nhan = $1 
            ORDER BY ngay_tao DESC
            """,
            current_user['id']
        )
        return [dict(row) for row in rows]

@router.get("/thong-bao/{notif_id}")
async def get_notification(
    notif_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single notification"""
    async with get_db_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT * FROM thong_bao 
            WHERE id = $1 AND id_nguoi_nhan = $2
            """,
            notif_id,
            current_user['id']
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        return dict(row)

@router.post("/thong-bao", status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create notification"""
    data['id_nguoi_gui'] = current_user['id']
    return await create_record("thong_bao", data)

@router.put("/thong-bao/{notif_id}/mark-read")
async def mark_notification_read(
    notif_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    async with get_db_connection() as conn:
        row = await conn.fetchrow(
            """
            UPDATE thong_bao 
            SET da_xem = 1 
            WHERE id = $1 AND id_nguoi_nhan = $2
            RETURNING *
            """,
            notif_id,
            current_user['id']
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        return dict(row)

@router.delete("/thong-bao/{notif_id}")
async def delete_notification(
    notif_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete notification"""
    async with get_db_connection() as conn:
        result = await conn.execute(
            """
            DELETE FROM thong_bao 
            WHERE id = $1 AND id_nguoi_nhan = $2
            """,
            notif_id,
            current_user['id']
        )
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        return {"ok": True}

# ============================================================
# DIEM THUONG (Reward Points) CRUD
# ============================================================

@router.get("/diem-thuong")
async def list_points(current_user: dict = Depends(get_current_user)):
    """List user's point history"""
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM diem_thuong 
            WHERE id_nguoi_nop = $1 
            ORDER BY ngay_cong DESC
            """,
            current_user['id']
        )
        return [dict(row) for row in rows]

@router.post("/diem-thuong", status_code=status.HTTP_201_CREATED)
async def award_points(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Award points (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        async with conn.transaction():
            # Create point record
            point_record = await create_record("diem_thuong", data)
            
            # Update user's total points
            await conn.execute(
                """
                UPDATE users 
                SET diem_tich_luy = diem_tich_luy + $1 
                WHERE id = $2
                """,
                data['diem'],
                data['id_nguoi_nop']
            )
            
            return point_record

# ============================================================
# FEEDBACK CRUD
# ============================================================

@router.get("/feedback")
async def list_feedback():
    """List all feedback"""
    return await get_all_records("feedback", "ngay_tao DESC")

@router.get("/feedback/{feedback_id}")
async def get_feedback(feedback_id: str):
    """Get single feedback"""
    return await get_record_by_id("feedback", feedback_id)

@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def create_feedback(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create feedback"""
    data['id_nguoi_nop'] = current_user['id']
    return await create_record("feedback", data)

@router.delete("/feedback/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete feedback (Admin only)"""
    await require_admin(current_user)
    return await delete_record("feedback", feedback_id)
