import React, { useEffect } from 'react';

import { connectWebSocket, disconnectWebSocket } from '@/utils/wsClient';
import { AUTH_TOKEN_CHANGED_EVENT } from '@/hooks/useAuth';
import { getAuthToken } from '@/utils/authStorage';

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import Landing from '@/pages/landing/Landing';
import Login from '@/pages/auth/Login';
import SignUp from '@/pages/auth/SignUp';
import OAuthCallback from '@/pages/auth/OAuthCallback';
import Account from '@/pages/Account';
import ProfilePage from '@/pages/account/ProfilePage';
import Blackjack from '@/pages/games/Blackjack';
import PokerLobby from '@/pages/games/PokerLobby';
import PokerTable from '@/pages/games/PokerTable';
import SlotMachine from '@/pages/games/SlotMachine';
import Privacy from '@/pages/legal/Privacy';
import Terms from '@/pages/legal/Terms';
import { NotFound } from '@/pages/errors/NotFound';
import { AccessDenied } from '@/pages/errors/AccessDenied';
import { ServerError } from '@/pages/errors/ServerError';
import '@/styles/globals.css';

// Inner component so useLocation can access the router context
const AppLayout: React.FC = () => {
  const { pathname } = useLocation();
  const showFooter = pathname === '/';
  const hideHeader = pathname === '/login' || pathname === '/signup' || pathname === '/auth/callback';

  useEffect(() => {
    const syncConnection = () => {
      const token = getAuthToken();
      if (token == null) {
        disconnectWebSocket();
      } else {
        connectWebSocket(token);
      }
    };
    syncConnection();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncConnection);
    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncConnection);
      disconnectWebSocket();
    };
  }, [])

  return (
    <div className="min-h-screen bg-[var(--base)] text-[var(--text)] flex flex-col">
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/blackjack"
          element={
            <ProtectedRoute>
              <Blackjack />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/poker"
          element={
            <ProtectedRoute>
              <PokerLobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/poker/:tableId"
          element={
            <ProtectedRoute>
              <PokerTable />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/slots"
          element={
            <ProtectedRoute>
              <SlotMachine />
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/403" element={<AccessDenied />} />
        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showFooter && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
