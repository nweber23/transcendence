import React from 'react';
import Hero from './sections/Hero';
import Games from './sections/Games';
import CTA from './sections/CTA';

const Landing: React.FC = () => {
  return (
    <main className="w-full">
      <Hero />
      <Games />
      <CTA />
    </main>
  );
};

export default Landing;
