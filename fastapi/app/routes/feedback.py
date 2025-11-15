from fastapi import APIRouter, HTTPException, status, Depends
from ..models import Feedback, FeedbackCreate
from ..database import get_db_connection
from ..auth import get_current_user
from uuid import uuid4
from datetime import datetime
from typing import Optional

router = APIRouter()

@router.get("", response_model=list[Feedback])
async def list_feedback():
    """List all feedback (public)"""
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            "SELECT * FROM feedback ORDER BY ngay_tao DESC LIMIT 100"
        )
        return [dict(row) for row in rows]

@router.post("", response_model=Feedback, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    feedback: FeedbackCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create feedback"""
    async with get_db_connection() as conn:
        feedback_id = uuid4()
        row = await conn.fetchrow(
            """
            INSERT INTO feedback 
            (id, id_nguoi_nop, noi_dung, rating, ngay_tao)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            feedback_id,
            current_user['id'],
            feedback.content,
            feedback.rating,
            datetime.utcnow()
        )
        return dict(row)
