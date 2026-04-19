"""
Breathometer - Assessment Step Inspector
Signs up, navigates to assessment Step 1, and prints all input IDs/names/placeholders.
"""
import asyncio
import uuid
import sys
import os
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        
        # Signup
        await page.goto("https://breathometer6.web.app/signup")
        await page.wait_for_load_state("networkidle")
        
        uname = f"inspect_{uuid.uuid4().hex[:6]}"
        await page.locator("#fname").fill("Inspector")
        await page.locator("#lname").fill("User")
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
        
        # Profile Setup
        await page.locator("#age").fill("40")
        await page.locator("#activity_level").select_option("Moderate")
        await page.locator("#height").fill("170")
        await page.locator("#weight").fill("70")
        await page.locator("#smoking_history").select_option("false")
        await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/dashboard**", timeout=12000)
        
        # Navigate to assessment
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        
        print("=== STEP 1 INPUTS ===")
        inputs = await page.evaluate("""
            () => Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
                id: el.id,
                name: el.name,
                type: el.type,
                placeholder: el.placeholder,
                tag: el.tagName,
                class: el.className.split(' ').filter(c => c.includes('form')).join(' ')
            }))
        """)
        for inp in inputs:
            print(f"  <{inp['tag']} id='{inp['id']}' name='{inp['name']}' type='{inp['type']}' placeholder='{inp['placeholder']}'>")
        
        # Screenshot
        await page.screenshot(path="step1_inspect.png")
        print("\nScreenshot: step1_inspect.png")
        
        # Click Next
        await page.locator("button:has-text('Next Step')").click()
        await asyncio.sleep(1)
        
        print("\n=== STEP 2 INPUTS ===")
        inputs2 = await page.evaluate("""
            () => Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
                id: el.id,
                name: el.name,
                type: el.type,
                placeholder: el.placeholder,
                tag: el.tagName
            }))
        """)
        for inp in inputs2:
            print(f"  <{inp['tag']} id='{inp['id']}' name='{inp['name']}' type='{inp['type']}' placeholder='{inp['placeholder']}'>")
            
        # Check select options
        selects = await page.evaluate("""
            () => Array.from(document.querySelectorAll('select')).map(sel => ({
                id: sel.id,
                name: sel.name,
                options: Array.from(sel.options).map(o => ({val: o.value, text: o.text}))
            }))
        """)
        print("\n  SELECTS WITH OPTIONS:")
        for sel in selects:
            print(f"    select#{sel['id']} name={sel['name']}: {[o['val'] for o in sel['options']]}")
        
        await page.screenshot(path="step2_inspect.png")
        
        # Go to step 3
        try:
            await page.locator("button:has-text('Next Step')").click()
            await asyncio.sleep(1)
        except:
            pass
        
        print("\n=== STEP 3 INPUTS ===")
        buttons3 = await page.evaluate("""
            () => Array.from(document.querySelectorAll('button')).map(btn => ({
                text: btn.innerText.trim(),
                class: btn.className,
                id: btn.id
            })).filter(b => b.text)
        """)
        for btn in buttons3:
            print(f"  <button id='{btn['id']}' class='{btn['class']}'>{btn['text']}</button>")
        
        await page.screenshot(path="step3_inspect.png")
        
        await browser.close()
        print("\nDone.")

if __name__ == "__main__":
    asyncio.run(main())
