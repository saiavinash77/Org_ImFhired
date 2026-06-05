import asyncio
import os
from dotenv import load_dotenv
from app.core.database import get_pg_pool

load_dotenv()

async def main():
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        print("Checking Applications...")
        apps = await conn.fetch("SELECT resume_url FROM applications WHERE resume_url IS NOT NULL LIMIT 5")
        for a in apps:
            print(f"App Resume: {a['resume_url']}")
            
        print("\nChecking Profiles...")
        profs = await conn.fetch("SELECT resume_url FROM profiles WHERE resume_url IS NOT NULL LIMIT 5")
        for p in profs:
            print(f"Prof Resume: {p['resume_url']}")

if __name__ == "__main__":
    asyncio.run(main())
