import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Landing from '@/pages/landing/Landing';
import '@/styles/globals.css';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--base)] text-[var(--text)] flex flex-col">
      <Header />
      <Landing />
      <Footer />
    </div>
  );
};

export default App;
