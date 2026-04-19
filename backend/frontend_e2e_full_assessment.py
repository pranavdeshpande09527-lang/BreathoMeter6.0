"""
Breathometer Full E2E Assessment Automation
Creates synthetic accounts and submits all 9 assessment steps.
Supports 'extreme' and 'moderate' risk profiles.
Usage: python frontend_e2e_full_assessment.py [extreme|moderate] [run_number]
"""

import asyncio
import uuid
import sys
import os
from datetime import datetime
from playwright.async_api import async_playwright

# ──────────────────────────────────────────────
# SYNTHETIC DATA PROFILES
# ──────────────────────────────────────────────

PROFILES = {
    "extreme": {
        "fname": "Extreme",
        "lname": "Risk",
        "dob": "1949-01-01",
        "gender": "Male",
        "password": "TestPass@2026",
        # Profile Setup
        "age": "75",
        "activity_level": "Low",
        "height": "165",
        "weight": "95",
        "smoking_history": "true",
        "respiratory_symptoms": "Severe COPD, Asthma",
        "baseline_symptoms": "Constant coughing, heavy wheezing",
        # Step 1: Personal Health Metrics
        "s1_age": "75",
        "s1_gender": "Male",
        "s1_height": "165",
        "s1_weight": "95",
        "s1_heartrate": "105",
        "s1_temp": "37.8",
        "s1_spo2": "88",
        "s1_bp": "155/100",
        # Step 2: Respiratory Condition (select values)
        "s2_shortness_of_breath": "Daily",
        "s2_cough_duration": "More than 3 months",
        "s2_cough_type": "Wet/Productive",
        "s2_wheezing": "Daily",
        "s2_chest_tightness": "Daily",
        "s2_breathing_rate": "24",
        # Step 3: Lung Capacity (simulated short hold times = poor capacity)
        "lung_hold_ms": 1500,  # ~1.5s hold → low capacity signal
        # Steps 4-9 filled via best-effort selectors
        "s4_environmental": "Mumbai",  # city for AQI lookup
        "s5_lifestyle_smoking": "Current smoker",
        "s5_alcohol": "Regularly",
        "s5_activity": "Sedentary",
        "s6_medical_history": "COPD",
        "s6_allergies": "Dust",
        "s6_medications": "Salbutamol",
        # Generic high-risk answers for remaining steps
    },
    "moderate": {
        "fname": "Moderate",
        "lname": "Risk",
        "dob": "1985-06-15",
        "gender": "Female",
        "password": "TestPass@2026",
        # Profile Setup
        "age": "40",
        "activity_level": "Moderate",
        "height": "162",
        "weight": "68",
        "smoking_history": "false",
        "respiratory_symptoms": "Mild seasonal asthma",
        "baseline_symptoms": "Occasional morning cough",
        # Step 1
        "s1_age": "40",
        "s1_gender": "Female",
        "s1_height": "162",
        "s1_weight": "68",
        "s1_heartrate": "78",
        "s1_temp": "36.8",
        "s1_spo2": "96",
        "s1_bp": "125/82",
        # Step 2
        "s2_shortness_of_breath": "Occasionally",
        "s2_cough_duration": "Less than 2 weeks",
        "s2_cough_type": "Dry",
        "s2_wheezing": "Occasionally",
        "s2_chest_tightness": "Occasionally",
        "s2_breathing_rate": "16",
        # Step 3: Moderate hold time
        "lung_hold_ms": 4000,  # ~4s hold → moderate capacity
        # Steps 4-9
        "s4_environmental": "Delhi",
        "s5_lifestyle_smoking": "Never",
        "s5_alcohol": "Occasionally",
        "s5_activity": "Lightly active",
        "s6_medical_history": "Seasonal asthma",
        "s6_allergies": "Pollen",
        "s6_medications": "Cetirizine",
    }
}

async def safe_select(page, selector, value, label=""):
    """Try to select an option, fallback to selecting first available."""
    try:
        await page.locator(selector).select_option(value, timeout=3000)
    except Exception as e:
        print(f"  ⚠ Could not select '{value}' for {label}: {e}")
        try:
            # Try selecting by label text
            await page.locator(selector).select_option(label=value, timeout=2000)
        except:
            pass

async def safe_fill(page, selector, value, label=""):
    """Try to fill a field, skip if not found."""
    try:
        el = page.locator(selector)
        if await el.count() > 0:
            await el.fill(str(value), timeout=3000)
        else:
            print(f"  ⚠ Field not found: {label} ({selector})")
    except Exception as e:
        print(f"  ⚠ Could not fill {label}: {e}")

