import asyncio
import os
import asyncpg
import boto3
import uuid
from botocore.exceptions import ClientError

DATABASE_URL = os.getenv("DATABASE_URL", "")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")

async def main():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set in the environment.")

    if not USER_POOL_ID:
        raise RuntimeError("COGNITO_USER_POOL_ID is not set in the environment.")

    cognito_client = boto3.client(
        "cognito-idp",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID or None,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY or None,
    )

    conn = await asyncpg.connect(DATABASE_URL)
    
    print("Step 1: Adding 'cognito_sub' column as NULLABLE if it does not exist...")
    await conn.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS cognito_sub VARCHAR(255);
    """)
    
    # Check if we also need to add a UNIQUE constraint later. 
    try:
        await conn.execute("ALTER TABLE users ADD CONSTRAINT users_cognito_sub_key UNIQUE (cognito_sub);")
        print("Unique constraint users_cognito_sub_key created.")
    except Exception as e:
        print(f"Unique constraint may already exist: {e}")
        
    print("\nStep 2: Fetching existing users from database...")
    users = await conn.fetch("SELECT id, email, cognito_username, cognito_sub FROM users")
    print(f"Found {len(users)} users in database.")
    
    updated_count = 0
    legacy_count = 0
    duplicate_count = 0
    
    for u in users:
        user_id = u["id"]
        email = u["email"]
        cognito_username = u["cognito_username"]
        existing_sub = u["cognito_sub"]
        
        # If it's already backfilled/not null, skip
        if existing_sub:
            print(f"User {email} already has sub: {existing_sub}")
            continue
            
        username_to_try = cognito_username or email
        cognito_sub = None
        
        print(f"Fetching Cognito details for {email} (username: {username_to_try})...")
        try:
            res = cognito_client.admin_get_user(
                UserPoolId=USER_POOL_ID,
                Username=username_to_try
            )
            for attr in res.get("UserAttributes", []):
                if attr["Name"] == "sub":
                    cognito_sub = attr["Value"]
                    break
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code == "UserNotFoundException" and email != username_to_try:
                # Try with email if it was different
                try:
                    res = cognito_client.admin_get_user(
                        UserPoolId=USER_POOL_ID,
                        Username=email
                    )
                    for attr in res.get("UserAttributes", []):
                        if attr["Name"] == "sub":
                            cognito_sub = attr["Value"]
                            break
                except ClientError:
                    pass
            
            if not cognito_sub:
                print(f"  Warning: User {email} not found in Cognito ({code}). Using legacy identifier.")
                cognito_sub = f"legacy_{uuid.uuid4()}"
                legacy_count += 1
        
        if cognito_sub:
            try:
                await conn.execute(
                    "UPDATE users SET cognito_sub = $1 WHERE id = $2",
                    cognito_sub, user_id
                )
                print(f"  Updated user {email} with sub: {cognito_sub}")
                updated_count += 1
            except asyncpg.exceptions.UniqueViolationError:
                # Cognito sub is already used by another record (e.g. restoration / duplicates)
                dup_sub = f"duplicate_{uuid.uuid4()}"
                print(f"  Warning: Sub {cognito_sub} is a duplicate for user {email}. Using unique duplicate sub {dup_sub}.")
                await conn.execute(
                    "UPDATE users SET cognito_sub = $1 WHERE id = $2",
                    dup_sub, user_id
                )
                duplicate_count += 1
                updated_count += 1
            
    print(f"\nStep 3: Setting 'cognito_sub' column to NOT NULL...")
    try:
        await conn.execute("ALTER TABLE users ALTER COLUMN cognito_sub SET NOT NULL;")
        print("Column 'cognito_sub' is now NOT NULL.")
    except Exception as e:
        print(f"Error setting NOT NULL: {e}")
        
    print("\nBackfill Summary:")
    print(f"  Total users updated from Cognito (Unique): {updated_count - legacy_count - duplicate_count}")
    print(f"  Total users updated from Cognito (Duplicates): {duplicate_count}")
    print(f"  Total users updated with legacy IDs: {legacy_count}")
    print(f"  Total users processed: {updated_count}")
    
    # Final check
    cols = await conn.fetch("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'cognito_sub'
    """)
    print("\nFinal column state:")
    for col in cols:
        print(f" - {col['column_name']} ({col['data_type']}) - Nullable: {col['is_nullable']}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
