# Running the Profile Persistence Migration

## Quick Start

### 1. Get Your RDS Connection Details
From your AWS RDS console or `.env` file:
```
RDS_ENDPOINT=your-rds-endpoint.rds.amazonaws.com
DB_USER=postgres (or your username)
DB_NAME=firedin (or your database name)
DB_PASSWORD=your-password
```

### 2. Run the Migration

#### Option A: Using psql (Recommended)
```bash
psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -f infra/migration_add_cognito_sub.sql
```

Example:
```bash
psql -h firedin-db.c9akciq32.us-east-1.rds.amazonaws.com -U postgres -d firedin -f infra/migration_add_cognito_sub.sql
```

When prompted, enter your database password.

#### Option B: Using Python (if psql not available)
```bash
python3 -c "
import psycopg2
conn = psycopg2.connect(
    host='<RDS_ENDPOINT>',
    user='<DB_USER>',
    password='<DB_PASSWORD>',
    database='<DB_NAME>'
)
cur = conn.cursor()
with open('infra/migration_add_cognito_sub.sql', 'r') as f:
    cur.execute(f.read())
conn.commit()
cur.close()
conn.close()
print('Migration completed successfully!')
"
```

#### Option C: Using AWS RDS Query Editor (if available)
1. Go to AWS RDS Console
2. Select your database
3. Click "Query Editor"
4. Copy-paste the contents of `infra/migration_add_cognito_sql`
5. Execute

### 3. Verify Migration

```bash
psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
"
```

You should see:
```
 column_name  |       data_type       | is_nullable
--------------+-----------------------+-------------
 id           | uuid                  | NO
 email        | text                  | NO
 role         | text                  | NO
 cognito_username | text               | YES
 cognito_sub  | character varying     | YES  ← NEW COLUMN
 created_at   | timestamp with tz     | YES
 updated_at   | timestamp with tz     | YES
```

### 4. Check Index

```bash
psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -c "
SELECT indexname FROM pg_indexes WHERE tablename = 'users';
"
```

You should see `users_cognito_sub_idx` in the list.

## What the Migration Does

1. **Adds `cognito_sub` column** — VARCHAR(255), UNIQUE
   - Links Cognito authentication to RDS user records
   - Set to user's email (Cognito uses email as username)

2. **Backfills existing users** — Sets `cognito_sub` from `cognito_username`
   - Ensures existing users can log in without re-registering

3. **Creates index** — `users_cognito_sub_idx`
   - Fast lookups when checking if profile exists

## Rollback (if needed)

```sql
DROP INDEX IF EXISTS users_cognito_sub_idx;
ALTER TABLE users DROP COLUMN IF EXISTS cognito_sub;
```

## Troubleshooting

### "psql: command not found"
Install PostgreSQL client:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
Download from https://www.postgresql.org/download/windows/
```

### "FATAL: Ident authentication failed"
Add password to connection string:
```bash
PGPASSWORD=<DB_PASSWORD> psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -f infra/migration_add_cognito_sub.sql
```

### "ERROR: relation 'users' does not exist"
Make sure you're connecting to the correct database. Check:
```bash
psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -c "SELECT * FROM users LIMIT 1;"
```

### "ERROR: column 'cognito_sub' already exists"
Migration already ran. This is fine. Verify with:
```bash
psql -h <RDS_ENDPOINT> -U <DB_USER> -d <DB_NAME> -c "SELECT cognito_sub FROM users LIMIT 1;"
```

## Next Steps

After migration:
1. Deploy backend changes
2. Deploy frontend changes
3. Test login flow with all three scenarios
4. Monitor console logs for `[Auth Flow]` messages
