import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Landing from '@/pages/landing/Landing';
import Login from '@/pages/auth/Login';
import SignUp from '@/pages/auth/SignUp';
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

  return (
    <div className="min-h-screen bg-[var(--base)] text-[var(--text)] flex flex-col">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/games/blackjack" element={<Blackjack />} />
        <Route path="/games/poker" element={<Poker />} />
        <Route path="/games/slots" element={<SlotMachine />} />
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
