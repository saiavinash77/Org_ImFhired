import asyncio
import asyncpg

DATABASE_URL = "postgresql://hireai:.!HQ%23D%3B%252%3AAkSfg@hireai-postgres.c54cc8uc8jru.ap-south-1.rds.amazonaws.com:5432/postgres"

async def main():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Check columns of 'users' table
        columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        """)
        print("Columns in 'users' table:")
        for col in columns:
            print(f" - {col['column_name']} ({col['data_type']}) - Nullable: {col['is_nullable']}")
            
        # Check existing user count
        count = await conn.fetchval("SELECT COUNT(*) FROM users")
        print(f"\nTotal users: {count}")
        
        if count > 0:
            users = await conn.fetch("SELECT id, email, role, cognito_username FROM users LIMIT 10")
            print("Sample users:")
            for u in users:
                print(f" - ID: {u['id']}, Email: {u['email']}, Role: {u['role']}, CognitoUsername: {u['cognito_username']}")
                
        await conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
