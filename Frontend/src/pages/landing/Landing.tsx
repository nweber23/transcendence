import React from 'react';
import Hero from './sections/Hero';
import Games from './sections/Games';
import CTA from './sections/CTA';
import ShapeGrid from '@/components/ui/ShapeGrid';

const BORDER_COLOR = '#1e2e3c';

const Landing: React.FC = () => {
  return (
    <main className="w-full relative landing-canvas">
      {/* ShapeGrid background layer spans the full page — one continuous canvas from hero to CTA */}
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

      {/* pointer-events-none lets mouse events reach the ShapeGrid canvas below;
          any new interactive element added under Hero/Games/CTA must opt back in
          with pointer-events-auto or it will be unclickable. */}
      <div className="relative z-10 pointer-events-none">
        <Hero />
        <Games />
        <CTA />
      </div>
    </main>
  );
};

export default Landing;
