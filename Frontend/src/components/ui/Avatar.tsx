import React from 'react';
import Spinner from '@/components/ui/Spinner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export function getAvatarSrc(avatarURL: string | undefined | null): string {
  if (!avatarURL || avatarURL === 'default_avatar') return '/sonne.jpeg';
  return `${API_BASE_URL}/uploads/${avatarURL}`;
}

interface AvatarProps {
  avatarURL: string | undefined | null;
  size?: number;
  className?: string;
  onClick?: () => void;
  isUploading?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({
  avatarURL,
  size = 40,
  className = '',
  onClick,
  isUploading = false,
}) => {
  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-[rgba(212,175,55,0.3)] flex-shrink-0 bg-[var(--surface-2)] ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? 'Change avatar' : undefined}
    >
      <img
        src={getAvatarSrc(avatarURL)}
        alt="Avatar"
        className="w-full h-full object-cover"
        draggable={false}
      />
      {onClick && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          {isUploading ? (
            <Spinner size="sm" variant="minimal" />
          ) : (
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
};

export default Avatar;
