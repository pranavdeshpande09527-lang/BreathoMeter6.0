"""
Breathometer E2E Final - Robust Version
Uses explicit waits and handles signup cooldowns.
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
    uname = f"test_{profile_key}_{uuid.uuid4().hex[:4]}"
    
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print(f"Starting journey for {profile_key}...")
        await page.goto("https://breathometer6.web.app/signup")
        
        await page.locator("#fname").fill("Test")
        await page.locator("#lname").fill(profile_key.capitalize())
        await page.locator("#su-username").fill(uname)
        await page.locator("#dob").fill("1980-01-01")
        await page.locator("#gender").select_option("Male")
        await page.locator("#su-pass").fill("Password123!")
        
        # Click signup and wait for potential cooldown
        submit = page.locator("button.auth-submit")
        await submit.click()
        
        # If it says "Wait X seconds", we wait
        for _ in range(40):
            txt = await submit.inner_text()
            if "Wait" in txt:
                await asyncio.sleep(1)
                await submit.click()
            else:
                break
        
        # Wait for profile setup OR dashboard
        await page.wait_for_selector("#age, .dashboard-container", timeout=20000)
        
        if await page.locator("#age").is_visible():
            await page.locator("#age").fill(p["vals"]["age"])
            await page.locator("#height").fill(p["vals"]["height"])
            await page.locator("#weight").fill(p["vals"]["weight"])
            await submit.click()
            await page.wait_for_selector(".dashboard-container", timeout=20000)
            
        print("At Dashboard. Starting Assessment...")
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_selector("#age", timeout=20000)
        
        # Step 1
        await page.locator("#age").fill(p["vals"]["age"])
        # Find gender select by looking for labels
        await page.select_option("select:near(label:text('Gender'))", p["vals"]["gender"])
        await page.locator("#height").fill(p["vals"]["height"])
        await page.locator("#weight").fill(p["vals"]["weight"])
        await page.locator("#heartrate").fill(p["vals"]["hr"])
        await page.locator("#temp").fill(p["vals"]["temp"])
        await page.locator("#spo2").fill(p["vals"]["spo2"])
        await page.locator("#bp").fill(p["vals"]["bp"])
        await page.locator("button:has-text('Next Step')").click()
        
        # Step 2
        await page.wait_for_selector("#breathRate", timeout=10000)
        await page.select_option("select:near(label:text('Shortness of Breath'))", p["vals"]["sob"])
        await page.select_option("select:near(label:text('Cough Duration'))", p["vals"]["cough"])
        await page.select_option("select:near(label:text('Cough Type'))", p["vals"]["ctype"])
        await page.select_option("select:near(label:text('Wheezing'))", p["vals"]["wheeze"])
        await page.select_option("select:near(label:text('Chest Tightness'))", p["vals"]["tight"])
        await page.locator("#breathRate").fill(p["vals"]["br"])
        await page.locator("button:has-text('Next Step')").click()
        
        # Step 3 - Lung Test
        await page.wait_for_selector("button:has-text('HOLD TO START')", timeout=10000)
        for _ in range(3):
            btn = page.locator("button:has-text('HOLD TO START')").first
            await btn.hover()
            await page.mouse.down()
            await asyncio.sleep(p["hold"])
            await page.mouse.up()
            await asyncio.sleep(1)
        await page.locator("button:has-text('Next Step')").click()
        
        # Steps 4-9: Rush through
        for i in range(4, 10):
            try:
                btn = page.locator("button:has-text('Next Step')")
                await btn.wait_for(state="visible", timeout=5000)
                await btn.click()
            except:
                break
        
        # Final Verification
        await page.wait_for_selector(".risk-score, .narrative-text", timeout=20000)
        await asyncio.sleep(2)
        
        fname = f"result_{profile_key}.png"
        await page.screenshot(path=fname, full_page=True)
        print(f"Captured {fname}")
        
        risk = await page.locator(".risk-score").inner_text() if await page.locator(".risk-score").count() > 0 else "Unknown"
        narrative = await page.locator(".narrative-text").inner_text() if await page.locator(".narrative-text").count() > 0 else "No narrative"
        
        print(f"RISK: {risk}")
        print(f"NARRATIVE: {narrative[:100]}...")
        
        await browser.close()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "extreme"
    asyncio.run(run_assessment(mode))
