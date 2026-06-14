import React from 'react';

import { createWebSocket } from '@/utils/ws';

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import Landing from '@/pages/landing/Landing';
import Login from '@/pages/auth/Login';
import SignUp from '@/pages/auth/SignUp';
import Account from '@/pages/Account';
import Blackjack from '@/pages/games/Blackjack';
import Poker from '@/pages/games/Poker';
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
  const hideHeader = pathname === '/login' || pathname === '/signup';

  const token = localStorage.getItem('auth_token')
  if(token != null) {
    const socket = createWebSocket(token, ["generic"])
    socket.onopen = (e) => {
      console.log("Connection established");
    }
    socket.onmessage = (e) => {
      console.log("Message: " + e.data);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--base)] text-[var(--text)] flex flex-col">
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
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
              <Poker />
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
      <AppLayout />
    </BrowserRouter>
  );
};

export default App;
