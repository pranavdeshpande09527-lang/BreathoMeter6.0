import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto('https://breathometer6.web.app/signup')
        print("At signup page...")
        await page.wait_for_timeout(2000)
        
        content = await page.content()
        with open("signup_dump.html", "w", encoding="utf-8") as f:
            f.write(content)
            
        await page.screenshot(path="signup_page.png", full_page=True)
        print("Dumped signup page.")
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
