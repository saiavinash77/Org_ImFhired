#!/bin/bash
# Setup script for clean authentication rebuild

set -e

echo "=========================================="
echo "FiredIn — Clean Auth Rebuild"
echo "=========================================="
echo ""

# Check environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL not set"
    exit 1
fi

if [ -z "$COGNITO_USER_POOL_ID" ]; then
    echo "ERROR: COGNITO_USER_POOL_ID not set"
    exit 1
fi

if [ -z "$AWS_REGION" ]; then
    echo "ERROR: AWS_REGION not set"
    exit 1
fi

echo "✓ Environment variables configured"
echo ""

# Step 1: Clear database
echo "Step 1: Clearing database..."
psql "$DATABASE_URL" -f reset_auth.sql
echo "✓ Database cleared"
echo ""

# Step 2: Clear Cognito users
echo "Step 2: Clearing Cognito users..."
echo "Fetching users from Cognito pool: $COGNITO_USER_POOL_ID"

USERS=$(aws cognito-idp list-users \
  --user-pool-id "$COGNITO_USER_POOL_ID" \
  --region "$AWS_REGION" \
  --query 'Users[*].Username' \
  --output text)

if [ -z "$USERS" ]; then
    echo "✓ No users to delete"
else
    for user in $USERS; do
        echo "  Deleting user: $user"
        aws cognito-idp admin-delete-user \
          --user-pool-id "$COGNITO_USER_POOL_ID" \
          --username "$user" \
          --region "$AWS_REGION" 2>/dev/null || true
    done
    echo "✓ Cognito users cleared"
fi
echo ""

echo "=========================================="
echo "✓ Clean auth setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Restart backend: docker-compose restart backend"
echo "2. Test registration: curl -X POST http://localhost:8000/api/v1/auth/register ..."
echo "3. Check AUTH_REBUILD_STEPS.md for detailed testing"
echo ""
