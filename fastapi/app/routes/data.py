from fastapi import APIRouter
from ..models import MedicineType, Pharmacy
from ..database import get_db_connection

router = APIRouter()

@router.get("/loai-thuoc", response_model=list[MedicineType])
async def get_medicine_types():
    """Get all medicine types"""
    print("[DATA] get_medicine_types called")
    async with get_db_connection() as conn:
        rows = await conn.fetch("SELECT * FROM loai_thuoc ORDER BY ten_hoat_chat")
        print(f"[DATA] Found {len(rows)} medicine types")
        return [dict(row) for row in rows]

@router.get("/nha-thuoc", response_model=list[Pharmacy])
async def get_pharmacies():
    """Get all pharmacies"""
    print("[DATA] get_pharmacies called")
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            "SELECT * FROM nha_thuoc ORDER BY ten_nha_thuoc"
        )
        print(f"[DATA] Found {len(rows)} pharmacies")
        return [dict(row) for row in rows]
