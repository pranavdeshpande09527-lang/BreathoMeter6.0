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
        except Exception as e:
            print("Failed profile setup wait", e)
            
        await page.locator("#age").fill("75")
        await page.locator("#activity_level").select_option("Low")
        await page.locator("#height").fill("175")
        await page.locator("#weight").fill("70")
        await page.locator("#smoking_history").select_option("true")
        await page.locator("#respiratory_symptoms").fill("Severe Asthma")
        await page.locator("#baseline_symptoms").fill("Constant coughing")
        
        await page.locator("button.auth-submit").click()
        
        try:
            await page.wait_for_url("**/dashboard**", timeout=15000)
            print("Reached dashboard")
        except Exception as e:
            print("Failed dashboard wait")
            
        await page.goto('https://breathometer6.web.app/breath-analysis')
        await page.wait_for_load_state('networkidle')
        
        html = await page.content()
        with open("breath_analysis_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        await page.screenshot(path="breath_analysis.png")
        print("Dumped breath analysis")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
