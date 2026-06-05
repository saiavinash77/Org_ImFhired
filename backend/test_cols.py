import asyncio
from app.core.database import get_pg_pool
async def check():
    p = await get_pg_pool()
    async with p.acquire() as conn:
        res = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';")
        print([r['column_name'] for r in res])
    await p.close()
asyncio.run(check())
