import asyncio
import asyncpg
from app.core.config import settings

async def migrate():
    print(f"Connecting to {settings.DATABASE_URL}...")
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        print("Creating stories table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS stories (
                id UUID PRIMARY KEY,
                candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                ai_tags TEXT[] DEFAULT '{}',
                embedding vector(1536),
                story_date DATE DEFAULT CURRENT_DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS stories_candidate_date_idx
            ON stories(candidate_id, story_date);
        """)
        
        print("Adding is_verified column to profiles...")
        await conn.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;")
        
        print("Syncing is_verified from verified_at...")
        await conn.execute("UPDATE profiles SET is_verified = TRUE WHERE verified_at IS NOT NULL;")
        
        print("Migration successful!")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
