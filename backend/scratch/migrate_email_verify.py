import asyncio
import asyncpg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    
    print("Running migration...")
    await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;")
    await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;")
    print("Migration complete.")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
