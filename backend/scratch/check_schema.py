import asyncio
import os
from app.core.database import get_pg_pool

async def main():
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        res = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles'")
        for r in res:
            print(r['column_name'], r['data_type'])

if __name__ == "__main__":
    asyncio.run(main())
