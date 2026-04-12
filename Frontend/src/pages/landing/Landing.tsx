import React from 'react';
import Hero from './sections/Hero';
import Games from './sections/Games';
import CTA from './sections/CTA';
import ShapeGrid from '@/components/ui/ShapeGrid';

// Design system colors for ShapeGrid
const BORDER_COLOR = '#1e2e3c';

const Landing: React.FC = () => {
  return (
    <main className="w-full">
      <Hero />
      {/* Unified Games + CTA section with shared background */}
      <div className="relative">
        {/* ShapeGrid Background Layer */}
        <div className="absolute inset-0 z-0">
          <ShapeGrid
            direction="diagonal"
            speed={0.4}
            squareSize={40}
            borderColor={BORDER_COLOR}
            hoverFillColor="rgba(212, 175, 55, 0.5)"
            shape="square"
            hoverTrailAmount={6}
          />
        </div>
        {/* Content Layer */}
        <div className="relative z-10">
          <Games />
          <CTA />
        </div>
      </div>
    </main>
  );
};

export default Landing;
