import asyncio
from app.core.database import get_pg_pool

async def main():
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, email, role, cognito_sub FROM users")
        print(f"Total users in DB: {len(rows)}")
        for r in rows:
            print(f"- ID: {r['id']}, Email: {r['email']}, Role: {r['role']}, Sub: {r['cognito_sub']}")

asyncio.run(main())
