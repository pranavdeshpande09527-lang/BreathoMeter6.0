import React from "react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 sm:p-12 border border-slate-200">
        <Link to="/" className="text-blue-600 font-medium mb-8 inline-block hover:underline">
          &larr; Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Terms of Service</h1>
        <p className="text-slate-500 mb-8">Last Updated: April 2026</p>
        
        <div className="space-y-6 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing, registering for, or utilizing the Breathometer application ("Service"), you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions outlined herein, you may not access or use the platform. Use of this Service constitutes a binding legal agreement between you and Breathometer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Important Medical Disclaimer</h2>
            <p>
              <strong>Breathometer is an informational technology platform powered by artificial intelligence. It is NOT a medical device, nor a substitute for professional medical advice, diagnosis, or treatment.</strong> The predictive risk scores, biomarker evaluations, and insights provided by the application are for educational and preliminary screening purposes only. Always seek the advice of your physician or other qualified health provider with any questions regarding a medical condition or respiratory symptom. Never disregard professional medical advice or delay seeking it because of information accessed on this platform. In the event of a medical emergency, immediately call your local emergency services or visit the nearest hospital.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. User Responsibilities & Account Security</h2>
            <p>
              When creating an account, you must provide accurate, complete, and current information. You are solely responsible for safeguarding the password and credentials used to access the Service. You agree not to disclose your password to any third party and to notify us immediately upon becoming aware of any breach of security or unauthorized use of your account. You may not use the Service for any illegal, abusive, or unauthorized purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall Breathometer, its directors, employees, partners, agents, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation: loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party or medical professional accessed through the Service; (iii) any technological errors, inaccuracies, or misinterpretations arising from the AI prediction models; or (iv) unauthorized access, use, or alteration of your transmissions or content.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Breathometer explicitly disclaims all warranties, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance. We do not warrant that the Service will function uninterrupted, perfectly secure, or be available at any particular time or location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Modifications to the Service and Terms</h2>
            <p>
              We reserve the right to modify or discontinue the Service at any time. We may also revise these Terms of Service periodically. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you must stop using the Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
