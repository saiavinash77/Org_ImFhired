#!/bin/bash

# Authentication Testing Script
# Tests all auth endpoints with sample data

set -e

BASE_URL="${1:-http://localhost:8000}"
API_URL="$BASE_URL/api/v1/auth"

echo "🧪 Testing Authentication Endpoints"
echo "Base URL: $BASE_URL"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5
    
    echo -e "\n${YELLOW}Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        echo "Response: $body" | head -c 200
        echo ""
        PASSED=$((PASSED + 1))
        echo "$body"
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
        echo "Response: $body"
        FAILED=$((FAILED + 1))
    fi
}

# 1. Register Candidate
echo -e "\n${YELLOW}=== REGISTRATION TESTS ===${NC}"

CANDIDATE_DATA='{
  "full_name": "John Candidate",
  "email": "candidate@test.example.com",
  "password": "TestPass123!",
  "role": "candidate",
  "phone": "+1234567890"
}'

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/register" \
    -H "Content-Type: application/json" \
    -d "$CANDIDATE_DATA")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ Register Candidate PASSED${NC}"
    PASSED=$((PASSED + 1))
    CANDIDATE_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "Token: $CANDIDATE_TOKEN"
else
    echo -e "${RED}✗ Register Candidate FAILED${NC} (HTTP $http_code)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
fi

# 2. Register Recruiter
RECRUITER_DATA='{
  "full_name": "Jane Recruiter",
  "email": "recruiter@test.example.com",
  "password": "TestPass123!",
  "role": "recruiter",
  "company_name": "TechCorp",
  "phone": "+0987654321"
}'

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/register" \
    -H "Content-Type: application/json" \
    -d "$RECRUITER_DATA")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ Register Recruiter PASSED${NC}"
    PASSED=$((PASSED + 1))
    RECRUITER_TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "Token: $RECRUITER_TOKEN"
else
    echo -e "${RED}✗ Register Recruiter FAILED${NC} (HTTP $http_code)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
fi

# 3. Duplicate Email
echo -e "\n${YELLOW}Testing: Duplicate Email Registration${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/register" \
    -H "Content-Type: application/json" \
    -d "$CANDIDATE_DATA")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "400" ]; then
    echo -e "${GREEN}✓ Duplicate Email Rejection PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ Duplicate Email Rejection FAILED${NC} (Expected 400, got $http_code)"
    FAILED=$((FAILED + 1))
fi

# 4. Login Tests
echo -e "\n${YELLOW}=== LOGIN TESTS ===${NC}"

LOGIN_DATA='{
  "email": "candidate@test.example.com",
  "password": "TestPass123!"
}'

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Login PASSED${NC}"
    PASSED=$((PASSED + 1))
    TOKEN=$(echo "$body" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
else
    echo -e "${RED}✗ Login FAILED${NC} (HTTP $http_code)"
    FAILED=$((FAILED + 1))
fi

# 5. Wrong Password
echo -e "\n${YELLOW}Testing: Wrong Password${NC}"
WRONG_PASSWORD='{
  "email": "candidate@test.example.com",
  "password": "WrongPassword123!"
}'

response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/login" \
    -H "Content-Type: application/json" \
    -d "$WRONG_PASSWORD")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ Wrong Password Rejection PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ Wrong Password Rejection FAILED${NC} (Expected 401, got $http_code)"
    FAILED=$((FAILED + 1))
fi

# 6. Get Current User
echo -e "\n${YELLOW}=== AUTHENTICATED TESTS ===${NC}"

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Skipping authenticated tests (no token)${NC}"
else
    echo -e "\n${YELLOW}Testing: Get Current User${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/me" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Get Current User PASSED${NC}"
        PASSED=$((PASSED + 1))
        echo "User: $(echo "$body" | grep -o '"email":"[^"]*')"
    else
        echo -e "${RED}✗ Get Current User FAILED${NC} (HTTP $http_code)"
        FAILED=$((FAILED + 1))
    fi
    
    # 7. Refresh Token
    echo -e "\n${YELLOW}Testing: Refresh Token${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/refresh" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Refresh Token PASSED${NC}"
        PASSED=$((PASSED + 1))
        NEW_TOKEN=$(echo "$response" | head -n-1 | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        echo "New Token: $NEW_TOKEN"
    else
        echo -e "${RED}✗ Refresh Token FAILED${NC} (HTTP $http_code)"
        FAILED=$((FAILED + 1))
    fi
    
    # 8. Logout
    echo -e "\n${YELLOW}Testing: Logout${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/logout" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Logout PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ Logout FAILED${NC} (HTTP $http_code)"
        FAILED=$((FAILED + 1))
    fi
fi

# 9. Invalid Token
echo -e "\n${YELLOW}Testing: Invalid Token${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/me" \
    -H "Authorization: Bearer invalid_token_12345" \
    -H "Content-Type: application/json")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ Invalid Token Rejection PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ Invalid Token Rejection FAILED${NC} (Expected 401, got $http_code)"
    FAILED=$((FAILED + 1))
fi

# Summary
echo -e "\n${YELLOW}=== TEST SUMMARY ===${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
