import httpx
import asyncio
import os

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {os.environ.get("GROQ_API_KEY", "")}',
                'Content-Type': 'application/json'
            },
            json={
                'messages': [{'role':'user', 'content':'test'}],
                'model': 'llama-3.3-70b-versatile'
            }
        )
        print(r.status_code, r.text)

asyncio.run(test())
