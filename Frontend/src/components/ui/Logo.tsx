import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  /** Width & height in px. Default: 24 */
  size?: number;
}

/**
 * ft_casino brand mark — brilliant-cut diamond, side profile.
 *
 * Four-tone gold construction (highlight → base → mid → shadow)
 * tuned for the dark surface. Single mark; pair with the Playfair
 * wordmark "FT_CASINO" in the header.
 */
const Logo: React.FC<LogoProps> = ({ size = 24, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="ft_casino"
    {...rest}
  >
    {/* crown */}
    <polygon points="14,24 50,24 44,16 20,16" fill="#f0d36a" />
    {/* table */}
    <polygon points="20,16 44,16 38,12 26,12" fill="#d4af37" />
    {/* girdle */}
    <rect x="14" y="24" width="36" height="2" fill="#7a6020" />
    {/* pavilion */}
    <polygon points="14,26 50,26 32,52" fill="#b89230" />
    <polygon points="14,26 32,26 32,52" fill="#d4af37" />
    <polygon points="32,26 50,26 32,52" fill="#7a6020" />
    {/* pavilion center line */}
    <line x1="32" y1="26" x2="32" y2="52" stroke="#0f1419" strokeWidth="0.5" />
    {/* inner pavilion glow */}
    <polygon
      points="22,26 42,26 32,46"
      fill="none"
      stroke="#f0d36a"
      strokeWidth="0.5"
      opacity="0.6"
    />
    {/* crown edges */}
    <g stroke="#0f1419" strokeWidth="0.4" opacity="0.6">
      <line x1="14" y1="24" x2="20" y2="16" />
      <line x1="50" y1="24" x2="44" y2="16" />
      <line x1="26" y1="12" x2="20" y2="16" />
      <line x1="38" y1="12" x2="44" y2="16" />
    </g>
  </svg>
);

export default Logo;
