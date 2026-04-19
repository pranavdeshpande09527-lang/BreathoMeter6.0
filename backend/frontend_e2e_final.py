"""
Breathometer Full E2E Assessment Automation v2
Corrected selectors for Step 1 and Step 2.
Usage: python frontend_e2e_final.py [extreme|moderate] [run_number]
"""

import asyncio
import uuid
import sys
import os
import json
from playwright.async_api import async_playwright

# Data profiles
PROFILES = {
    "extreme": {
        "signup": {"fname": "Extreme", "lname": "Patient", "dob": "1955-05-20", "gender": "Male", "pass": "Health@999"},
        "profile": {"age": "68", "activity": "Low", "height": "170", "weight": "90", "smoking": "true", "symptoms": "Chronic cough, severe SOB", "baseline": "Shortness of breath on mild exertion"},
        "step1": {"age": "68", "gender": "Male", "height": "170", "weight": "90", "heartrate": "110", "temp": "37.5", "spo2": "89", "bp": "160/100"},
        "step2": {"sob": "Even while resting", "cough_dur": "> 3 weeks", "cough_type": "Persistent cough", "wheezing": "Constantly", "tightness": "Severe frequent episodes", "br": "26"},
        "lung_hold": 1200 # 1.2s
    },
    "moderate": {
        "signup": {"fname": "Moderate", "lname": "Patient", "dob": "1988-11-12", "gender": "Female", "pass": "Health@555"},
        "profile": {"age": "35", "activity": "Moderate", "height": "165", "weight": "65", "smoking": "false", "symptoms": "Occasional wheezing", "baseline": "Good general health"},
        "step1": {"age": "35", "gender": "Female", "height": "165", "weight": "65", "heartrate": "72", "temp": "36.6", "spo2": "98", "bp": "120/80"},
        "step2": {"sob": "During moderate activity", "cough_dur": "3–7 days", "cough_type": "Occasional cough", "wheezing": "Sometimes", "tightness": "Occasionally", "br": "18"},
        "lung_hold": 5000 # 5s
    }
}

async def run_test(profile_key, run_id):
    p = PROFILES[profile_key]
    uname = f"{profile_key}_{uuid.uuid4().hex[:6]}"
    
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        
        print(f"--- STARTING RUN: {profile_key.upper()} ({uname}) ---")
        
        # 1. Signup
        await page.goto("https://breathometer6.web.app/signup")
        await page.locator("#fname").fill(p["signup"]["fname"])
        await page.locator("#lname").fill(p["signup"]["lname"])
        await page.locator("#su-username").fill(uname)
        await page.locator("#dob").fill(p["signup"]["dob"])
        await page.locator("#gender").select_option(p["signup"]["gender"])
        await page.locator("#su-pass").fill(p["signup"]["pass"])
        
        # Wait for "Wait Xs" cooldown
        while True:
            btn_text = await page.locator("button.auth-submit").inner_text()
            if "Wait" not in btn_text: break
            await asyncio.sleep(1)
        
        await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/profile-setup**", timeout=15000)
        print("Signup Success.")

        # 2. Profile Setup
        await page.locator("#age").fill(p["profile"]["age"])
        await page.locator("#activity_level").select_option(p["profile"]["activity"])
        await page.locator("#height").fill(p["profile"]["height"])
        await page.locator("#weight").fill(p["profile"]["weight"])
        await page.locator("#smoking_history").select_option(p["profile"]["smoking"])
        await page.locator("#respiratory_symptoms").fill(p["profile"]["symptoms"])
        await page.locator("#baseline_symptoms").fill(p["profile"]["baseline"])
        await page.locator("button.auth-submit").click()
        await page.wait_for_url("**/dashboard**", timeout=15000)
        print("Profile Setup Success.")

        # 3. Assessment Step 1
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_load_state("networkidle")
        
        await page.locator("#age").fill(p["step1"]["age"])
        await page.locator("select").nth(1).select_option(p["step1"]["gender"]) # Gender is 2nd select
        await page.locator("#height").fill(p["step1"]["height"])
        await page.locator("#weight").fill(p["step1"]["weight"])
        await page.locator("#heartrate").fill(p["step1"]["heartrate"])
        await page.locator("#temp").fill(p["step1"]["temp"])
        await page.locator("#spo2").fill(p["step1"]["spo2"])
        await page.locator("#bp").fill(p["step1"]["bp"])
        
        await page.locator("button:has-text('Next Step')").click()
        await page.wait_for_timeout(1000)
        print("Step 1 Success.")

        # 4. Assessment Step 2
        all_selects = page.locator("select")
        # Step 2 values in order
        s2_vals = [p["step2"]["sob"], p["step2"]["cough_dur"], p["step2"]["cough_type"], p["step2"]["wheezing"], p["step2"]["tightness"]]
        for i, val in enumerate(s2_vals):
            await all_selects.nth(i+1).select_option(val) # Skip first select (city search usually)
        
        await page.locator("#breathRate").fill(p["step2"]["br"])
        await page.locator("button:has-text('Next Step')").click()
        await page.wait_for_timeout(1000)
        print("Step 2 Success.")

        # 5. Assessment Step 3 (Lung Test)
        # Perform 3 holds
        for test in ["Inhale", "Exhale", "Hold"]:
            print(f"Holding for {test}...")
            # We use the text to find the button
            btn = page.locator("button:has-text('HOLD TO START'), button:has-text('RELEASE')").first
            box = await btn.bounding_box()
            await page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
            await page.mouse.down()
            await asyncio.sleep(p["lung_hold"] / 1000)
            await page.mouse.up()
            await asyncio.sleep(1)
        
        await page.locator("button:has-text('Next Step')").click()
        await page.wait_for_timeout(1000)
        print("Step 3 Success.")

        # 6. Remaining Steps (4-9) - Just click next for now as they are often extra data
        for s in range(4, 10):
            try:
                await page.locator("button:has-text('Next Step')").click()
                await page.wait_for_timeout(500)
            except:
                break
        print("Remaining Steps Handled.")

        # 7. Results
        await page.wait_for_url("**/dashboard**", timeout=15000)
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(2)
        
        screenshot_path = f"dashboard_{profile_key}_{run_id}.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        
        content = await page.evaluate("document.body.innerText")
        print(f"--- ANALYSIS FOR {profile_key.upper()} ---")
        if "High Risk" in content or "Extreme Risk" in content:
            print("Status: CRITICAL/HIGH RISK ALERT")
        elif "Moderate Risk" in content:
            print("Status: MODERATE RISK DETECTED")
        else:
            print("Status: LOW RISK/NORMAL")
            
        print(f"Screenshot saved to: {screenshot_path}")
        await browser.close()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "extreme"
    run_idx = sys.argv[2] if len(sys.argv) > 2 else "1"
    asyncio.run(run_test(mode, run_idx))
