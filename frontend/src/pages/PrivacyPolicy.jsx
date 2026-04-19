import React from "react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 sm:p-12 border border-slate-200">
        <Link to="/" className="text-blue-600 font-medium mb-8 inline-block hover:underline">
          &larr; Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Privacy Policy</h1>
        <p className="text-slate-500 mb-8">Last Updated: April 2026</p>
        
        <div className="space-y-6 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Information We Collect</h2>
            <p>
              We collect information that you directly provide to us, including your name, email address, password, age, gender, biometrics (such as height and weight), lifestyle factors (such as smoking status and activity level), medical history, and breath analysis data. We also automatically collect certain information about your device and how you interact with our platform, such as IP addresses, browser types, and usage data to improve service reliability and security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. How We Use Your Information</h2>
            <p>
              The primary purpose of collecting your data is to provide, maintain, and optimize the Breathometer services. Specifically, your health and biomarker data are processed by our artificial intelligence algorithms to generate personalized respiratory risk assessments. Additionally, your data may be shared with healthcare professionals within the platform solely at your explicit direction and consent for the purpose of clinical review and tele-health consultation. We may also use aggregated, de-identified data for research and development to improve our AI models.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Data Storage and Security (HIPAA Compliance)</h2>
            <p>
              We employ robust administrative, physical, and technical safeguards designed to protect your personal and health information against unauthorized access, destruction, or alteration. We adhere to standards consistent with the Health Insurance Portability and Accountability Act (HIPAA) applicable to our role as a technology provider. All data transmissions are encrypted via SSL/TLS, and data at rest is securely encrypted in our private cloud databases. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Information Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or rent your personal identifiable information or health data to third parties. We may share your information with trusted third-party service providers (such as hosting and database providers) who assist us in operating our platform, so long as those parties agree to keep this information confidential and comply with applicable healthcare data privacy regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Your Data Rights and Choices</h2>
            <p>
              You maintain full ownership of your data. Depending on your jurisdiction, you have the right to access, correct, transport, or request the deletion of your personal and health information. You may initiate a data deletion request by contacting our support team. Upon verification, we will irrevocably delete your identifiable account records from our active systems, except for data we are legally obligated to retain.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, your rights, or our data handling practices, please contact our Data Protection Officer at breathometer@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
