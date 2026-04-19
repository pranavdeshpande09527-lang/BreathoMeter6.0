"""
Breathometer - Assessment Step Inspector v2
Prints step 1 content with full output
"""
import asyncio
import uuid
import sys
from playwright.async_api import async_playwright

async def main():
    sys.stdout.reconfigure(encoding='utf-8')
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        
        await page.goto("https://breathometer6.web.app/signup")
        await page.wait_for_load_state("networkidle")
        
        uname = f"inspect2_{uuid.uuid4().hex[:6]}"
        await page.locator("#fname").fill("Inspector")
        await page.locator("#lname").fill("Two")
        await page.locator("#su-username").fill(uname)
        await page.locator("#dob").fill("1985-01-01")
        await page.locator("#gender").select_option("Male")
        await page.locator("#su-pass").fill("Password123!")
        
        for _ in range(15):
            btn_text = await page.locator("button.auth-submit").inner_text()
            if "Wait" not in btn_text:
                break
            await asyncio.sleep(1)
        
        await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/profile-setup**", timeout=12000)
        await page.locator("#age").fill("40")
        await page.locator("#activity_level").select_option("Moderate")
        await page.locator("#height").fill("170")
        await page.locator("#weight").fill("70")
        await page.locator("#smoking_history").select_option("false")
        await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/dashboard**", timeout=12000)
        
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        
        print("=== STEP 1 ALL INPUTS ===")
        inputs = await page.evaluate("""
            () => Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
                id: el.id, name: el.name, type: el.type, placeholder: el.placeholder, tag: el.tagName
            }))
        """)
        for i, inp in enumerate(inputs):
            print(f"  [{i}] <{inp['tag']} id='{inp['id']}' name='{inp['name']}' type='{inp['type']}' placeholder='{inp['placeholder']}'>")
        
        # Check select options for step 1
        selects = await page.evaluate("""
            () => Array.from(document.querySelectorAll('select')).map(sel => ({
                id: sel.id, name: sel.name,
                options: Array.from(sel.options).map(o => o.value)
            }))
        """)
        print("\n  SELECTS:")
        for sel in selects:
            print(f"    select#{sel['id']}: {sel['options']}")
        
        await browser.close()

asyncio.run(main())
