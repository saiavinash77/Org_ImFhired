import asyncio
import re
import uuid
from playwright.async_api import async_playwright

async def run_test():
    pw = None
    browser = None
    context = None
    
    unique_id = str(uuid.uuid4())[:8]
    email = f"persist_test_{unique_id}@qatest.com"
    password = "Password123!"
    name = f"Persist Test {unique_id}"

    print(f"--- STARTING ONBOARDING PERSISTENCE E2E TEST ---")
    print(f"Generated user credentials: {email} / {password}")

    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context()
        context.set_default_timeout(20000)
        
        page = await context.new_page()

        # Listen to page events
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER PAGEERROR: {err}"))

        # Step 1: Navigate to registration page
        print("\n1. Navigating to registration page...")
        await page.goto("http://localhost:3002/auth/register?role=candidate")
        
        print("Filling out registration form...")
        await page.locator("input[placeholder='Sai Avinash']").fill(name)
        await page.locator("input[placeholder='you@example.com']").fill(email)
        await page.locator("input[placeholder='Min 8 chars, include a number']").fill(password)
        
        print("Submitting registration...")
        await page.locator("button:has-text('Create Account')").click()
        
        # Expect to land on onboarding
        await page.wait_for_url("**/candidate/onboarding", timeout=15000)
        print(f"SUCCESS: Redirected immediately to onboarding. Current URL: {page.url}")

        # Step 2: Start filling onboarding but stay INCOMPLETE (Step 1 to 3)
        print("\n2. Filling step 1 (Basic Info)...")
        await page.locator("input[placeholder='Sai Avinash Mandali']").fill(name)
        await page.locator("input[placeholder='+91 98765 43210']").fill("+91 98765 43210")
        await page.locator("input[placeholder='Hyderabad, Telangana']").fill("Hyderabad, TS")
        
        print("Clicking Continue step 1...")
        await page.locator("button:has-text('Continue')").click()
        await asyncio.sleep(2)

        print("Moving to step 2 (Work Status)...")
        # Keep default "laid off"
        print("Clicking Continue step 2...")
        await page.locator("button:has-text('Continue')").click()
        await asyncio.sleep(2)

        print("Filling step 3 (Employment)...")
        await page.locator("input[placeholder='Google, TCS, Startup...']").fill("Hobby Corp")
        await page.locator("input[placeholder='Senior Software Engineer']").fill("Software Engineer")
        await page.locator("input[placeholder='e.g. 4.5']").fill("3")
        await page.locator("input[placeholder='e.g. 1200000']").fill("800000")
        
        print("Clicking Continue step 3...")
        await page.locator("button:has-text('Continue')").click()
        await asyncio.sleep(2)

        print(f"Currently on step 4. Page URL: {page.url}")
        
        # Step 3: Simulate closing session / log out and then returning
        print("\n3. Simulating logout by navigating to /auth/login...")
        await page.goto("http://localhost:3002/auth/login?role=candidate")
        await asyncio.sleep(2)

        print("Logging in again with the incomplete profile user...")
        await page.locator("input[placeholder='you@example.com']").fill(email)
        await page.locator("input[placeholder='••••••••']").fill(password)
        await page.locator("button:has-text('Sign In')").click()

        # Should be redirected to onboarding with ?resume=true
        print("Waiting for redirection...")
        await page.wait_for_url("**/candidate/onboarding?resume=true", timeout=15000)
        print(f"SUCCESS: Incomplete profile user redirected to: {page.url}")

        # Step 4: Resume and finish onboarding
        print("\n4. Completing remaining steps...")
        # Step 4: Skills
        print("Step 4: Skills...")
        await page.locator("input[placeholder='Python, React, Machine Learning...']").fill("Python")
        await page.locator("input[placeholder='Python, React, Machine Learning...']").press("Enter")
        await page.locator("button:has-text('Continue')").click()
        await asyncio.sleep(2)

        # Step 5: Resume upload (Skip or just click continue)
        print("Step 5: Resume...")
        await page.locator("button:has-text('Continue')").click()
        await asyncio.sleep(2)

        # Step 6: Education
        print("Step 6: Education...")
        await page.locator("input[placeholder='IIT Hyderabad, JNTU, VIT...']").fill("JNTU")
        await page.locator("input[placeholder='Computer Science, Data Science, MBA...']").fill("Computer Science")
        await page.locator("button:has-text('Continue')").click()
        await asyncio.sleep(2)

        # Step 7: Preferences
        print("Step 7: Preferences...")
        await page.locator("input[placeholder='e.g. 1500000']").fill("1200000")
        await page.locator("button:has-text('Continue')").click()
        await asyncio.sleep(2)

        # Step 8: Headline
        print("Step 8: Headline...")
        await page.locator("textarea[placeholder='Senior ML Engineer | 5 yrs | Python, LangChain, AWS | Open to remote']").fill("Python Developer with 3 years of experience")
        
        print("Clicking 'Complete Profile'...")
        await page.locator("button:has-text('Complete Profile')").click()

        # Expect redirect to Candidate Dashboard
        await page.wait_for_url("**/candidate/dashboard", timeout=20000)
        print(f"SUCCESS: Redirected to Candidate Dashboard after complete onboarding. URL: {page.url}")

        # Step 5: Log out and log in again as returning complete user
        print("\n5. Logging out complete user...")
        # Click Logout
        await page.locator("button:has-text('Logout')").click()
        await page.wait_for_url("**/auth/login**", timeout=10000)
        print(f"Successfully logged out. URL: {page.url}")

        print("Logging in again with completed credentials...")
        await page.locator("input[placeholder='you@example.com']").fill(email)
        await page.locator("input[placeholder='••••••••']").fill(password)
        await page.locator("button:has-text('Sign In')").click()

        # Should skip onboarding entirely and go directly to /candidate/dashboard
        await page.wait_for_url("**/candidate/dashboard", timeout=15000)
        print(f"SUCCESS: Returning user with complete profile went directly to dashboard. URL: {page.url}")

        print("\n--- ALL THREE SCENARIOS PASSED PERFECTLY ---")

    except Exception as e:
        print(f"TEST FAILED: {str(e)}")
        try:
            # Take a screenshot on failure to debug
            await page.screenshot(path="c:\\Users\\sai avinash\\OneDrive\\Desktop\\All-Vibecoded-Projects\\hireai\\-AI-Interviewer-Skill-Assessment-Platform\\failure.png")
            print("Failure screenshot saved to failure.png")
        except Exception as se:
            print(f"Failed to capture screenshot: {se}")
        raise e
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

if __name__ == "__main__":
    asyncio.run(run_test())
