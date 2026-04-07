import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Landing from '@/pages/landing/Landing';
import Login from '@/pages/auth/Login';
import SignUp from '@/pages/auth/SignUp';
import Blackjack from '@/pages/games/Blackjack';
import Poker from '@/pages/games/Poker';
import '@/styles/globals.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--base)] text-[var(--text)] flex flex-col">
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/games/blackjack" element={<Blackjack />} />
          <Route path="/games/poker" element={<Poker />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