async def click_next(page):
    """Click the Next Step button."""
    try:
        # Try various next button selectors
        for sel in ["button.btn-primary:has-text('Next')", "button:has-text('Next Step')", ".as-btn-next", "button[type=submit]:has-text('Next')", "button.btn-primary"]:
            btns = await page.locator(sel).all()
            for btn in btns:
                text = await btn.inner_text()
                if "next" in text.lower() or "continue" in text.lower():
                    await btn.click()
                    await page.wait_for_timeout(800)
                    return True
        print("  ⚠ No 'Next' button found, trying any primary button...")
        await page.locator("button.btn-primary").last.click()
        await page.wait_for_timeout(800)
        return True
    except Exception as e:
        print(f"  ⚠ Could not click Next: {e}")
        return False

async def simulate_lung_hold(page, hold_ms=2000, test_name=""):
    """Simulate the press-and-hold lung capacity test."""
    print(f"  🫁 Simulating lung test: {test_name} (hold {hold_ms}ms)...")
    try:
        # Find the hold button
        btn = None
        for sel in [".lung-test-btn", ".hold-btn", "button.btn-primary:has-text('Hold')", 
                    "button:has-text('Press')", ".breath-btn", "[class*='hold']", "[class*='breath']"]:
            count = await page.locator(sel).count()
            if count > 0:
                btn = page.locator(sel).first
                break
        
        if not btn:
            # Find by evaluating JS - look for the large circular button
            result = await page.evaluate("""
                () => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const holdBtn = buttons.find(b => 
                        b.textContent.toLowerCase().includes('hold') || 
                        b.textContent.toLowerCase().includes('press') ||
                        b.className.includes('hold') ||
                        b.className.includes('breath')
                    );
                    if (holdBtn) {
                        const rect = holdBtn.getBoundingClientRect();
                        return { found: true, x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
                    }
                    // If not found, look for any large button in the center
                    const allBtns = buttons.filter(b => {
                        const r = b.getBoundingClientRect();
                        return r.width > 80 && r.height > 80;
                    });
                    if (allBtns.length > 0) {
                        const r = allBtns[0].getBoundingClientRect();
                        return { found: true, x: r.x + r.width/2, y: r.y + r.height/2 };
                    }
                    return { found: false };
                }
            """)
            
            if result.get("found"):
                x, y = int(result["x"]), int(result["y"])
                await page.mouse.move(x, y)
                await page.mouse.down()
                await asyncio.sleep(hold_ms / 1000)
                await page.mouse.up()
                print(f"    ✓ Held button at ({x},{y}) for {hold_ms}ms")
                await page.wait_for_timeout(1000)
                return True
            else:
                print(f"    ⚠ Hold button not found by JS evaluation")
                return False
        else:
            box = await btn.bounding_box()
            if box:
                x = int(box["x"] + box["width"] / 2)
                y = int(box["y"] + box["height"] / 2)
                await page.mouse.move(x, y)
                await page.mouse.down()
                await asyncio.sleep(hold_ms / 1000)
                await page.mouse.up()
                print(f"    ✓ Held button for {hold_ms}ms")
                await page.wait_for_timeout(1000)
                return True
    except Exception as e:
        print(f"    ⚠ Lung hold simulation failed: {e}")
        return False

async def get_step_number(page):
    """Detect current step number from the page."""
    try:
        result = await page.evaluate("""
            () => {
                // Look for step indicator
                const stepEls = document.querySelectorAll('[class*="step"], [class*="Step"]');
                for (const el of stepEls) {
                    const txt = el.textContent.trim();
                    if (txt.match(/^\\d+$/)) return parseInt(txt);
                }
                // Check URL
                const url = window.location.href;
                const m = url.match(/step[=\\/](\\d+)/i);
                if (m) return parseInt(m[1]);
                return -1;
            }
        """)
        return result
    except:
        return -1

