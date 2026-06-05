import asyncio
import asyncpg

async def run():
    conn = await asyncpg.connect('postgresql://hireai:.!HQ%23D%3B%252%3AAkSfg@hireai-postgres.c54cc8uc8jru.ap-south-1.rds.amazonaws.com:5432/postgres')
    row = await conn.fetchrow('SELECT unique_link FROM interviews ORDER BY created_at DESC LIMIT 1;')
    print(f"\n\n👉 YOUR INTERVIEW LINK: http://localhost:3002{row['unique_link']}\n\n")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(run())
