import React from 'react';
import Hero from './sections/Hero';
import Games from './sections/Games';
import CTA from './sections/CTA';
import Galaxy from '@/components/Galaxy';

const Landing: React.FC = () => {
  return (
    <main className="w-full relative landing-canvas">
      <Hero />
      <div className="relative">
        <div className="galaxy-wrap" aria-hidden="true">
          <Galaxy
            hueShift={40}
            density={1}
            glowIntensity={0.35}
            saturation={0.4}
            twinkleIntensity={0.4}
            rotationSpeed={0.05}
            starSpeed={0.4}
            speed={0.6}
            mouseInteraction={false}
            mouseRepulsion={false}
            transparent
          />
        </div>

        <div className="relative z-10">
          <Games />
          <CTA />
        </div>
      </div>
    </main>
  );
};

export default Landing;
