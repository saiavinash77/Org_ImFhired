"""Pre-flight check — run before starting the server."""
import asyncio
import time
import urllib.request
import json
import app.core.database as db

async def check_db():
    db._pg_pool = None
    pool = await db.get_pg_pool()
    async with pool.acquire() as conn:
        tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        )
        names = [r["tablename"] for r in tables]
        required = {"users", "profiles", "jobs", "applications", "interviews", "assessments", "verification_interviews", "notifications"}
        missing = required - set(names)
        if missing:
            print(f"❌ Missing tables: {missing}")
        else:
            print(f"✅ DB: all {len(names)} tables present")
    await pool.close()
    db._pg_pool = None

def check_api():
    """Hit the health endpoint to confirm server is up."""
    try:
        with urllib.request.urlopen("http://127.0.0.1:8002/health", timeout=3) as r:
            data = json.loads(r.read())
            print(f"✅ API: {data['status']} — {data['service']} v{data['version']}")
            return True
    except Exception as e:
        print(f"⚠️  API not running yet (start uvicorn): {e}")
        return False

def check_frontend():
    try:
        with urllib.request.urlopen("http://localhost:3002", timeout=3) as r:
            print(f"✅ Frontend: running on port 3002 (status {r.status})")
            return True
    except Exception as e:
        print(f"⚠️  Frontend not running yet (start npm run dev): {e}")
        return False

print("\n=== HireAI Pre-flight Check ===\n")
asyncio.run(check_db())
check_api()
check_frontend()
print("\n=== Done ===\n")
print("To start:")
print("  Backend:  uvicorn app.main:app --port 8002 --reload")
print("  Frontend: cd frontend && npm run dev")
