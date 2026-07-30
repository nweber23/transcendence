import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '@/utils/api';
import { setAuthToken, setAuthUser, clearAuthStorage } from '@/utils/authStorage';
import { AUTH_TOKEN_CHANGED_EVENT, type User } from '@/hooks/useAuth';
import Logo from '@/components/ui/Logo';
import CasinoBackground from '@/components/ui/CasinoBackground';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The backend puts the token in the URL fragment (not the query string)
    // so it never hits server logs or the Referer header. Read it once and
    // strip it from the visible URL immediately.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hashParams.get('token');
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      setError('No token received from provider.');
      return;
    }

    setAuthToken(token, true);
    (async () => {
      try {
        const profile = await apiCall<User>('GET', '/user/profile');
        setAuthUser(profile);
        window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
        navigate('/account', { replace: true });
      } catch (err) {
        clearAuthStorage();
        setError(err instanceof Error ? err.message : 'Failed to complete sign-in.');
      }
    })();
  }, [navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[var(--base)]">
      <CasinoBackground />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-4">
        <Logo />
        {error ? (
          <>
            <p className="text-[var(--text)] font-medium">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="px-4 py-2 rounded-lg border border-[rgba(212,175,55,0.3)] text-[var(--text)] text-sm hover:bg-[var(--surface-2)] transition-colors"
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-[rgba(212,175,55,0.3)] border-t-[var(--gold,#d4af37)] rounded-full animate-spin" />
            <p className="text-[var(--text-2)] text-sm">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
