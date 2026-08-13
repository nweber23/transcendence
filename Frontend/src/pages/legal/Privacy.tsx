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
              At ft_casino, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
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
                  When you create an account, we collect your email address, username, and password (stored as a salted hash, never in plain text). If you sign in through a third-party provider such as Google or GitHub, we receive the basic profile information (such as your name and email address) needed to create and link your account. If you enable two-factor authentication (2FA), we store your 2FA secret and backup codes to secure your account.
                </p>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-[var(--text-2)] mb-2">
                  Avatar Images
                </h3>
                <p className="text-[var(--text-3)]">
                  You may upload an avatar image or import one from a URL. Uploaded images are validated and stored on our servers and may be publicly visible to other players.
                </p>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-[var(--text-2)] mb-2">
                  Game Activity
                </h3>
                <p className="text-[var(--text-3)]">
                  We collect information about your gameplay, including game statistics and fictional in-game currency transactions (deposits, withdrawals, wagers, and balances).
                </p>
              </div>
              <div>
                <h3 className="font-sans font-semibold text-[var(--text-2)] mb-2">
                  Social & Presence Information
                </h3>
                <p className="text-[var(--text-3)]">
                  We collect information related to friend requests and connections, and your online/offline presence, which may be visible to other players in real time.
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
                <span>To deliver in-app notifications about friend requests, games, and account activity</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>To show your online presence, friend connections, and avatar to other players</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>To generate internal, aggregated analytics on platform and game activity</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>To prevent fraud and ensure security</span>
              </li>
            </ul>
          </section>

          {/* Sessions & Local Storage */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Sessions & Local Storage
            </h2>
            <p className="text-[var(--text-3)]">
              ft_casino uses signed authentication tokens (JWTs) instead of tracking cookies. Depending on whether you choose "remember me" at login, this token is stored in your browser's local storage or session storage to keep you signed in. We do not use third-party advertising or analytics tracking scripts.
            </p>
          </section>

          {/* Third-Party Services */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Third-Party Services
            </h2>
            <p className="text-[var(--text-3)]">
              If you choose to sign in with Google or GitHub, those providers process your authentication on their own platforms according to their respective privacy policies. We only receive the minimal profile information needed to create and link your account.
            </p>
          </section>

          {/* Data Security */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Data Security
            </h2>
            <p className="text-[var(--text-3)]">
              Passwords are hashed and never stored in plain text, and connections to ft_casino are encrypted in transit. We offer optional two-factor authentication (2FA) as an additional layer of account protection. However, no method of transmission or storage over the internet is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Your Rights
            </h2>
            <p className="text-[var(--text-3)]">
              You have the right to access, correct, or request deletion of your personal data. ft_casino does not currently offer self-service account deletion or data export tools; to exercise these rights, please contact us directly using the details below.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Contact Us
            </h2>
            <p className="text-[var(--text-3)]">
              If you have any questions about this Privacy Policy or wish to exercise your data rights, please reach out to the ft_casino team directly, as we do not currently send or receive email through the platform itself.
            </p>
          </section>

          {/* Disclaimer */}
          <div className="mt-12 pt-8 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-3)]">
              All currency and transactions on ft_casino are fictional and have no real-world value.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Privacy;
