from fastapi import APIRouter, HTTPException, status, Depends
from ..models import Notification, NotificationCreate
from ..database import get_db_connection
from ..auth import get_current_user
from uuid import uuid4
from datetime import datetime

router = APIRouter()

@router.get("", response_model=list[Notification])
async def list_notifications(
    current_user: dict = Depends(get_current_user)
):
    """List notifications for current user - only show notifications sent to this specific user"""
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT * FROM thong_bao 
            WHERE id_nguoi_nhan = $1
            ORDER BY ngay_tao DESC
            LIMIT 100
            """,
            current_user['id']
        )
        return [dict(row) for row in rows]

@router.post("", response_model=Notification, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create notification"""
    async with get_db_connection() as conn:
        notification_id = uuid4()
        row = await conn.fetchrow(
            """
            INSERT INTO thong_bao 
            (id, id_nguoi_gui, id_nguoi_nhan, noi_dung, loai_thong_bao, metadata, ngay_tao, da_xem)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
            RETURNING *
            """,
            notification_id,
            current_user['id'],
            notification.id_nguoi_nhan,
            notification.noi_dung,
            notification.loai_thong_bao,
            notification.metadata,
            datetime.utcnow()
        )
        return dict(row)

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark notification as read - only for notifications sent to this user"""
    async with get_db_connection() as conn:
        await conn.execute(
            """
            UPDATE thong_bao 
            SET da_xem = 1 
            WHERE id = $1 AND id_nguoi_nhan = $2
            """,
            notification_id,
            current_user['id']
        )
        return {"ok": True}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete notification - only for notifications sent to this user"""
    async with get_db_connection() as conn:
        await conn.execute(
            """
            DELETE FROM thong_bao 
            WHERE id = $1 AND id_nguoi_nhan = $2
            """,
            notification_id,
            current_user['id']
        )
        return {"ok": True}

@router.put("/{notification_id}/archive")
async def archive_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Archive notification (mark as read) - only for notifications sent to this user"""
    async with get_db_connection() as conn:
        await conn.execute(
            """
            UPDATE thong_bao 
            SET da_xem = 1 
            WHERE id = $1 AND id_nguoi_nhan = $2
            """,
            notification_id,
            current_user['id']
        )
        return {"ok": True}

@router.put("/read-all")
async def mark_all_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read - only for notifications sent to this user"""
    async with get_db_connection() as conn:
        await conn.execute(
            """
            UPDATE thong_bao 
            SET da_xem = 1 
            WHERE id_nguoi_nhan = $1
            """,
            current_user['id']
        )
        return {"ok": True}

@router.delete("/clear")
async def clear_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Clear all read notifications - only for notifications sent to this user"""
    async with get_db_connection() as conn:
        await conn.execute(
            """
            DELETE FROM thong_bao 
            WHERE da_xem = 1 AND id_nguoi_nhan = $1
            """,
            current_user['id']
        )
        return {"ok": True}
