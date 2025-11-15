from datetime import datetime
from typing import List, Optional, Tuple

import logging
from fastapi import APIRouter, Header, HTTPException

from ..auth import get_current_user
from ..database import get_db_connection
from ..models import DashboardMetrics

router = APIRouter()
logger = logging.getLogger(__name__)

def subtract_months(date_obj: datetime, months_back: int) -> datetime:
    year = date_obj.year
    month = date_obj.month - months_back
    while month <= 0:
        month += 12
        year -= 1
    return date_obj.replace(year=year, month=month, day=1)

def build_month_series(months: int = 6) -> List[Tuple[str, str]]:
    """Return a list of (key, label) for the last N months (oldest -> newest)."""
    base = datetime.utcnow().replace(day=1)
    series: List[Tuple[str, str]] = []
    for offset in range(months - 1, -1, -1):
        target = subtract_months(base, offset)
        key = target.strftime("%Y-%m")
        label = target.strftime("%m/%Y")
        series.append((key, label))
    return series

@router.get("/metrics", response_model=DashboardMetrics)
async def get_metrics(
    authorization: Optional[str] = Header(default=None),
):
    """Get dashboard metrics (public, with optional user context)"""
    current_user = None
    
    # Try to get user from JWT token
    if authorization and authorization.startswith("Bearer "):
        try:
            from ..jwt_auth import decode_token
            token = authorization.split(" ")[1]
            payload = decode_token(token)
            if payload and payload.get("type") == "access":
                user_id = payload.get("sub")
                async with get_db_connection() as conn:
                    user_row = await conn.fetchrow(
                        "SELECT * FROM users WHERE id = $1", user_id
                    )
                    if user_row:
                        current_user = dict(user_row)
        except Exception as e:
            logger.exception(f"Failed to resolve current user from JWT: {e}")
            current_user = None

    async with get_db_connection() as conn:
        total_submissions = await conn.fetchval(
            "SELECT COUNT(*) FROM ho_so_xu_ly"
        ) or 0

        pending_submissions = await conn.fetchval(
            "SELECT COUNT(*) FROM ho_so_xu_ly WHERE ket_qua = 'pending'"
        ) or 0

        total_users = await conn.fetchval("SELECT COUNT(*) FROM users") or 0

        total_vouchers = await conn.fetchval(
            "SELECT COUNT(*) FROM voucher WHERE so_luong_con_lai > 0"
        ) or 0

        processed_submissions = total_submissions - pending_submissions

        month_series = build_month_series(6)

        submission_rows = await conn.fetch(
            """
            SELECT to_char(date_trunc('month', thoi_gian_xu_ly), 'YYYY-MM') AS month_key,
                   COUNT(*)::int AS total
            FROM ho_so_xu_ly
            WHERE thoi_gian_xu_ly >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
            GROUP BY month_key
            """
        )
        submission_map = {row["month_key"]: row["total"] for row in submission_rows}
        submission_trend = [
            {"label": label, "value": submission_map.get(key, 0)}
            for key, label in month_series
        ]

        voucher_rows = await conn.fetch(
            """
            SELECT to_char(date_trunc('month', redeemed_at), 'YYYY-MM') AS month_key,
                   COUNT(*)::int AS total
            FROM voucher_usage
            WHERE redeemed_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
            GROUP BY month_key
            """
        )
        voucher_map = {row["month_key"]: row["total"] for row in voucher_rows}
        voucher_trend = [
            {"label": label, "value": voucher_map.get(key, 0)}
            for key, label in month_series
        ]

        medicine_rows = await conn.fetch(
            """
            SELECT COALESCE(lt.ten_hoat_chat, 'Khác') AS label,
                   COUNT(*)::int AS total
            FROM ho_so_xu_ly hs
            LEFT JOIN loai_thuoc lt ON lt.id = hs.id_loai_thuoc
            GROUP BY label
            ORDER BY total DESC
            LIMIT 6
            """
        )
        medicine_distribution = [
            {"label": row["label"], "value": row["total"]} for row in medicine_rows
        ]

        role_rows = await conn.fetch(
            """
            SELECT role, COUNT(*)::int AS total
            FROM users
            GROUP BY role
            """
        )
        user_role_distribution = [
            {"label": row["role"], "value": row["total"]} for row in role_rows
        ]

        user_stats = None
        if current_user:
            user_id = current_user["id"]
            status_rows = await conn.fetch(
                """
                SELECT ket_qua, COUNT(*)::int AS total
                FROM ho_so_xu_ly
                WHERE id_nguoi_nop = $1
                GROUP BY ket_qua
                """,
                user_id,
            )
            status_map = {row["ket_qua"]: row["total"] for row in status_rows}

            vouchers_used = (
                await conn.fetchval(
                    "SELECT COUNT(*) FROM voucher_usage WHERE user_id = $1", user_id
                )
            ) or 0

            monthly_point_rows = await conn.fetch(
                """
                SELECT to_char(date_trunc('month', ngay_cong), 'YYYY-MM') AS month_key,
                       COALESCE(SUM(diem), 0)::int AS total
                FROM diem_thuong
                WHERE id_nguoi_nop = $1
                  AND ngay_cong >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
                GROUP BY month_key
                """,
                user_id,
            )
            points_map = {
                row["month_key"]: row["total"] for row in monthly_point_rows
            }
            monthly_points = [
                {"label": label, "value": points_map.get(key, 0)}
                for key, label in month_series
            ]

            points = current_user.get("diem_tich_luy", 0) or 0
            if points >= 500:
                level = "Platinum"
            elif points >= 300:
                level = "Gold"
            elif points >= 150:
                level = "Silver"
            else:
                level = "Bronze"

            user_stats = {
                "points": points,
                "level": level,
                "submissions": sum(status_map.values()),
                "approved": status_map.get("approved", 0),
                "pending": status_map.get("pending", 0),
                "rejected": status_map.get("rejected", 0),
                "returned": status_map.get("returned_to_pharmacy", 0),
                "recalled": status_map.get("recalled", 0),
                "vouchersUsed": vouchers_used,
                "monthlyPoints": monthly_points,
            }

        return {
            "totalSubmissions": total_submissions,
            "pendingSubmissions": pending_submissions,
            "totalUsers": total_users,
            "totalVouchers": total_vouchers,
            "processedSubmissions": processed_submissions,
            "submissionTrend": submission_trend,
            "voucherTrend": voucher_trend,
            "userRoleDistribution": user_role_distribution,
            "medicineDistribution": medicine_distribution,
            "userStats": user_stats,
        }
