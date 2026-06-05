import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.config import settings
from app.services.profile_vector_service import get_profile_vector_service
from app.api.v1.endpoints.search import search_candidates, CandidateSearchQuery

async def test_end_to_end():
    print("=== STARTING FIREDIN SEARCH END-TO-END INTEGRATION TEST ===")
    
    # 1. Verify environment configuration
    print(f"OpenAI API Key configured: {'YES' if settings.OPENAI_API_KEY else 'NO'}")
    print(f"Database URL configured: {'YES' if settings.DATABASE_URL else 'NO'}")
    
    # 2. Test database connection & fetch candidates
    from app.core.database import get_pg_pool
    pool = await get_pg_pool()
    async with pool.acquire() as conn:
        print("\n[DB Conn] Checking current RDS database tables...")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        print("Existing Tables:")
        for t in tables:
            print(f"- {t['table_name']}")
            
        cand_count = await conn.fetchval("SELECT count(*) FROM profiles")
        print(f"\n[DB Conn] Total candidates in 'profiles' table: {cand_count}")
        
        vector_count = await conn.fetchval("SELECT count(*) FROM profile_embeddings")
        print(f"[DB Conn] Total vectors in 'profile_embeddings' table: {vector_count}")

        # Fetch one test candidate if exists
        test_candidate = await conn.fetchrow("SELECT id, full_name FROM profiles LIMIT 1")
        if test_candidate:
            candidate_id = str(test_candidate['id'])
            print(f"\n[Vector Sync] Found candidate '{test_candidate['full_name']}' (ID: {candidate_id}) for vector sync test.")
            
            # 3. Test vector sync trigger
            print(f"[Vector Sync] Generating & updating embedding for {test_candidate['full_name']}...")
            try:
                vector_svc = get_profile_vector_service()
                await vector_svc.update_candidate_embedding(candidate_id)
                print("[Vector Sync] Success! Search vector updated in RDS 'profile_embeddings'.")
            except Exception as e:
                print(f"[Vector Sync] Error during candidate embedding update: {e}")
        else:
            print("\n[Vector Sync] No profiles found in DB; skipping profile sync test.")

    # 4. Test LLaMA 3.3 Intent Sourcing + pgvector Cosine Search
    print("\n[Search Query] Running AI intent extraction & vector similarity match...")
    try:
        results = await search_candidates(
            body=CandidateSearchQuery(
                query="Senior Python developer with machine learning experience, strong in FastAPI and SQL",
                limit=5
            ),
            current_user={"role": "recruiter", "sub": "test"}
        )
        print("\n[Search Query] Results returned successfully!")
        print(f"Total Matches Found: {results['total_found']}")
        if 'intent' in results:
            print("Extracted Search Intent:")
            print(f"- Skills: {results['intent'].get('skills')}")
            print(f"- Min Years: {results['intent'].get('min_years')}")
            print(f"- Domain: {results['intent'].get('domains')}")
        
        print("\nMatch Results:")
        for idx, r in enumerate(results.get('results', [])):
            is_verified = r.get('verification_status') in ('completed', 'verified')
            verified_badge = "[VERIFIED]" if is_verified else "[UNVERIFIED]"
            print(f"{idx+1}. {r['name']} {verified_badge} - Match: {r['match_score']}%")
            print(f"   Match Reason: {r.get('match_reason')}")
            print(f"   Skills: {r.get('skills', [])[:5]}")
            print(f"   Stories Logged: {r.get('story_count', 0)}")
            
    except Exception as e:
        print(f"[Search Query] Sourcing execution failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_end_to_end())
