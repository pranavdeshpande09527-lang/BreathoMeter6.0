import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        await page.goto('https://breathometer6.web.app/login')
        print("At login page...")
        
        # In Breathometer, login placeholder is usually username, email or similar
        # Let's inspect placeholders before we assume
        html = await page.content()
        with open("login_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
