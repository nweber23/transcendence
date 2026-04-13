import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Beams from '@/components/ui/Beams';

interface SignUpFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState<SignUpFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form validation logic would go here
  };

  const isFormValid =
    formData.username &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.agreeToTerms &&
    formData.password === formData.confirmPassword;

  return (
    <div className="min-h-screen bg-[var(--base)] flex flex-col">
      {/* Beams background */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <Beams
          beamWidth={2.5}
          beamHeight={28}
          beamNumber={18}
          lightColor="#d4af37"
          speed={1.4}
          noiseIntensity={1.6}
          scale={0.18}
          rotation={25}
        />
        {/* Dark overlay so the form stays readable */}
        <div className="absolute inset-0 bg-[rgba(10,14,18,0.72)]" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-8 pt-20">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="border border-[rgba(212,175,55,0.15)] rounded-2xl bg-[var(--surface)] p-8 md:p-10 hover:border-[rgba(212,175,55,0.25)] transition-colors duration-300">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-semibold text-[var(--text)] mb-2">
                Create Account
              </h2>
              <p className="text-sm text-[var(--text-2)]">
                Join the game and start playing in seconds
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[var(--text)] mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="your_username"
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border transition-colors text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50 ${
                    errors.username
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[rgba(212,175,55,0.1)] focus:border-[var(--gold)]'
                  }`}
                />
                {errors.username && (
                  <p className="text-xs text-red-400 mt-2">{errors.username}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border transition-colors text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50 ${
                    errors.email
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[rgba(212,175,55,0.1)] focus:border-[var(--gold)]'
                  }`}
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-2">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="text-sm font-medium text-[var(--text)]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[var(--gold)] hover:text-[var(--text)] transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border transition-colors text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50 ${
                    errors.password
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[rgba(212,175,55,0.1)] focus:border-[var(--gold)]'
                  }`}
                />
                {errors.password && (
                  <p className="text-xs text-red-400 mt-2">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--text)]">
                    Confirm Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-xs text-[var(--gold)] hover:text-[var(--text)] transition-colors"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border transition-colors text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50 ${
                    errors.confirmPassword
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[rgba(212,175,55,0.1)] focus:border-[var(--gold)]'
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400 mt-2">{errors.confirmPassword}</p>
                )}
                {formData.password &&
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-400 mt-2">Passwords do not match</p>
                  )}
              </div>

              {/* Terms & Conditions */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-[rgba(212,175,55,0.3)] bg-[var(--surface-2)] cursor-pointer accent-[var(--gold)] flex-shrink-0"
                  />
                  <span className="text-xs text-[var(--text-2)]">
                    I agree to the{' '}
                    <Link to="#" className="text-[var(--gold)] hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="#" className="text-[var(--gold)] hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                variant="gold"
                className="w-full mt-6"
                disabled={!isFormValid || isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(212,175,55,0.1)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-[var(--surface)] text-[var(--text-3)]">or sign up with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-8">
              <OAuthButton provider="Google" />
              <OAuthButton provider="GitHub" />
            </div>

            {/* Two-Factor Authentication Info */}
            <div className="bg-[var(--surface-2)] rounded-lg border border-[rgba(45,122,99,0.2)] p-4 mb-8">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-emerald-400 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-[var(--text)] mb-1">Secure Signup</p>
                  <p className="text-xs text-[var(--text-2)]">
                    Your account is protected with encryption and optional two-factor authentication
                  </p>
                </div>
              </div>
            </div>

            {/* Sign In Link */}
            <p className="text-center text-sm text-[var(--text-2)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--gold)] hover:text-[var(--text)] font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Link */}
      <footer className="text-center py-6 px-8">
        <Link to="#" className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
          Terms of Service
        </Link>
        <span className="text-[var(--text-3)] mx-2">•</span>
        <Link to="#" className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
          Privacy Policy
        </Link>
      </footer>

      {/* Decorative Glow */}
      <div className="glow-gold fixed -top-1/2 -right-1/4 w-96 h-96 pointer-events-none -z-10" />
    </div>
  );
};

// OAuth Button Component
const OAuthButton: React.FC<{ provider: string }> = ({ provider }) => {
  const renderIcon = () => {
    if (provider === 'Google') {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    }
    if (provider === 'GitHub') {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      );
    }
  };

  return (
    <button
      type="button"
      className="w-full px-4 py-3 rounded-lg border border-[rgba(212,175,55,0.15)] bg-[var(--surface-2)] text-[var(--text)] font-medium text-sm hover:border-[rgba(212,175,55,0.3)] hover:bg-[var(--surface-3)] transition-all duration-200 flex items-center justify-center gap-2"
    >
      {renderIcon()}
      Sign up with {provider}
    </button>
  );
};

export default SignUp;
