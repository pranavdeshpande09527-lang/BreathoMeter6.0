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
        
        uname = f"test_{uuid.uuid4().hex[:6]}"
        await page.locator("#fname").fill("Extreme")
        await page.locator("#lname").fill("User")
        await page.locator("#su-username").fill(uname)
        await page.locator("#dob").fill("1949-01-01")
        await page.locator("#gender").select_option("Male")
        await page.locator("#su-pass").fill("Password123!")
        
        await page.locator("button.auth-submit").click()
        
        try:
            await page.wait_for_url("**/profile-setup**", timeout=10000)
            print("Successfully reached profile-setup page!")
        except Exception as e:
            print("Did not reach profile setup:", e)
            await browser.close()
            sys.exit(1)
            
        html = await page.content()
        with open("profile_setup_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
        await page.screenshot(path="profile_setup.png")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
