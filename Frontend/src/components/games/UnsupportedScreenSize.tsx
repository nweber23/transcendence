import React from 'react';

interface UnsupportedScreenSizeProps {
  title?: string;
  subtitle?: string;
}

const UnsupportedScreenSize: React.FC<UnsupportedScreenSizeProps> = ({
  title = 'Screen Too Small',
  subtitle = 'This game is best enjoyed on a larger display. Please use a laptop or desktop to play.',
}) => {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-5 bg-[var(--base)]">
      <div className="text-center max-w-md">
        {/* Decorative element */}
        <div className="flex items-center justify-center gap-2 mb-6 opacity-60">
          <span className="text-[rgba(212,175,55,0.6)] text-lg leading-none">◆</span>
          <span className="text-[rgba(212,175,55,0.6)] text-lg leading-none">◆</span>
          <span className="text-[rgba(212,175,55,0.6)] text-lg leading-none">◆</span>
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl text-[var(--gold)] mb-4 tracking-wide">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="text-[var(--text-2)] text-base leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default UnsupportedScreenSize;
