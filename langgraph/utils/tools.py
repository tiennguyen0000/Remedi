"""
Tools for LangGraph agents
"""
from typing import Dict, Callable
import httpx
import os


def get_user_info(user_id: str) -> Dict:
    """Get user information from FastAPI"""
    try:
        base_url = os.getenv("FASTAPI_URL", "http://fastapi:8000")
        response = httpx.get(f"{base_url}/api/users/{user_id}")
        if response.status_code == 200:
            return response.json()
        return {}
    except Exception as e:
        print(f"Error getting user info: {e}")
        return {}


def get_user_submissions(user_id: str) -> Dict:
    """Get user's submission statistics"""
    try:
        base_url = os.getenv("FASTAPI_URL", "http://fastapi:8000")
        response = httpx.get(f"{base_url}/api/ho-so-xu-ly/enriched?mine=1", 
                            headers={"x-user-id": user_id})
        if response.status_code == 200:
            data = response.json()
            return {
                "total": len(data),
                "pending": len([s for s in data if s.get("ket_qua") == "pending"]),
                "approved": len([s for s in data if s.get("ket_qua") == "approved"])
            }
        return {}
    except Exception as e:
        print(f"Error getting submissions: {e}")
        return {}


def get_pharmacies_info() -> list:
    """Get list of partner pharmacies"""
    try:
        base_url = os.getenv("FASTAPI_URL", "http://fastapi:8000")
        response = httpx.get(f"{base_url}/api/nha-thuoc")
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"Error getting pharmacies: {e}")
        return []


def get_vouchers_info() -> list:
    """Get available vouchers"""
    try:
        base_url = os.getenv("FASTAPI_URL", "http://fastapi:8000")
        response = httpx.get(f"{base_url}/api/voucher")
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"Error getting vouchers: {e}")
        return []


def default_tools_mapping() -> Dict[str, Callable]:
    """Default tools mapping for agents"""
    return {
        "get_user_info": get_user_info,
        "get_user_submissions": get_user_submissions,
        "get_pharmacies_info": get_pharmacies_info,
        "get_vouchers_info": get_vouchers_info,
    }
