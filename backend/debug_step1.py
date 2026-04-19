"""
Detailed Step 1 Inspector with Labels
"""
import asyncio
import uuid
import sys
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Signup & Reach Assessment
        await page.goto("https://breathometer6.web.app/signup")
        uname = f"ins{uuid.uuid4().hex[:4]}"
        await page.locator("#su-username").fill(uname)
        await page.locator("#su-pass").fill("Pass123!")
        await page.locator("#fname").fill("I")
        await page.locator("#lname").fill("S")
        await page.locator("#dob").fill("1990-01-01")
        await page.locator("#gender").select_option("Male")
        
        while "Wait" in (await page.locator("button.auth-submit").inner_text()): await asyncio.sleep(1)
        await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/profile-setup**")
        await page.locator("#age").fill("30"); await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/dashboard**")
        
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_selector(".assessment-container", timeout=15000)
        
        await page.screenshot(path="step1_actual.png")
        
        print("STEP 1 ELEMENTS:")
        elements = await page.evaluate("""
            () => Array.from(document.querySelectorAll('.form-group')).map(div => {
                const label = div.querySelector('label') ? div.querySelector('label').innerText : 'NO LABEL';
                const input = div.querySelector('input, select');
                return {
                    label,
                    tag: input ? input.tagName : 'NONE',
                    id: input ? input.id : 'NONE',
                    type: input ? input.type : 'NONE'
                };
            })
        """)
        for el in elements:
            print(f"Label: {el['label']} | Tag: {el['tag']} | ID: {el['id']}")
            
        await browser.close()

asyncio.run(main())
