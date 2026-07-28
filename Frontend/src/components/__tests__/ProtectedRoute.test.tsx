import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { setAuthToken } from '@/utils/authStorage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <div>Secret Account Page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no token', () => {
    renderProtected();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when a valid token is present', () => {
    setAuthToken('valid-token', true);
    renderProtected();
    expect(screen.getByText('Secret Account Page')).toBeInTheDocument();
  });

  it('redirects to /login and clears storage when the remembered session has expired', () => {
    setAuthToken('expired-token', true);
    localStorage.setItem('auth_expiry', String(Date.now() - 1000));

    renderProtected();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('redirects to /login on re-render once the session expires mid-session, without a remount', () => {
    setAuthToken('soon-to-expire-token', true);
    const { rerender } = renderProtected();
    expect(screen.getByText('Secret Account Page')).toBeInTheDocument();

    localStorage.setItem('auth_expiry', String(Date.now() - 1000));

    rerender(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <div>Secret Account Page</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
