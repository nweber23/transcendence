import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOutsideClick } from '@/utils/useOutsideClick';
import Avatar from '@/components/ui/Avatar';

const ProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useOutsideClick(wrapperRef, () => setOpen(false), open);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const itemClass =
    'block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-200';

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile menu"
        aria-expanded={open}
      >
        <Avatar avatarURL={user?.avatarURL} size={32} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[220px] bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[rgba(212,175,55,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-2 z-50 fade-in-up">
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <Avatar avatarURL={user?.avatarURL} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text)] truncate">{user?.username}</p>
              <p className="text-xs text-[var(--text-3)] truncate">{user?.email}</p>
            </div>
          </div>
          <div className="h-px bg-[rgba(212,175,55,0.1)] my-1" />
          <Link to="/account/profile" className={itemClass} onClick={() => setOpen(false)}>
            Settings
          </Link>
          <Link to="/account" className={itemClass} onClick={() => setOpen(false)}>
            Deposit
          </Link>
          <div className="h-px bg-[rgba(212,175,55,0.1)] my-1" />
          <button
            onClick={handleLogout}
            className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-[rgba(139,38,53,0.08)] transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
