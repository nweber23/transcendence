import React from 'react';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[var(--base)] text-[var(--text)]">
      {/* Header Banner */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-[var(--gold)] hover:text-[var(--text)] transition-colors duration-200 mb-6"
          >
            <span>←</span>
            <span className="text-sm">Back</span>
          </button>
          <h1 className="font-serif text-4xl font-bold text-white">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {/* Last Updated */}
          <p className="text-sm text-[var(--text-3)]">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          {/* Introduction */}
          <section className="space-y-4">
            <p className="text-[var(--text-2)]">
              At Transcendence, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Information We Collect
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-sans font-semibold text-[var(--text-2)] mb-2">
                  Account Information
                </h3>
                <p className="text-[var(--text-3)]">
                  When you create an account, we collect your email address, username, and password.
                </p>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-[var(--text-2)] mb-2">
                  Game Activity
                </h3>
                <p className="text-[var(--text-3)]">
                  We collect information about your gameplay, including game statistics and in-game currency transactions.
                </p>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-[var(--text-2)] mb-2">
                  Technical Information
                </h3>
                <p className="text-[var(--text-3)]">
                  We automatically collect information about your device, browser, and IP address to improve platform functionality.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Data */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              How We Use Your Data
            </h2>
            <ul className="space-y-2 text-[var(--text-3)]">
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>To provide and maintain your account</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>To improve platform performance and user experience</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>To communicate with you about updates and support</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>To prevent fraud and ensure security</span>
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Data Security
            </h2>
            <p className="text-[var(--text-3)]">
              We implement appropriate security measures to protect your personal data. However, no method of transmission over the internet is completely secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Your Rights
            </h2>
            <p className="text-[var(--text-3)]">
              You have the right to access, update, or delete your personal data at any time. To exercise these rights, please contact us through your account settings.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Contact Us
            </h2>
            <p className="text-[var(--text-3)]">
              If you have any questions about this Privacy Policy, please reach out through our support channels in your account.
            </p>
          </section>

          {/* Disclaimer */}
          <div className="mt-12 pt-8 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-3)]">
              All currency and transactions on Transcendence are fictional and have no real-world value.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Privacy;
