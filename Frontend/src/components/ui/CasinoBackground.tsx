import { FC } from 'react';

const svgPattern = encodeURIComponent(
  `<svg width="28" height="28" xmlns="http://www.w3.org/2000/svg">
    <polygon points="14,0.3 27.7,14 14,27.7 0.3,14" fill="none" stroke="#d4af37" stroke-width="0.35"/>
  </svg>`
);

const CasinoBackground: FC = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
    {/* Deep radial base — lighter in center, darkens at edges */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 90% 80% at 50% 30%, #14202e 0%, #0c1018 55%, #070a0d 100%)',
      }}
    />

    {/* Diamond lattice — barely visible gold geometry */}
    <div
      className="absolute inset-0"
      style={{
        opacity: 0.045,
        backgroundImage: `url("data:image/svg+xml,${svgPattern}")`,
        backgroundRepeat: 'repeat',
      }}
    />

    {/* Primary gold glow — slow drift */}
    <div
      className="absolute inset-0 casino-glow-primary"
      style={{
        background:
          'radial-gradient(ellipse 60% 50% at 50% 15%, rgba(212,175,55,0.1) 0%, transparent 70%)',
      }}
    />

    {/* Secondary emerald glow — opposing corner, very faint */}
    <div
      className="absolute inset-0 casino-glow-secondary"
      style={{
        background:
          'radial-gradient(ellipse 50% 40% at 15% 85%, rgba(45,122,99,0.06) 0%, transparent 65%)',
      }}
    />

    {/* Edge vignette — frames content */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(ellipse 115% 115% at 50% 50%, transparent 40%, rgba(4,7,10,0.7) 100%)',
      }}
    />
  </div>
);

export default CasinoBackground;
