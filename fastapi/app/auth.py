from fastapi import Header, HTTPException, status, Request
from typing import Optional
from uuid import UUID, uuid4
import asyncpg
import secrets
import hashlib
from datetime import datetime, timedelta
from .database import get_db_connection
from .jwt_auth import get_current_user_jwt, decode_token

async def get_current_user(
    request: Request,
    x_user_id: Optional[str] = Header(None),
    x_session_token: Optional[str] = Header(None),
) -> dict:
    """Get current user - supports both JWT and session authentication"""
    # Try JWT first (from Authorization header)
    authorization = request.headers.get("Authorization")
    if authorization:
        try:
            # Extract token from "Bearer <token>"
            parts = authorization.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
                payload = decode_token(token)
                
                # Verify token type
                if payload.get("type") == "access":
                    user_id = payload.get("sub")
                    if user_id:
                        async with get_db_connection() as conn:
                            user = await conn.fetchrow(
                                """
                                SELECT id, ho_ten, email, so_dien_thoai, dia_chi, role, 
                                       diem_tich_luy, ngay_tao
                                FROM users 
                                WHERE id = $1
                                """,
                                user_id
                            )
                            
                            if user:
                                user_dict = dict(user)
                                user_dict['id'] = str(user_dict['id'])
                                print(f"[AUTH] User authenticated via JWT: {user_dict.get('ho_ten')} (role: {user_dict.get('role')})")
                                return user_dict
        except Exception as e:
            print(f"[AUTH] JWT authentication failed: {e}")
            # Fall through to session auth
    
    # Fallback to session-based authentication
    print(f"[AUTH] get_current_user called with x_user_id: {x_user_id}, session_token: {x_session_token}")
    
    if not x_user_id:
        print("[AUTH] No x-user-id header provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    async with get_db_connection() as conn:
        # Check session if token provided
        if x_session_token:
            session = await conn.fetchrow(
                """
                SELECT s.*, u.id as user_id, u.ho_ten, u.email, u.so_dien_thoai, 
                       u.dia_chi, u.role, u.diem_tich_luy, u.ngay_tao
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_token = $1 
                  AND s.user_id = $2 
                  AND s.is_active = true 
                  AND s.expires_at > NOW()
                """,
                x_session_token,
                x_user_id
            )
            
            if session:
                # Update last activity
                await conn.execute(
                    "UPDATE user_sessions SET last_activity = NOW() WHERE id = $1",
                    session['id']
                )
                
                user_dict = {
                    'id': str(session['user_id']),
                    'ho_ten': session['ho_ten'],
                    'email': session['email'],
                    'so_dien_thoai': session['so_dien_thoai'],
                    'dia_chi': session['dia_chi'],
                    'role': session['role'],
                    'diem_tich_luy': session['diem_tich_luy'],
                    'ngay_tao': session['ngay_tao'],
                }
                print(f"[AUTH] User authenticated via session: {user_dict.get('ho_ten')} (role: {user_dict.get('role')})")
                return user_dict
        
        # Fallback to user lookup (for backward compatibility)
        user = await conn.fetchrow(
            "SELECT id, ho_ten, email, so_dien_thoai, dia_chi, role, diem_tich_luy, ngay_tao FROM users WHERE id = $1",
            x_user_id
        )
        
        if not user:
            print(f"[AUTH] User not found for id: {x_user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user"
            )
        
        user_dict = dict(user)
        user_dict['id'] = str(user_dict['id'])  # Ensure UUID is string
        print(f"[AUTH] User authenticated: {user_dict.get('ho_ten')} (role: {user_dict.get('role')})")
        return user_dict

async def require_admin(current_user: dict = None):
    """Check if user is admin"""
    print(f"[AUTH] require_admin called for user: {current_user.get('ho_ten') if current_user else 'None'}")
    if not current_user or current_user.get('role') != 'ADMIN':
        print(f"[AUTH] Access denied - user role: {current_user.get('role') if current_user else 'None'}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    print("[AUTH] Admin access granted")
    return current_user

async def require_reviewer(current_user: dict = None):
    """Check if user is admin or collaborator"""
    print(f"[AUTH] require_reviewer called for user: {current_user.get('ho_ten') if current_user else 'None'}")
    if not current_user or current_user.get('role') not in ['ADMIN', 'CONGTACVIEN']:
        print(f"[AUTH] Access denied - user role: {current_user.get('role') if current_user else 'None'}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviewer access required"
        )
    print("[AUTH] Reviewer access granted")
    return current_user

def role_rank(role: str) -> int:
    """Get role rank for permission checks"""
    return {'ADMIN': 3, 'CONGTACVIEN': 2, 'USER': 1}.get(role, 0)
