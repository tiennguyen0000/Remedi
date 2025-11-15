"""
File upload endpoints for forum images and attachments
Stores files locally in /app/uploads directory
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse, FileResponse
from ..auth import get_current_user
from typing import List
import os
from uuid import uuid4
from pathlib import Path

router = APIRouter()

# Local storage configuration
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

# Create subdirectories
(UPLOAD_DIR / "images").mkdir(exist_ok=True)
(UPLOAD_DIR / "attachments").mkdir(exist_ok=True)
(UPLOAD_DIR / "certificates").mkdir(exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_FILE_TYPES = {"application/pdf", "application/msword", 
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                      "application/vnd.ms-excel",
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
ALLOWED_CERTIFICATE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def save_upload_file(file: UploadFile, folder: str = "images") -> str:
    """Save uploaded file locally and return URL path"""
    try:
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename and file.filename else 'jpg'
        unique_filename = f"{uuid4()}.{file_ext}"
        
        # Create folder path
        folder_path = UPLOAD_DIR / folder
        folder_path.mkdir(exist_ok=True, parents=True)
        
        # Full file path
        file_path = folder_path / unique_filename
        
        # Read and save file content
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Return URL path (relative to API)
        return f"/api/uploads/{folder}/{unique_filename}"
        
    except Exception as e:
        print(f"[UPLOAD] Error saving file: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/images")
async def upload_images(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload forum post/comment images
    Max 5 images per upload, each max 10MB
    """
    print(f"[UPLOAD] Upload images request from user: {current_user['ho_ten']}")
    
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images per upload")
    
    uploaded_urls = []
    
    for file in files:
        # Validate file type
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, GIF, WebP"
            )
        
        # Validate file size
        content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} too large. Max 10MB"
            )
        
        # Upload to local storage
        url = await save_upload_file(file, "images")
        uploaded_urls.append(url)
        print(f"[UPLOAD] Uploaded image: {url}")
    
    return {
        "success": True,
        "urls": uploaded_urls
    }


@router.post("/uploads/certificate")
async def upload_certificate(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload certificate for medicine submission
    Accepts: Images (JPEG, PNG, GIF, WebP) or PDF
    Max 10MB
    """
    print(f"[UPLOAD] Upload certificate request from user: {current_user['ho_ten']}")
    
    # Validate file type
    if file.content_type not in ALLOWED_CERTIFICATE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, GIF, WebP, PDF"
        )
    
    # Validate file size
    content = await file.read()
    await file.seek(0)  # Reset file pointer
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max 10MB"
        )
    
    # Upload to local storage
    url = await save_upload_file(file, "certificates")
    print(f"[UPLOAD] Uploaded certificate: {url}")
    
    return {
        "success": True,
        "url": url,
        "filename": file.filename,
        "size": len(content),
        "contentType": file.content_type
    }


@router.post("/files")
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload forum post attachments (PDF, Word, Excel)
    Max 3 files per upload, each max 10MB
    """
    print(f"[UPLOAD] Upload files request from user: {current_user['ho_ten']}")
    
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 files per upload")
    
    uploaded_urls = []
    
    for file in files:
        # Validate file type
        if file.content_type not in ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Allowed: PDF, Word, Excel"
            )
        
        # Validate file size
        content = await file.read()
        await file.seek(0)
        
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} too large. Max 10MB"
            )
        
        # Upload to local storage
        url = await save_upload_file(file, "attachments")
        uploaded_urls.append({
            "url": url,
            "name": file.filename,
            "size": len(content),
            "type": file.content_type
        })
        print(f"[UPLOAD] Uploaded file: {file.filename} -> {url}")
    
    return {
        "success": True,
        "files": uploaded_urls
    }


@router.get("/uploads/{folder}/{filename}")
async def get_file(folder: str, filename: str):
    """Serve uploaded files from local storage"""
    try:
        file_path = UPLOAD_DIR / folder / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Determine media type based on extension
        ext = filename.split('.')[-1].lower()
        media_type_map = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'pdf': 'application/pdf',
        }
        media_type = media_type_map.get(ext, 'application/octet-stream')
        
        return FileResponse(file_path, media_type=media_type)
    
    except Exception as e:
        print(f"[UPLOAD] Error serving file: {e}")
        raise HTTPException(status_code=404, detail="File not found")
