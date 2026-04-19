import asyncio
import sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # 1. Login
        await page.goto('https://breathometer6.web.app/login')
        print("At login page...")
        
        await page.locator("#username").fill("testuser3@gemini.ai")
        await page.locator("#password").fill("HealthTest@2026")
        await page.locator(".al-submit").click()
        print("Clicked login...")
        
        # Wait to reach assessment page
        try:
            await page.wait_for_url("**/assessment**", timeout=10000)
            print("Successfully reached assessment page!")
        except Exception as e:
            print("Did not reach assessment page. Current URL:", page.url)
            html = await page.content()
            with open("login_error_dump.html", "w", encoding="utf-8") as f:
                f.write(html)
            await page.screenshot(path="login_error.png")
            await browser.close()
            sys.exit(1)
            
        # 2. Assessment
        # Helper function to go next
        async def go_next():
            await page.locator(".as-btn-next").click()
            await page.wait_for_timeout(500)
            
        # Step 1: Health Status (Extreme)
        # Assuming there are radio buttons or inputs.
        # Need to know the id or placeholder for each step to fill.
        
        # But wait! I don't know the inputs for step 1 of the assessment.
        html = await page.content()
        with open("assessment_step1_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        await page.screenshot(path="assessment_step1.png")
        print("Dumped assessment step 1 to find the selectors")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
