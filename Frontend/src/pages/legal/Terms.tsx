import React from 'react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
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
          <h1 className="font-serif text-4xl font-bold text-white">Terms of Service</h1>
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
              Welcome to ft_casino. By accessing and using this platform, you agree to comply with these Terms of Service. If you do not agree with any part of these terms, please do not use our service.
            </p>
          </section>

          {/* Eligibility */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Eligibility
            </h2>
            <p className="text-[var(--text-3)]">
              You must be at least 18 years old to create an account and use ft_casino. By registering, you represent that you meet this age requirement and that all information you provide is accurate.
            </p>
          </section>

          {/* Account Creation & Authentication */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Account Creation & Authentication
            </h2>
            <p className="text-[var(--text-3)]">
              You may create an account using an email address and password, or by signing in through a third-party provider such as Google or GitHub. You are responsible for maintaining the confidentiality of your login credentials, your two-factor authentication (2FA) secrets and backup codes if enabled, and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access to your account. We strongly recommend enabling 2FA for additional account security.
            </p>
          </section>

          {/* User Conduct */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              User Conduct
            </h2>
            <p className="text-[var(--text-3)] mb-3">
              When using ft_casino, you agree not to:
            </p>
            <ul className="space-y-2 text-[var(--text-3)]">
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>Harass, abuse, or discriminate against other players</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>Attempt to exploit or hack the platform</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>Use automated tools or bots to gain unfair advantage</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>Impersonate another player, including through your username or avatar</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>Upload avatar images that are illegal, infringing, or otherwise objectionable</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>Create or use multiple accounts to circumvent platform limits or abuse fictional currency</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[var(--gold)]">•</span>
                <span>Violate any applicable laws or regulations</span>
              </li>
            </ul>
          </section>

          {/* Fictional Currency & Games */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Fictional Currency & Games
            </h2>
            <p className="text-[var(--text-3)]">
              ft_casino offers Blackjack, Texas Hold'em poker, and Slots for entertainment purposes only. All currency on the platform is fictional and has no real-world value. "Deposits" and "withdrawals" only adjust the fictional balance tracked on your account &mdash; no real money, payment method, or payment processor is ever involved. You cannot exchange, cash out, or convert in-game currency into actual money.
            </p>
          </section>

          {/* Friends & Social Features */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Friends & Social Features
            </h2>
            <p className="text-[var(--text-3)]">
              ft_casino lets you send and manage friend requests and view other players' online presence in real time. Your username and avatar may be visible to other players through these features. We do not currently offer in-app chat or messaging between players.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Intellectual Property
            </h2>
            <p className="text-[var(--text-3)]">
              All content, graphics, and functionality on ft_casino are owned by us or our licensors. You may not reproduce, distribute, or modify any content without express permission.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Limitation of Liability
            </h2>
            <p className="text-[var(--text-3)]">
              ft_casino is provided "as is" without warranties of any kind. We are not liable for any indirect or consequential damages arising from your use of the platform.
            </p>
          </section>

          {/* Termination */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Termination
            </h2>
            <p className="text-[var(--text-3)]">
              We reserve the right to suspend or terminate your account if you violate these Terms of Service or engage in prohibited conduct.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[var(--text)]">
              Changes to Terms
            </h2>
            <p className="text-[var(--text-3)]">
              We may update these Terms of Service at any time. Continued use of ft_casino following such changes constitutes your acceptance of the updated terms.
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

export default Terms;
