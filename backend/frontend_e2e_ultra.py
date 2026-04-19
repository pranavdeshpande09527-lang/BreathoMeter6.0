"""
Breathometer E2E Final - Ultra Robust
Based on debug_step1.py which is confirmed to reach the dashboard.
"""
import asyncio
import uuid
import sys
import os
from playwright.async_api import async_playwright

PROFILES = {
    "extreme": {
        "vals": {
            "age": "72", "gender": "Male", "height": "175", "weight": "110",
            "hr": "115", "temp": "38.1", "spo2": "87", "bp": "170/110",
            "sob": "Even while resting", "cough": "> 3 weeks", "ctype": "Persistent cough",
            "wheeze": "Constantly", "tight": "Severe frequent episodes", "br": "28"
        },
        "hold": 1.0
    },
    "moderate": {
        "vals": {
            "age": "28", "gender": "Female", "height": "165", "weight": "60",
            "hr": "68", "temp": "36.6", "spo2": "99", "bp": "118/78",
            "sob": "Never", "cough": "No cough", "ctype": "Occasional cough",
            "wheeze": "Never", "tight": "Never", "br": "14"
        },
        "hold": 10.0
    }
}

async def run_assessment(profile_key):
    p = PROFILES[profile_key]
    uname = f"u{uuid.uuid4().hex[:6]}"
    
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        print(f"Starting {profile_key}...")
        await page.goto("https://breathometer6.web.app/signup")
        
        # Signup
        await page.locator("#fname").fill("Test")
        await page.locator("#lname").fill(profile_key)
        await page.locator("#su-username").fill(uname)
        await page.locator("#dob").fill("1990-01-01")
        await page.locator("#gender").select_option("Male")
        await page.locator("#su-pass").fill("Password123!")
        
        # Cooldown handle
        submit_btn = page.locator("button.auth-submit")
        await submit_btn.click()
        for _ in range(15):
            t = await submit_btn.inner_text()
            if "Wait" in t:
                await asyncio.sleep(1)
                await submit_btn.click()
            else: break
            
        # Profile Setup
        await page.wait_for_url("**/profile-setup**", timeout=20000)
        await page.locator("#age").fill(p["vals"]["age"])
        await page.locator("#height").fill(p["vals"]["height"])
        await page.locator("#weight").fill(p["vals"]["weight"])
        await page.locator("button.auth-submit").click()
        
        # Dashboard
        await page.wait_for_url("**/dashboard**", timeout=20000)
        print("At Dashboard.")
        
        # Assessment
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_selector("#age", timeout=15000)
        
        # Step 1
        await page.locator("#age").fill(p["vals"]["age"])
        await page.locator("#height").fill(p["vals"]["height"])
        await page.locator("#weight").fill(p["vals"]["weight"])
        await page.locator("#heartrate").fill(p["vals"]["hr"])
        await page.locator("#temp").fill(p["vals"]["temp"])
        await page.locator("#spo2").fill(p["vals"]["spo2"])
        await page.locator("#bp").fill(p["vals"]["bp"])
        await page.locator("button:has-text('Next Step')").click()
        
        # Step 2
        await page.wait_for_selector("#breathRate", timeout=10000)
        # Selects by index as label searching can be tricky
        selects = page.locator("select")
        await selects.nth(1).select_option(p["vals"]["sob"])
        await selects.nth(2).select_option(p["vals"]["cough"])
        await selects.nth(3).select_option(p["vals"]["ctype"])
        await selects.nth(4).select_option(p["vals"]["wheeze"])
        await selects.nth(5).select_option(p["vals"]["tight"])
        await page.locator("#breathRate").fill(p["vals"]["br"])
        await page.locator("button:has-text('Next Step')").click()
        
        # Step 3
        await page.wait_for_selector("button:has-text('PRESS AND HOLD')")
        for _ in range(3):
            btn = page.locator("button:has-text('PRESS AND HOLD'), button:has-text('RELEASE')").first
            box = await btn.bounding_box()
            await page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
            await page.mouse.down()
            await asyncio.sleep(p["hold"])
            await page.mouse.up()
            await asyncio.sleep(1)
        await page.locator("button:has-text('Next Step')").click()
        
        # Remaining
        for _ in range(6):
            try:
                await page.locator("button:has-text('Next Step')").click()
                await asyncio.sleep(0.5)
            except: break
            
        await page.wait_for_url("**/dashboard**", timeout=30000)
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(3) # Wait for animation
        
        # Capture
        full_path = f"final_{profile_key}.png"
        await page.screenshot(path=full_path, full_page=True)
        print(f"Result saved to {full_path}")
        
        # Extract results
        content = await page.evaluate("document.body.innerText")
        print(f"--- {profile_key.upper()} SUMMARY ---")
        if "High Risk" in content: print("Status: HIGH RISK")
        elif "Moderate Risk" in content: print("Status: MODERATE RISK")
        else: print("Status: LOW RISK")
        
        await browser.close()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "extreme"
    asyncio.run(run_assessment(mode))
