import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';
import CasinoBackground from '@/components/ui/CasinoBackground';
import Beams from '@/components/ui/Beams';

interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error: authError, token } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate('/account');
    }
  }, [token, navigate]);

  const [showPassword, setShowPassword] = useState(false);

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
    // Also clear submit error when user modifies form
    if (errors.submit) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.submit;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await login(formData.username, formData.password);
      navigate('/account');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setErrors({ submit: errorMessage });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <CasinoBackground />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }} aria-hidden="true">
        <Beams
          beamWidth={2.5}
          beamHeight={28}
          beamNumber={18}
          lightColor="#d4af37"
          speed={1.9}
          noiseIntensity={1.6}
          scale={0.18}
          rotation={25}
        />
        <div className="absolute inset-0 bg-[rgba(10,14,18,0.55)]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-8 py-8 pt-20">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="border border-[rgba(212,175,55,0.15)] rounded-2xl bg-[var(--surface)] p-8 md:p-10 hover:border-[rgba(212,175,55,0.25)] transition-colors duration-300">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="font-serif text-2xl font-semibold text-[var(--text)] mb-2">
                Welcome Back
              </h2>
              <p className="text-sm text-[var(--text-2)]">
                Sign in to your account to continue playing
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 mb-8">
              {errors.submit && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                  {errors.submit}
                </div>
              )}

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
                  placeholder="your username"
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border input-focus-transition text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50 ${
                    errors.username
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-[rgba(212,175,55,0.1)] focus:border-[var(--gold)]'
                  }`}
                />
                {errors.username && (
                  <p className="text-xs text-red-400 mt-2">{errors.username}</p>
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
                    aria-label={`${showPassword ? 'Hide' : 'Show'} password`}
                    aria-pressed={showPassword}
                    className="text-xs text-[var(--gold)] hover:text-[var(--text)] transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border input-focus-transition text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50 ${
                      errors.password
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-[rgba(212,175,55,0.1)] focus:border-[var(--gold)]'
                    }`}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-2">{errors.password}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-[rgba(212,175,55,0.3)] bg-[var(--surface-2)] cursor-pointer accent-[var(--gold)]"
                  />
                  <span className="text-sm text-[var(--text-2)]">Remember me</span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                variant="gold"
                className="w-full mt-6"
                disabled={isLoading || !formData.username || !formData.password}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-[var(--text-2)]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[var(--gold)] hover:text-[var(--text)] font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Link */}
      <footer className="relative z-10 text-center py-6 px-8">
        <Link to="/terms" className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
          Terms of Service
        </Link>
        <span className="text-[var(--text-3)] mx-2">•</span>
        <Link to="/privacy" className="text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
          Privacy Policy
        </Link>
      </footer>

      {/* Decorative Glow */}
      <div className="glow-gold fixed -top-1/2 -right-1/4 w-96 h-96 pointer-events-none -z-10" />
    </div>
  );
};

export default Login;
