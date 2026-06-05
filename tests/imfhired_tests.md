# FiredIn — TestSprite Test Suite

## App URL
http://localhost:3002

## Test Accounts
- Candidate: testcandidate@firedin.com / Test1234!
- Recruiter: testrecruiter@firedin.com / Test1234!

---

## TEST 1: Landing Page Loads
Navigate to http://localhost:3002
Verify the page title contains "FiredIn"
Verify the text "IF YOU'RE" is visible on the page
Verify a button with text "I'm Looking for Work" is visible
Verify a button with text "I'm Hiring" is visible

---

## TEST 2: Candidate Registration
Navigate to http://localhost:3002/auth/register
Click the button with text "Job Seeker"
Fill the input with placeholder "Sai Avinash" with value "New Test User"
Fill the input with type "email" with value "newuser123@test.com"
Fill the input with placeholder "Min 8 chars, include a number" with value "Test1234!"
Click the button with text "Create Account"
Verify the URL contains "/candidate/onboarding"

---

## TEST 3: Duplicate Email Registration
Navigate to http://localhost:3002/auth/register
Click the button with text "Job Seeker"
Fill the input with type "email" with value "testcandidate@firedin.com"
Fill the input with placeholder "Min 8 chars, include a number" with value "Test1234!"
Fill the input with placeholder "Sai Avinash" with value "Test"
Click the button with text "Create Account"
Verify a toast or error message appears containing "already registered"

---

## TEST 4: Candidate Login
Navigate to http://localhost:3002/auth/login
Click the link or button with text "Job Seeker"
Fill the input with type "email" with value "testcandidate@firedin.com"
Fill the input with type "password" with value "Test1234!"
Click the button with text "Sign In"
Verify the URL contains "/candidate"

---

## TEST 5: Wrong Password Login
Navigate to http://localhost:3002/auth/login
Fill the input with type "email" with value "testcandidate@firedin.com"
Fill the input with type "password" with value "WrongPass999!"
Click the button with text "Sign In"
Verify an error message appears containing "Invalid"

---

## TEST 6: Recruiter Login
Navigate to http://localhost:3002/auth/login
Click the link or button with text "Recruiter"
Fill the input with type "email" with value "testrecruiter@firedin.com"
Fill the input with type "password" with value "Test1234!"
Click the button with text "Sign In"
Verify the URL contains "/recruiter"
Verify the text "Jobs" is visible in the sidebar

---

## TEST 7: Recruiter Dashboard Loads
Navigate to http://localhost:3002/auth/login
Click the link or button with text "Recruiter"
Fill the input with type "email" with value "testrecruiter@firedin.com"
Fill the input with type "password" with value "Test1234!"
Click the button with text "Sign In"
Verify the page contains text "Dashboard" or "Good morning"
Verify the page contains text "Active Jobs"

---

## TEST 8: Post a Job
Navigate to http://localhost:3002/auth/login
Login as testrecruiter@firedin.com with Test1234!
Click the button with text "Post Job"
Fill the input with placeholder containing "Job Title" or "title" with value "Senior Python Developer"
Verify the page contains a description field
Click the button with text "Post" or "Create" or "Publish"
Verify the job "Senior Python Developer" appears on the page

---

## TEST 9: Recruiter Jobs Page
Navigate to http://localhost:3002/auth/login
Login as testrecruiter@firedin.com with Test1234!
Click the link with text "Jobs" in the sidebar
Verify the URL contains "/recruiter/jobs"
Verify the page loads without errors

---

## TEST 10: Recruiter Candidates Page
Navigate to http://localhost:3002/auth/login
Login as testrecruiter@firedin.com with Test1234!
Click the link with text "Candidates" in the sidebar
Verify the URL contains "/recruiter/candidates"
Verify the page contains a table or list

---

## TEST 11: Candidate Jobs Page — Verification Gate
Navigate to http://localhost:3002/auth/login
Login as testcandidate@firedin.com with Test1234!
Navigate to http://localhost:3002/candidate/jobs
Verify the page shows job listings
Verify a button with text "Verify First" or "🔒" is visible (unverified candidate cannot apply)

---

## TEST 12: Candidate Dashboard
Navigate to http://localhost:3002/auth/login
Login as testcandidate@firedin.com with Test1234!
Navigate to http://localhost:3002/candidate/dashboard
Verify the page loads
Verify the page contains "Resume" or "Upload" text

---

## TEST 13: Forgot Password Page
Navigate to http://localhost:3002/auth/forgot-password
Verify the page contains an email input
Fill the email input with value "testcandidate@firedin.com"
Click the button with text "Send Reset Code"
Verify a success message appears

---

## TEST 14: Logout
Navigate to http://localhost:3002/auth/login
Login as testrecruiter@firedin.com with Test1234!
Click the logout button (LogOut icon in sidebar)
Verify the URL contains "/auth/login"

---

## TEST 15: Recruiter Analytics Page
Navigate to http://localhost:3002/auth/login
Login as testrecruiter@firedin.com with Test1234!
Click the link with text "Analytics" in the sidebar
Verify the URL contains "/recruiter/analytics"
Verify the page contains "Applications" or "Pipeline"
