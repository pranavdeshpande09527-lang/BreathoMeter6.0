"""
Step 2 Select Option Inspector
"""
import asyncio
import uuid
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        
        await page.goto("https://breathometer6.web.app/signup")
        uname = f"chk{uuid.uuid4().hex[:4]}"
        await page.locator("#su-username").fill(uname)
        await page.locator("#su-pass").fill("Pass123!")
        await page.locator("#fname").fill("A")
        await page.locator("#lname").fill("B")
        await page.locator("#dob").fill("1990-01-01")
        await page.locator("#gender").select_option("Male")
        await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/profile-setup**")
        await page.locator("#age").fill("30"); await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/dashboard**")
        
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_selector("#age")
        await page.locator("button:has-text('Next Step')").click()
        await page.wait_for_selector("#breathRate")
        
        selects_data = await page.evaluate("""
            () => Array.from(document.querySelectorAll('select')).map(sel => ({
                id: sel.id,
                options: Array.from(sel.options).map(o => ({ text: o.innerText, value: o.value }))
            }))
        """)
        for i, s in enumerate(selects_data):
            print(f"Select {i}:")
            for opt in s['options']:
                print(f"  - [{opt['value']}] {opt['text']}")
                
        await browser.close()

asyncio.run(main())
