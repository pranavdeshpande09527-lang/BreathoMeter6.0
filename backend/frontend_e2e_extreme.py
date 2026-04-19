import asyncio
import uuid
import sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto('https://breathometer6.web.app/signup')
        print("At signup page...")
        
        await page.locator("#fname").fill("Extreme")
        await page.locator("#lname").fill("User")
        pmail = f"ex_{uuid.uuid4().hex[:6]}@test.com"
        # The ID is #su-username, but it takes an email
        await page.locator("#su-username").fill(pmail)
        await page.locator("#dob").fill("1949-01-01")
        await page.locator("#gender").select_option("Male")
        await page.locator("#su-pass").fill("Password123!")
        
        await page.locator("button.auth-submit").click()
        print(f"Submitted signup with email {pmail}...")
        
        try:
            await page.wait_for_url("**/assessment**", timeout=10000)
            print("Successfully reached assessment page!")
        except Exception as e:
            print("Did not reach assessment page. Current URL:", page.url)
            html = await page.content()
            with open("assessment_dump.html", "w", encoding="utf-8") as f:
                f.write(html)
            await page.screenshot(path="error.png")
            await browser.close()
            sys.exit(1)
            
        # We are on the assessment page
        html = await page.content()
        with open("assessment_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
        
        await page.screenshot(path="assessment_step1.png")
        print("Dumped assessment step 1 HTML")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
