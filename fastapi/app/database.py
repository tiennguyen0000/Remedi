import os
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncpg
from asyncpg.pool import Pool

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://admin:admin123@postgres:5432/medicine_recycling"
)

# Global connection pool
_pool: Pool | None = None

async def get_pool() -> Pool:
    """Get or create database connection pool"""
    global _pool
    if _pool is None:
        # Retry logic for database connection
        max_retries = 30
        retry_interval = 2
        
        for attempt in range(max_retries):
            try:
                _pool = await asyncpg.create_pool(
                    DATABASE_URL,
                    min_size=2,
                    max_size=10,
                    command_timeout=60
                )
                print(f"✅ Connected to database successfully")
                break
            except (ConnectionRefusedError, OSError, asyncpg.PostgresError) as e:
                if attempt < max_retries - 1:
                    print(f"⏳ Waiting for database... (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(retry_interval)
                else:
                    print(f"❌ Failed to connect to database after {max_retries} attempts")
                    raise
    return _pool

async def close_pool():
    """Close database connection pool"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

@asynccontextmanager
async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Context manager for database connections"""
    pool = await get_pool()
    async with pool.acquire() as connection:
        yield connection
