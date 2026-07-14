import React from 'react';
import Hero from './sections/Hero';
import Games from './sections/Games';
import CTA from './sections/CTA';

const Landing: React.FC = () => {
  return (
    <main className="w-full relative landing-canvas">
      <Hero />
      <div className="relative">
        <div className="grid-field" aria-hidden="true" />

        <div className="relative z-10">
          <Games />
          <CTA />
        </div>
      </div>
    </main>
  );
};

export default Landing;
