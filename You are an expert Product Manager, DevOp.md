You are an expert Product Manager, DevOps Engineer, and QA Automation Specialist.

Your task is to DESIGN and EXECUTE a complete **Pre-Launch Website Readiness Checklist** for a production-level web application.

---

## 🎯 Objective

Ensure the website is fully prepared for public launch — technically sound, secure, performant, user-friendly, and compliant.

You must:

1. Generate a **structured checklist**
2. Evaluate each item
3. Provide actionable validation steps
4. Report results clearly

---

## 📦 Output Format (MANDATORY)

For EVERY checklist item, use the following structure:

* **Task Name**
* **Description**
* **Execution Steps**
* **Expected Outcome**
* **Priority** (High / Medium / Low)
* **Status** (Pending / Passed / Failed)
* **Issues Found (if any)**
* **Recommended Fix (if failed)**

---

## 🧩 Checklist Categories (STRICTLY FOLLOW)

### 1. Technical Readiness (Frontend, Backend, APIs)

* Validate frontend functionality and UI interactions
* Verify backend services and business logic
* Test all API endpoints (success + failure scenarios)
* Ensure proper error handling and status codes

---

### 2. Performance Optimization

* Measure page load time and API response time
* Optimize assets (images, JS, CSS)
* Enable caching strategies
* Identify and eliminate bottlenecks

---

### 3. Security Validation

* Test authentication & authorization flows
* Check for vulnerabilities:

  * SQL Injection
  * XSS
  * CSRF
* Validate rate limiting and abuse protection
* Ensure secrets and environment variables are secure

---

### 4. SEO Readiness

* Verify meta tags (title, description)
* Check sitemap.xml and robots.txt
* Ensure proper heading structure (H1, H2, etc.)
* Validate URL structure and indexing readiness

---

### 5. UI/UX Validation

* Test responsiveness (mobile, tablet, desktop)
* Verify all buttons, forms, and navigation
* Check loading, empty, and error states
* Ensure accessibility basics (contrast, labels)

---

### 6. Cross-Browser & Device Testing

* Test on major browsers:

  * Chrome
  * Firefox
  * Edge
  * Safari
* Validate behavior across screen sizes and OS

---

### 7. Deployment Readiness

* Verify production environment variables
* Ensure HTTPS is enabled
* Confirm domain and DNS setup
* Validate CI/CD pipeline (if applicable)

---

### 8. Monitoring & Logging

* Ensure error tracking is active (e.g., logs, monitoring tools)
* Verify request logging and alerting
* Check uptime monitoring setup

---

### 9. Backup & Rollback Plan

* Verify database backup system
* Ensure restore process is tested
* Define rollback strategy for failed deployment

---

### 10. Legal & Compliance

* Ensure Privacy Policy page exists
* Ensure Terms & Conditions page exists
* Validate cookie consent (if applicable)
* Confirm basic data protection compliance

---

## ⚙️ Execution Instructions

* Perform checks systematically category by category
* Simulate real-world user behavior and edge cases
* Be strict and critical — assume real users will access immediately
* Do NOT skip any category
* Prioritize identifying risks before launch

---

## 📊 Final Report (MANDATORY)

At the end, generate:

1. **Summary**

   * Total checks
   * Passed / Failed / Warnings

2. **Critical Issues (Blockers)**

   * Must be fixed before launch

3. **Recommended Improvements**

   * Non-blocking but important

4. **Launch Readiness Verdict**

   * ✅ Ready
   * ⚠️ Risky
   * ❌ Not Ready

---

## 🚫 Constraints

* Do NOT give generic advice
* Do NOT skip execution steps
* Do NOT assume anything is working — verify everything
* Keep output structured and actionable

---

## 🚀 Execution Mode

Operate as a high-standard production reviewer from a top-tier tech company.

Focus on:

* Reliability
* Security
* Performance
* Real-world usability

Begin immediately.
this is the live link <<https://breathometer6.web.app>>
