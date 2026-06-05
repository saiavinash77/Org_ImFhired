#!/bin/bash
# Test script for clean authentication layer

set -e

BASE_URL="${BASE_URL:-http://localhost:8000}"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
TEST_NAME="Test User"

echo "=========================================="
echo "Testing Clean Auth Layer"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Register
echo "Test 1: Register new user"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"full_name\": \"$TEST_NAME\",
    \"role\": \"candidate\",
    \"phone\": \"555-1234\"
  }")

echo "Response: $REGISTER_RESPONSE"
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$TOKEN" ]; then
    echo "✗ Registration failed"
    exit 1
fi

echo "✓ Registration successful"
echo "  Token: ${TOKEN:0:20}..."
echo "  User ID: $USER_ID"
echo ""

# Test 2: Get current user
echo "Test 2: Get current user"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $ME_RESPONSE"
ME_EMAIL=$(echo "$ME_RESPONSE" | grep -o '"email":"[^"]*' | cut -d'"' -f4)

if [ "$ME_EMAIL" != "$TEST_EMAIL" ]; then
    echo "✗ Get me failed"
    exit 1
fi

echo "✓ Get me successful"
echo "  Email: $ME_EMAIL"
echo ""

# Test 3: Login
echo "Test 3: Login with credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "Response: $LOGIN_RESPONSE"
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$LOGIN_TOKEN" ]; then
    echo "✗ Login failed"
    exit 1
fi

echo "✓ Login successful"
echo "  Token: ${LOGIN_TOKEN:0:20}..."
echo ""

# Test 4: Refresh token
echo "Test 4: Refresh token"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/refresh" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $REFRESH_RESPONSE"
REFRESH_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$REFRESH_TOKEN" ]; then
    echo "✗ Refresh failed"
    exit 1
fi

echo "✓ Refresh successful"
echo "  New Token: ${REFRESH_TOKEN:0:20}..."
echo ""

# Test 5: Logout
echo "Test 5: Logout"
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $LOGOUT_RESPONSE"
echo "✓ Logout successful"
echo ""

# Test 6: Invalid token
echo "Test 6: Test invalid token rejection"
INVALID_RESPONSE=$(curl -s -X GET "$BASE_URL/api/v1/auth/me" \
  -H "Authorization: Bearer invalid_token")

echo "Response: $INVALID_RESPONSE"
if echo "$INVALID_RESPONSE" | grep -q "Invalid token"; then
    echo "✓ Invalid token rejected correctly"
else
    echo "✗ Invalid token not rejected"
    exit 1
fi
echo ""

echo "=========================================="
echo "✓ All tests passed!"
echo "=========================================="
