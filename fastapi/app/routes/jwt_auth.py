"""JWT Authentication Routes"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta
from uuid import uuid4

from ..jwt_auth import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_jwt,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from ..database import get_db_connection
from ..utils.password import hash_password

router = APIRouter()


class JWTRegisterRequest(BaseModel):
    ho_ten: str
    email: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    password: str
    dia_chi: Optional[str] = None
    yeu_cau_cong_tac_vien: Optional[bool] = False


class JWTLoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str


class JWTLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/register", response_model=JWTLoginResponse)
async def jwt_register(user_data: JWTRegisterRequest):
    """Register new user with JWT"""
    # Validate input
    if not user_data.email and not user_data.so_dien_thoai:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone number is required"
        )
    
    if not user_data.password or len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    async with get_db_connection() as conn:
        # Check if user already exists
        if user_data.email:
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1",
                user_data.email
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
        
        if user_data.so_dien_thoai:
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE so_dien_thoai = $1",
                user_data.so_dien_thoai
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )
        
        # Hash password
        password_hash = hash_password(user_data.password)
        
        # Create user
        user_id = str(uuid4())
        user = await conn.fetchrow(
            """
            INSERT INTO users (id, ho_ten, email, so_dien_thoai, dia_chi, password_hash, role, diem_tich_luy, yeu_cau_cong_tac_vien)
            VALUES ($1, $2, $3, $4, $5, $6, 'USER', 0, $7)
            RETURNING *
            """,
            user_id,
            user_data.ho_ten,
            user_data.email,
            user_data.so_dien_thoai,
            user_data.dia_chi,
            password_hash,
            user_data.yeu_cau_cong_tac_vien
        )
        
        # Create tokens
        token_data = {"sub": str(user['id'])}
        access_token = create_access_token(
            token_data,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(token_data)
        
        # Prepare user data
        user_response = {
            "id": str(user['id']),
            "ho_ten": user['ho_ten'],
            "email": user['email'],
            "so_dien_thoai": user['so_dien_thoai'],
            "dia_chi": user['dia_chi'],
            "role": user['role'],
            "diem_tich_luy": user['diem_tich_luy'],
            "ngay_tao": user['ngay_tao'].isoformat() if user['ngay_tao'] else None,
        }
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_response
        }


@router.post("/login", response_model=JWTLoginResponse)
async def jwt_login(credentials: JWTLoginRequest):
    """Login with JWT - returns access and refresh tokens"""
    if not credentials.email and not credentials.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone is required"
        )
    
    if not credentials.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )
    
    async with get_db_connection() as conn:
        # Find user
        if credentials.email:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1",
                credentials.email
            )
        else:
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE so_dien_thoai = $1",
                credentials.phone
            )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not verify_password(credentials.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create tokens
        token_data = {"sub": str(user['id'])}
        access_token = create_access_token(
            token_data,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        refresh_token = create_refresh_token(token_data)
        
        # Prepare user data
        user_data = {
            "id": str(user['id']),
            "ho_ten": user['ho_ten'],
            "email": user['email'],
            "so_dien_thoai": user['so_dien_thoai'],
            "dia_chi": user['dia_chi'],
            "role": user['role'],
            "diem_tich_luy": user['diem_tich_luy'],
            "ngay_tao": user['ngay_tao'].isoformat() if user['ngay_tao'] else None,
        }
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_data
        }


@router.post("/refresh")
async def refresh_access_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        payload = decode_token(request.refresh_token)
        
        # Verify token type
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Create new access token
        token_data = {"sub": user_id}
        access_token = create_access_token(
            token_data,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(e)}"
        )


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user_jwt)):
    """Get current user information"""
    return current_user


@router.post("/logout")
async def jwt_logout(current_user: dict = Depends(get_current_user_jwt)):
    """Logout - client should discard tokens"""
    # With JWT, logout is handled client-side by discarding tokens
    # For enhanced security, you could maintain a token blacklist in Redis
    return {"message": "Logged out successfully"}

