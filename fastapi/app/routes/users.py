from fastapi import APIRouter, HTTPException, status, Depends, Body
from ..models import User
from ..database import get_db_connection
from ..auth import get_current_user, require_admin
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

class ProfileUpdate(BaseModel):
    ho_ten: Optional[str] = None
    email: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    dia_chi: Optional[str] = None

@router.get("", response_model=list[User])
async def list_users(current_user: dict = Depends(get_current_user)):
    """List all users (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            "SELECT id, ho_ten, so_dien_thoai, email, dia_chi, role, diem_tich_luy, ngay_tao FROM users ORDER BY ngay_tao DESC"
        )
        return [dict(row) for row in rows]

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    role: Optional[str] = None,
    diem_tich_luy: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update user (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        user = await conn.fetchrow(
            "SELECT id, ho_ten, so_dien_thoai, email, dia_chi, role, diem_tich_luy, ngay_tao FROM users WHERE id = $1",
            user_id
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        updates = []
        params = []
        param_count = 1
        
        if role:
            updates.append(f"role = ${param_count}")
            params.append(role)
            param_count += 1
        
        if diem_tich_luy is not None:
            updates.append(f"diem_tich_luy = ${param_count}")
            params.append(diem_tich_luy)
            param_count += 1
        
        if not updates:
            return dict(user)
        
        params.append(user_id)
        query = f"""
            UPDATE users 
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING id, ho_ten, so_dien_thoai, email, dia_chi, role, diem_tich_luy, ngay_tao
        """
        
        updated = await conn.fetchrow(query, *params)
        return dict(updated)

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete user (Admin only)"""
    await require_admin(current_user)
    
    async with get_db_connection() as conn:
        result = await conn.execute(
            "DELETE FROM users WHERE id = $1",
            user_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"ok": True}


@router.put("/profile/me", response_model=User)
async def update_my_profile(
    profile: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    async with get_db_connection() as conn:
        updates = []
        params = []
        param_count = 1
        
        if profile.ho_ten is not None:
            updates.append(f"ho_ten = ${param_count}")
            params.append(profile.ho_ten)
            param_count += 1
        
        if profile.email is not None:
            # Check if email already exists for another user
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1 AND id != $2",
                profile.email, current_user['id']
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already in use"
                )
            updates.append(f"email = ${param_count}")
            params.append(profile.email)
            param_count += 1
        
        if profile.so_dien_thoai is not None:
            # Check if phone already exists for another user
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE so_dien_thoai = $1 AND id != $2",
                profile.so_dien_thoai, current_user['id']
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already in use"
                )
            updates.append(f"so_dien_thoai = ${param_count}")
            params.append(profile.so_dien_thoai)
            param_count += 1
        
        if profile.dia_chi is not None:
            updates.append(f"dia_chi = ${param_count}")
            params.append(profile.dia_chi)
            param_count += 1
        
        if not updates:
            # No updates, return current user
            user = await conn.fetchrow(
                "SELECT id, ho_ten, so_dien_thoai, email, dia_chi, role, diem_tich_luy, ngay_tao FROM users WHERE id = $1",
                current_user['id']
            )
            return dict(user)
        
        params.append(current_user['id'])
        query = f"""
            UPDATE users 
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING id, ho_ten, so_dien_thoai, email, dia_chi, role, diem_tich_luy, ngay_tao
        """
        
        updated = await conn.fetchrow(query, *params)
        return dict(updated)



@router.delete("/profile/me")
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    """Delete current user's account"""
    async with get_db_connection() as conn:
        # Delete user account (cascade will handle related data)
        result = await conn.execute(
            "DELETE FROM users WHERE id = $1",
            current_user["id"]
        )
        
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {"ok": True, "message": "Account deleted successfully"}
