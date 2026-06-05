
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** FiredIn
- **Date:** 2026-05-11
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test T1 Landing Page Loads
- **Test Code:** [T1_Landing_Page_Loads.py](./T1_Landing_Page_Loads.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/2002d7c1-c841-48cf-b54d-9dff952dc43f
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T2 Candidate Login Success
- **Test Code:** [T2_Candidate_Login_Success.py](./T2_Candidate_Login_Success.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/c0e6e909-d37e-40ac-9e88-7f360881c90d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T3 Recruiter Login Success
- **Test Code:** [T3_Recruiter_Login_Success.py](./T3_Recruiter_Login_Success.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/18c14b9b-5cf0-48bc-8feb-3802dc32450e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T4 Wrong Password Shows Error
- **Test Code:** [T4_Wrong_Password_Shows_Error.py](./T4_Wrong_Password_Shows_Error.py)
- **Test Error:** TEST BLOCKED

The login error verification could not be run — the login page (SPA) is not rendering so the UI cannot be interacted with.

Observations:
- The page is blank and the browser state shows 0 interactive elements.
- The screenshot shows an empty/white page indicating the SPA did not load.
- The login form and any potential error message could not be found to verify the 'Invalid' message.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/9d81fb87-87b0-4349-ba23-21626aca6aa6
- **Status:** BLOCKED
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T5 Register Page Has Role Tabs
- **Test Code:** [T5_Register_Page_Has_Role_Tabs.py](./T5_Register_Page_Has_Role_Tabs.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/8bbc4ca0-79ac-4822-8673-3bfa659d5f55
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T6 Forgot Password Page Loads
- **Test Code:** [T6_Forgot_Password_Page_Loads.py](./T6_Forgot_Password_Page_Loads.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/f2e6790f-836c-4d55-8674-d2b72e7c43ab
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T7 Recruiter Jobs Page Loads
- **Test Code:** [T7_Recruiter_Jobs_Page_Loads.py](./T7_Recruiter_Jobs_Page_Loads.py)
- **Test Error:** TEST FAILURE

Recruiter login did not complete and the jobs area did not fully load.

Observations:
- After submitting the recruiter credentials, the login form remained visible and the app did not navigate to the recruiter area.
- Navigating to /recruiter/jobs loads a page that displays 'Verifying your session' (a spinner) and does not show the Jobs UI.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/b4734572-c895-416e-bb4b-e20352e0b19a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T8 Recruiter Candidates Page Loads
- **Test Code:** [T8_Recruiter_Candidates_Page_Loads.py](./T8_Recruiter_Candidates_Page_Loads.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/f573be89-51c1-45dc-a230-25657645a2d4
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test T9 Candidate Jobs Verification Gate
- **Test Code:** [T9_Candidate_Jobs_Verification_Gate.py](./T9_Candidate_Jobs_Verification_Gate.py)
- **Test Error:** TEST FAILURE

The unverified candidate did not see a lock icon or a "Verify First" prompt on the candidate jobs page. Apply buttons are present on the job cards instead of a verification lock or message.

Observations:
- The job cards show active 'Apply Now' links (multiple anchors labeled 'Apply Now').
- Searching the page for 'Verify First' and 'Verify' returned no matches.
- No lock icon or verification text was visible in the job cards or elsewhere on the page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/d91bb045-f892-4339-9f65-54969c228dea/a91eb8d9-ff88-4cde-be09-c829fe284267
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **66.67** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---