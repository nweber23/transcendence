interface GameIconProps {
  width?: number;
  height?: number;
  className?: string;
}

const animationStyles = `
  @keyframes cardFlip {
    0% { transform: rotateY(0deg) rotateZ(-9deg); }
    50% { transform: rotateY(90deg) rotateZ(-9deg); }
    100% { transform: rotateY(0deg) rotateZ(-9deg); }
  }

  @keyframes cardTilt {
    0% { transform: rotateZ(7deg); }
    25% { transform: rotateZ(-5deg); }
    75% { transform: rotateZ(7deg); }
    100% { transform: rotateZ(7deg); }
  }

  @keyframes spinSlots {
    0% { transform: translateY(0px); }
    100% { transform: translateY(-20px); }
  }

  @keyframes chipSpin {
    0% {
      transform: rotateZ(0deg);
      filter: drop-shadow(0 0 0 rgba(212,175,55,0));
    }
    100% {
      transform: rotateZ(360deg);
      filter: drop-shadow(0 0 8px rgba(212,175,55,0.5));
    }
  }

  @keyframes slotReel1 {
    0% { transform: translateY(-25px); opacity: 0; }
    33% { transform: translateY(0px); opacity: 1; }
    100% { transform: translateY(0px); opacity: 1; }
  }

  @keyframes slotReel2 {
    0% { transform: translateY(-25px); opacity: 0; }
    33% { transform: translateY(-25px); opacity: 0; }
    66% { transform: translateY(0px); opacity: 1; }
    100% { transform: translateY(0px); opacity: 1; }
  }

  @keyframes slotReel3 {
    0% { transform: translateY(-25px); opacity: 0; }
    66% { transform: translateY(-25px); opacity: 0; }
    100% { transform: translateY(0px); opacity: 1; }
  }

  svg:hover .animated-card-back {
    animation: cardFlip 0.8s ease-in-out 1 forwards;
    transform-origin: center;
    will-change: transform;
  }

  svg:hover .animated-card-front {
    animation: cardTilt 0.8s ease-in-out 1 forwards;
    will-change: transform;
  }

  svg:hover .slot-reel-1 {
    animation: slotReel1 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1 forwards;
    will-change: transform;
  }

  svg:hover .slot-reel-2 {
    animation: slotReel2 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1 forwards;
    will-change: transform;
  }

  svg:hover .slot-reel-3 {
    animation: slotReel3 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1 forwards;
    will-change: transform;
  }

  svg:hover .animated-chip {
    animation: chipSpin 0.6s ease-out 1 forwards;
    will-change: transform;
  }
`;

// Inject animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationStyles;
  document.head.appendChild(style);
}

export const BlackjackIcon: React.FC<GameIconProps> = ({
  width = 120,
  height = 100,
  className = '',
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ perspective: '1000px' }}
  >
    {/* Back card */}
    <g className="animated-card-back">
      <rect
        x="14"
        y="14"
        width="52"
        height="72"
        rx="5"
        fill="#0C2619"
        stroke="rgba(212,175,55,0.28)"
        strokeWidth="1"
      />
    </g>
    {/* Front card */}
    <g className="animated-card-front">
      <rect
        x="54"
        y="14"
        width="52"
        height="72"
        rx="5"
        fill="#112E1E"
        stroke="rgba(212,175,55,0.55)"
        strokeWidth="1"
      />
      {/* Ace */}
      <text
        x="80"
        y="57"
        fontSize="28"
        textAnchor="middle"
        fill="rgba(212,175,55,0.82)"
        fontFamily="Georgia,serif"
        fontWeight="700"
      >
        A
      </text>
      {/* Small corner label */}
      <text
        x="62"
        y="29"
        fontSize="11"
        textAnchor="middle"
        fill="rgba(212,175,55,0.45)"
        fontFamily="Georgia,serif"
      >
        A
      </text>
    </g>
  </svg>
);

export const PokerIcon: React.FC<GameIconProps> = ({
  width = 120,
  height = 100,
  className = '',
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <g className="animated-chip">
      {/* Chip outer ring */}
      <circle
        cx="60"
        cy="50"
        r="34"
        fill="#0B1B2B"
        stroke="rgba(212,175,55,0.38)"
        strokeWidth="1.5"
      />
      {/* Chip inner ring */}
      <circle
        cx="60"
        cy="50"
        r="25"
        fill="none"
        stroke="rgba(212,175,55,0.2)"
        strokeWidth="1"
      />
      {/* Chip dash marks */}
      <circle
        cx="60"
        cy="50"
        r="34"
        fill="none"
        stroke="rgba(212,175,55,0.22)"
        strokeWidth="6"
        strokeDasharray="7 7"
        strokeDashoffset="3"
      />
      {/* Diamond center */}
      <polygon points="60,36 70,50 60,64 50,50" fill="rgba(212,175,55,0.72)" />
    </g>
  </svg>
);

export const SlotsIcon: React.FC<GameIconProps> = ({
  width = 120,
  height = 100,
  className = '',
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Machine body */}
    <rect
      x="14"
      y="20"
      width="92"
      height="60"
      rx="6"
      fill="#1C0B14"
      stroke="rgba(212,175,55,0.28)"
      strokeWidth="1"
    />
    {/* Three reels */}
    <rect
      x="22"
      y="30"
      width="22"
      height="40"
      rx="3"
      fill="#10060D"
      stroke="rgba(212,175,55,0.32)"
      strokeWidth="1"
    />
    <rect
      x="49"
      y="30"
      width="22"
      height="40"
      rx="3"
      fill="#10060D"
      stroke="rgba(212,175,55,0.5)"
      strokeWidth="1.25"
    />
    <rect
      x="76"
      y="30"
      width="22"
      height="40"
      rx="3"
      fill="#10060D"
      stroke="rgba(212,175,55,0.32)"
      strokeWidth="1"
    />

    {/* Animated reel numbers - flying in 1 by 1 */}
    <g className="slot-reel-1">
      <text
        x="33"
        y="57"
        fontSize="17"
        textAnchor="middle"
        fill="rgba(212,175,55,0.58)"
        fontFamily="Georgia,serif"
        fontWeight="700"
      >
        7
      </text>
    </g>
    <g className="slot-reel-2">
      <text
        x="60"
        y="57"
        fontSize="17"
        textAnchor="middle"
        fill="rgba(212,175,55,0.95)"
        fontFamily="Georgia,serif"
        fontWeight="700"
      >
        7
      </text>
    </g>
    <g className="slot-reel-3">
      <text
        x="87"
        y="57"
        fontSize="17"
        textAnchor="middle"
        fill="rgba(212,175,55,0.58)"
        fontFamily="Georgia,serif"
        fontWeight="700"
      >
        7
      </text>
    </g>

    {/* Payline */}
    <line
      x1="14"
      y1="50"
      x2="106"
      y2="50"
      stroke="rgba(212,175,55,0.18)"
      strokeWidth="1"
      strokeDasharray="4 3"
    />
  </svg>
);