async def dump_step_inputs(page, step_num, output_dir):
    """Dump all inputs on current step for debugging."""
    try:
        inputs = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
                    id: el.id,
                    name: el.name,
                    type: el.type,
                    placeholder: el.placeholder,
                    tagName: el.tagName,
                    classes: el.className
                }));
            }
        """)
        print(f"  📋 Step {step_num} inputs: {inputs}")
        await page.screenshot(path=os.path.join(output_dir, f"step_{step_num:02d}.png"))
        return inputs
    except Exception as e:
        print(f"  ⚠ Could not dump step {step_num}: {e}")
        return []

async def run_assessment(profile_name="extreme", run_num=1, output_dir="."):
    """Run a full end-to-end assessment for the given profile."""
    p = PROFILES[profile_name]
    uname = f"{profile_name}_{uuid.uuid4().hex[:6]}"
    print(f"\n{'='*60}")
    print(f"🚀 Starting {profile_name.upper()} profile assessment (Run #{run_num})")
    print(f"   Username: {uname}")
    print(f"{'='*60}\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        
        # ── STEP A: SIGNUP ──────────────────────────────────────────
        print("📝 Step A: Signup...")
        await page.goto("https://breathometer6.web.app/signup")
        await page.wait_for_load_state("networkidle")
        
        await page.locator("#fname").fill(p["fname"])
        await page.locator("#lname").fill(p["lname"])
        await page.locator("#su-username").fill(uname)
        await page.locator("#dob").fill(p["dob"])
        await page.locator("#gender").select_option(p["gender"])
        await page.locator("#su-pass").fill(p["password"])
        
        # Wait for cooldown timer (button shows "Wait Xs")
        print("  ⏳ Waiting for signup button to become active...")
        for _ in range(15):
            btn_text = await page.locator("button.auth-submit").inner_text()
            if "Wait" not in btn_text:
                break
            await asyncio.sleep(1)
        
        await page.locator("button.auth-submit").click()
        
        try:
            await page.wait_for_url("**/profile-setup**", timeout=12000)
            print("  ✅ Reached profile-setup")
        except Exception as e:
            print(f"  ❌ Signup failed: {e}")
            await page.screenshot(path=os.path.join(output_dir, "signup_error.png"))
            await browser.close()
            return None
        
        # ── STEP B: PROFILE SETUP ───────────────────────────────────
        print("🧑 Step B: Profile Setup...")
        await page.locator("#age").fill(p["age"])
        await safe_select(page, "#activity_level", p["activity_level"], "activity_level")
        await page.locator("#height").fill(p["height"])
        await page.locator("#weight").fill(p["weight"])
        await safe_select(page, "#smoking_history", p["smoking_history"], "smoking_history")
        await page.locator("#respiratory_symptoms").fill(p["respiratory_symptoms"])
        await page.locator("#baseline_symptoms").fill(p["baseline_symptoms"])
        
        await page.locator("button.auth-submit").click()
        
        try:
            await page.wait_for_url("**/dashboard**", timeout=15000)
            print("  ✅ Reached dashboard")
        except Exception as e:
            print(f"  ⚠ Profile setup didn't go to dashboard directly: {page.url}")

        # ── STEP C: NAVIGATE TO ASSESSMENT ──────────────────────────
        print("🩺 Step C: Navigating to Health Assessment...")
        await page.goto("https://breathometer6.web.app/assessment")
        await page.wait_for_load_state("networkidle")
        await asyncio.sleep(1)
        
        current_url = page.url
        print(f"  Current URL: {current_url}")
        
        if "login" in current_url:
            print("  ⚠ Session expired, re-logging in...")
            await page.locator("#username").fill(uname)
            await page.locator("#password").fill(p["password"])
            await page.locator(".al-submit").click()
            await page.wait_for_url("**/dashboard**", timeout=10000)
            await page.goto("https://breathometer6.web.app/assessment")
            await page.wait_for_load_state("networkidle")
        
        # ── STEP 1: PERSONAL HEALTH METRICS ─────────────────────────
        print("📊 Assessment Step 1: Personal Health Metrics...")
        await dump_step_inputs(page, 1, output_dir)
        
        await safe_fill(page, "#age", p["s1_age"], "age")
        await safe_select(page, "select", p["s1_gender"], "gender")
        await safe_fill(page, "#height", p["s1_height"], "height")
        await safe_fill(page, "#weight", p["s1_weight"], "weight")
        await safe_fill(page, "#heartrate", p["s1_heartrate"], "heartrate")
        await safe_fill(page, "#temp", p["s1_temp"], "temperature")
        await safe_fill(page, "#spo2", p["s1_spo2"], "spo2")
        await safe_fill(page, "#bp", p["s1_bp"], "blood pressure")
        
        await click_next(page)
        await asyncio.sleep(1)
        
        # ── STEP 2: RESPIRATORY CONDITION ────────────────────────────
        print("🫁 Assessment Step 2: Respiratory Condition...")
        await dump_step_inputs(page, 2, output_dir)
        
        # Select all dropdowns in order
        selects = await page.evaluate("() => Array.from(document.querySelectorAll('select')).map(s => ({id: s.id, name: s.name, options: Array.from(s.options).map(o => o.value)}))")
        print(f"  Selects found: {selects}")
        
        select_values_extreme = [p["s2_shortness_of_breath"], p["s2_cough_duration"], 
                                  p["s2_cough_type"], p["s2_wheezing"], p["s2_cough_type"]]
        
        # Fill each select in order
        all_selects = page.locator("select.form-input")
        count = await all_selects.count()
        print(f"  Found {count} selects on Step 2")
        
        step2_values = [
            p["s2_shortness_of_breath"],
            p["s2_cough_duration"],
            p["s2_cough_type"],
            p["s2_wheezing"],
            p["s2_chest_tightness"],
        ]
        
        for i in range(min(count, len(step2_values))):
            try:
                sel = all_selects.nth(i)
                opts = await sel.evaluate("el => Array.from(el.options).map(o => o.value)")
                target = step2_values[i]
                # Find best match
                best = None
                for opt in opts:
                    if target.lower() in opt.lower() or opt.lower() in target.lower():
                        best = opt
                        break
                if best:
                    await sel.select_option(best)
                    print(f"    Select {i}: {best}")
                elif opts and len(opts) > 1:
                    # Pick last non-empty option (usually most severe)
                    non_empty = [o for o in opts if o]
                    if non_empty:
                        chosen = non_empty[-1] if profile_name == "extreme" else non_empty[len(non_empty)//2]
                        await sel.select_option(chosen)
                        print(f"    Select {i}: {chosen} (fallback)")
            except Exception as e:
                print(f"    ⚠ Select {i} failed: {e}")
        
        # Fill breathing rate
        breathing_rate_inputs = page.locator("input.form-input")
        br_count = await breathing_rate_inputs.count()
        if br_count > 0:
            await breathing_rate_inputs.last.fill(p["s2_breathing_rate"])
            print(f"  Breathing rate: {p['s2_breathing_rate']}")
        
        await click_next(page)
        await asyncio.sleep(1)
        
        # ── STEP 3: LUNG CAPACITY TEST ──────────────────────────────
        print("🫁 Assessment Step 3: Lung Capacity Test...")
        await page.screenshot(path=os.path.join(output_dir, "step_03_before.png"))
        
        # Simulate 3 hold tests in sequence
        for test_i, test_name in enumerate(["Inhale Test", "Exhale Test", "Breath Hold"], 1):
            print(f"  Test {test_i}: {test_name}")
            success = await simulate_lung_hold(page, hold_ms=p["lung_hold_ms"], test_name=test_name)
            if not success:
                # Try clicking anything that looks like a test button
                await page.screenshot(path=os.path.join(output_dir, f"step_03_test{test_i}.png"))
                print(f"    Trying direct JS dispatch for test {test_i}...")
                await page.evaluate("""
                    () => {
                        const candidates = document.querySelectorAll('button');
                        for (const btn of candidates) {
                            const rect = btn.getBoundingClientRect();
                            if (rect.width > 60 && rect.height > 60) {
                                btn.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                                setTimeout(() => btn.dispatchEvent(new MouseEvent('mouseup', {bubbles: true})), 1500);
                                return true;
                            }
                        }
                        return false;
                    }
                """)
                await asyncio.sleep(2)
            await asyncio.sleep(1)
        
        # Try clicking next after lung tests
        await click_next(page)
        await asyncio.sleep(1)
        
        # ── STEPS 4-9: REMAINING STEPS ──────────────────────────────
        for step in range(4, 10):
            current_url = page.url
            print(f"📋 Assessment Step {step} (URL: {current_url})...")
            
            await dump_step_inputs(page, step, output_dir)
            
            # Generic: fill all text inputs with moderate/extreme answers
            inputs = page.locator("input[type=text], input[type=number]")
            inp_count = await inputs.count()
            
            for i in range(inp_count):
                try:
                    inp = inputs.nth(i)
                    placeholder = await inp.get_attribute("placeholder") or ""
                    id_attr = await inp.get_attribute("id") or ""
                    input_type = await inp.get_attribute("type") or "text"
                    
                    if input_type == "number":
                        # Guess a value based on placeholder/id
                        if "city" in (placeholder + id_attr).lower():
                            await inp.fill(p.get("s4_environmental", "Mumbai"))
                        else:
                            await inp.fill("50" if profile_name == "extreme" else "70")
                    else:
                        if "city" in (placeholder + id_attr).lower():
                            await inp.fill(p.get("s4_environmental", "Mumbai"))
                        elif "medication" in (placeholder + id_attr).lower():
                            await inp.fill(p.get("s6_medications", "None"))
                        elif "allerg" in (placeholder + id_attr).lower():
                            await inp.fill(p.get("s6_allergies", "None"))
                        elif "histor" in (placeholder + id_attr).lower():
                            await inp.fill(p.get("s6_medical_history", "None"))
                        else:
                            pass  # leave blank; not critical
                except Exception as e:
                    pass
            
            # Handle selects generically
            step_selects = page.locator("select")
            sel_count = await step_selects.count()
            for i in range(sel_count):
                try:
                    sel = step_selects.nth(i)
                    opts = await sel.evaluate("el => Array.from(el.options).map(o => o.value)").catch(lambda e: [])
                    if opts and len(opts) > 1:
                        non_empty = [o for o in opts if o]
                        if non_empty:
                            # Extreme: pick last (worst), Moderate: pick middle
                            idx = -1 if profile_name == "extreme" else len(non_empty) // 2
                            await sel.select_option(non_empty[idx])
                except Exception as e:
                    pass
            
            # Handle radio/checkbox groups (e.g. yes/no questions)
            radios = page.locator("input[type=radio]")
            radio_count = await radios.count()
            if radio_count > 0:
                print(f"  Found {radio_count} radio buttons")
                for i in range(radio_count):
                    try:
                        radio = radios.nth(i)
                        val = await radio.get_attribute("value") or ""
                        if profile_name == "extreme":
                            # Pick "Yes", "Severe", "Daily", etc.
                            if any(x in val.lower() for x in ["yes", "severe", "daily", "heavy", "current"]):
                                await radio.click()
                        else:
                            # Pick "No", "Mild", "Occasionally"
                            if any(x in val.lower() for x in ["no", "mild", "occasional", "light", "never"]):
                                await radio.click()
                    except:
                        pass
            
            # Click next
            success = await click_next(page)
            await asyncio.sleep(1)
            
            # Check if we've reached results or dashboard
            url = page.url
            if "dashboard" in url or "results" in url:
                print(f"  ✅ Reached end at step {step}: {url}")
                break
        
        # ── FINAL: DASHBOARD RESULTS ─────────────────────────────────
        print("\n🎯 Waiting for results...")
        await asyncio.sleep(3)
        
        final_url = page.url
        print(f"Final URL: {final_url}")
        
        # Navigate to dashboard to see results
        if "dashboard" not in final_url:
            await page.goto("https://breathometer6.web.app/dashboard")
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)
        
        # Screenshot the dashboard
        dashboard_shot = os.path.join(output_dir, f"dashboard_{profile_name}_run{run_num}.png")
        await page.screenshot(path=dashboard_shot, full_page=True)
        print(f"  📸 Dashboard screenshot saved: {dashboard_shot}")
        
        # Extract text results
        results_text = await page.evaluate("() => document.body.innerText")
        
        # Parse key metrics
        print("\n📊 RESULTS SUMMARY:")
        import re
        for pattern, label in [
            (r"(\d+\.?\d*)\s*%", "Risk Scores"),
            (r"(High Risk|Moderate Risk|Low Risk|Extreme Risk)", "Risk Category"),
            (r"(COPD|Asthma|Pneumonia|Bronchitis|General Respiratory)", "Disease"),
        ]:
            matches = re.findall(pattern, results_text, re.I)
            if matches:
                print(f"  {label}: {', '.join(set(matches[:5]))}")
        
        await browser.close()
        return dashboard_shot

async def main():
    profile = sys.argv[1] if len(sys.argv) > 1 else "extreme"
    run_num = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    output_dir = f"e2e_results_{profile}_run{run_num}"
    os.makedirs(output_dir, exist_ok=True)
    
    result = await run_assessment(profile_name=profile, run_num=run_num, output_dir=output_dir)
    
    if result:
        print(f"\n✅ Assessment complete! Dashboard: {result}")
    else:
        print(f"\n❌ Assessment failed.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
