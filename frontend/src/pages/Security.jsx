import React from "react";
import { Link } from "react-router-dom";

export default function Security() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 sm:p-12 border border-slate-200">
        <Link to="/" className="text-blue-600 font-medium mb-8 inline-block hover:underline">
          &larr; Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Security Practices</h1>
        <p className="text-slate-500 mb-8">Last Updated: April 2026</p>
        
        <div className="space-y-6 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Data Encryption</h2>
            <p>
              Security is our core priority. All patient and session data is encrypted at rest and in transit. We use industry-standard AES-256 for data stored on our servers and TLS 1.3 for all data transmitted between your device and our platform, ensuring that unauthorized parties cannot intercept your personal health information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Authentication and Access Control</h2>
            <p>
              Access to your health data is strictly controlled. We employ rigorous authentication practices, and support role-based access mechanisms to separate patient data from our support staff. Only authorized doctors with explicit permission can access your clinical reports.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Continuous Monitoring</h2>
            <p>
              Our infrastructure is continuously monitored for anomalous behavior and potential security threats. We conduct automated vulnerability scanning, log monitoring, and proactive threat detection strategies to safeguard platform integrity 24/7.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. HIPAA Compliance Focus</h2>
            <p>
              We implement technical and physical safeguards intended to comply with HIPAA guidelines, providing you with peace of mind. Regular audits and architectural reviews help ensure that our healthcare tech stack maintains compliance standards while processing sensitive biometric metrics and predictive diagnoses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Finding a Vulnerability</h2>
            <p>
              We welcome reports from the security community. If you discover a security vulnerability in our systems, please report it immediately to breathometer@gmail.com. We operate a responsible disclosure policy and are committed to resolving significant issues promptly.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
