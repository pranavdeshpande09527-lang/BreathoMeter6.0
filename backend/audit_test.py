import asyncio
import json
import time
from app.services.ai_fallback_router import call_with_fallback

async def test_single_query():
    print("--- Simulating real user query ---")
    start = time.time()
    res = await call_with_fallback(
        purpose="chat",
        user_prompt="What can I do to improve my indoor air quality?",
        system_prompt="You are Hava, an AI health assistant.",
        json_mode=False
    )
    latency = time.time() - start
    print(f"Latency: {latency:.2f}s")
    print(f"Response: {res[:150]}...")
    print("-" * 40)

async def stress_test():
    print("--- Stress testing AI calls (10 parallel requests) ---")
    
    async def make_req(i):
        try:
            start = time.time()
            await call_with_fallback(purpose="chat", user_prompt=f"Stress test {i}: How is the weather?", json_mode=False)
            return time.time() - start, "SUCCESS"
        except Exception as e:
            return 0, f"FAIL: {e}"

    results = await asyncio.gather(*[make_req(i) for i in range(10)])
    
    successes = 0
    total_time = 0
    for latency, status in results:
        if status == "SUCCESS":
            successes += 1
            total_time += latency
        else:
            print(status)
            
    avg_latency = total_time / successes if successes else 0
    print(f"Stress test result: {successes}/10 successful. Avg latency: {avg_latency:.2f}s")
    print("-" * 40)

if __name__ == "__main__":
    asyncio.run(test_single_query())
    asyncio.run(stress_test())
