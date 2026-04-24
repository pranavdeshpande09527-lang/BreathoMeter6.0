import { test, expect } from '@playwright/test';

const API_BASE = 'https://breathometer6-0.onrender.com';
test.describe('Breathometer Clinical Scenarios', () => {
  // Login and setup state before each test
  test.beforeEach(async ({ page, request }) => {
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        console.log(`[API Error] ${response.status()} ${response.url()}`);
        try {
          const body = await response.text();
          console.log(`[API Error Body]`, body);
        } catch (e) { }
      }
    });

    // Generate unique user per test to avoid parallel registration conflicts
    const TEST_USER = {
      username: `e2e_user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      password: 'Password123!',
      full_name: 'E2E Test User',
      role: 'patient',
      date_of_birth: '1990-01-01',
      gender: 'Other'
    };

    // 1. Create a fresh test user
    const signupRes = await request.post(`${API_BASE}/auth/signup`, {
      data: TEST_USER
    });
    
    let token = '';
    let userData = {};
    
    if (signupRes.status() === 200 || signupRes.status() === 201) {
      const json = await signupRes.json();
      token = json.session?.access_token || json.access_token;
      userData = json.session?.user || json.user;
    } else {
      // If it exists, login (should rarely happen now with unique names)
      const loginRes = await request.post(`${API_BASE}/auth/login`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: `username=${TEST_USER.username}&password=${TEST_USER.password}`
      });
      const json = await loginRes.json();
      token = json.access_token;
      userData = { id: json.user_id, role: 'patient' };
    }

    // 2. Set tokens in localStorage and sessionStorage so App.jsx considers us logged in
    await page.goto('/'); // go to root first to establish domain
    await page.evaluate(({token, userData}) => {
      localStorage.setItem('supabase_token', token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      sessionStorage.setItem('supabase_token', token);
      sessionStorage.setItem('user_data', JSON.stringify(userData));
    }, {token, userData});

    // 3. Go to Assessment
    await page.goto('/assessment');
  });

  test('Test Case 1: Strong Match (Single Mode)', async ({ page }) => {
    // Step 1: Personal
    await page.fill('#age', '65');
    await page.locator('select').nth(0).selectOption('Male');
    await page.click('button:has-text("Next")');

    // Step 2: Respiratory Symptoms
    await page.locator('select').nth(0).selectOption('Even while resting');
    await page.locator('select').nth(1).selectOption('> 3 weeks');
    await page.locator('select').nth(2).selectOption('Persistent cough');
    await page.locator('select').nth(3).selectOption('Constantly');
    await page.locator('select').nth(4).selectOption('Severe frequent episodes');
    await page.click('button:has-text("Next")');

    // Step 3: Activity & Sleep
    await page.click('button:has-text("Next")');

    // Step 4: Symptom Details (Duration & Severity)
    await page.locator('#breathlessnessSev').fill('5'); 
    await page.locator('#breathlessnessSevDays').fill('30'); 
    await page.locator('#coughSev').fill('5');
    await page.locator('#coughSevDays').fill('30');
    await page.click('button:has-text("Next")');

    // Step 5: Medical History
    await page.click('button:has-text("Next")');

    // Step 6: Lifestyle
    await page.locator('label').filter({ hasText: /^Current$/ }).click();
    await page.fill('#cigarettes', '20');
    await page.fill('#smokingYears', '30');
    await page.click('button:has-text("Next")');

    // Step 7: Environment
    await page.fill('#city', 'New Delhi');
    await page.click('button:has-text("Next")');

    // Step 8: Medication
    await page.click('button:has-text("Next")');

    // Step 9: Daily Impact & Submit
    await page.click('button:has-text("Submit Assessment")');

    // Wait for Results Page
    await expect(page).toHaveURL(/\/assessment-results/, { timeout: 30000 });
    
    // Check for Single Mode Indicators
    await expect(page.locator('text=Most Likely Condition')).toBeVisible({ timeout: 30000 });
  });

  test('Test Case 2: Partial Match (Multi Mode)', async ({ page }) => {
    // Step 1
    await page.fill('#age', '30');
    await page.locator('select').nth(0).selectOption('Female');
    await page.click('button:has-text("Next")');

    // Step 2: Ambiguous Symptoms
    await page.locator('select').nth(0).selectOption('During intense exercise');
    await page.locator('select').nth(1).selectOption('3–7 days');
    await page.locator('select').nth(2).selectOption('Occasional cough');
    await page.click('button:has-text("Next")');

    // Skip to Step 9
    for(let i=0; i<6; i++) {
      await page.click('button:has-text("Next")');
    }

    // Submit
    await page.click('button:has-text("Submit Assessment")');

    // Wait for Results Page
    await expect(page).toHaveURL(/\/assessment-results/, { timeout: 30000 });
    
    // Check for Multi Mode Indicators
    await expect(page.locator('text=multiple possibilities').first()).toBeVisible({ timeout: 30000 });
  });

  test('Test Case 3: No Match (Healthy)', async ({ page }) => {
    // Step 1
    await page.fill('#age', '25');
    await page.locator('select').nth(0).selectOption('Male');
    await page.click('button:has-text("Next")');

    // Step 2: No Symptoms
    await page.locator('select').nth(0).selectOption('Never');
    await page.locator('select').nth(1).selectOption('No cough');
    await page.locator('select').nth(3).selectOption('Never');
    await page.locator('select').nth(4).selectOption('Never');
    await page.click('button:has-text("Next")');

    // Skip to Step 9
    for(let i=0; i<6; i++) {
      await page.click('button:has-text("Next")');
    }

    // Submit
    await page.click('button:has-text("Submit Assessment")');

    // Wait for Results Page
    await expect(page).toHaveURL(/\/assessment-results/, { timeout: 30000 });
    
    // Check for No Match Indicators
    await expect(page.locator('text=No significant respiratory risks detected').or(page.locator('text=Healthy'))).toBeVisible({ timeout: 30000 });
  });
});
