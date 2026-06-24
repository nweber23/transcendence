import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import FriendsDropdown from '@/components/layout/FriendsDropdown';
import FriendsPanelContent from '@/components/layout/FriendsPanelContent';
import ProfileDropdown from '@/components/layout/ProfileDropdown';
import Avatar from '@/components/ui/Avatar';

interface HeaderProps {
  onScroll?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onScroll }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const friendsState = useFriends();
  const isHome = location.pathname === '/';

  const navLinks: { label: string; href: string; id: string }[] = [
    { label: 'Games', href: '#games', id: 'games' },
  ];
  const [activeNav, setActiveNav] = React.useState<string>('');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [mobileFriendsOpen, setMobileFriendsOpen] = React.useState(false);

  const handleNavClick = (id: string) => {
    setActiveNav(id);
    setMenuOpen(false);
    if (isHome) {
      onScroll?.(id);
      const element = document.getElementById(id);
      element?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  // Close menu on route change
  React.useEffect(() => {
    setMenuOpen(false);
    setMobileFriendsOpen(false);
  }, [location.pathname]);

  // Prevent scroll when menu is open, restoring whatever was set before
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Refetch friends data each time the full-screen panel opens
  React.useEffect(() => {
    if (mobileFriendsOpen) {
      friendsState.refetch();
    }
  }, [mobileFriendsOpen, friendsState.refetch]);

  return (
    <>
      {/* Floating pill wrapper */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-4 px-4 pointer-events-none nav-entrance">
        <nav
          className="pointer-events-auto w-full max-w-5xl bg-[rgba(13,17,23,0.88)] backdrop-blur-3xl border border-[rgba(212,175,55,0.12)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between h-14 px-5">
            {/* Brand */}
            <Link
              to="/"
              className="group flex items-center gap-2.5 text-[var(--gold)] transition-colors duration-200"
              aria-label="ft_casino home"
            >
              <Logo size={24} className="transition-transform duration-300 group-hover:scale-105" />
              <span className="font-serif text-base font-semibold tracking-widest" style={{ color: 'var(--gold)' }}>
                FT_CASINO
              </span>
            </Link>

            {/* Nav links — desktop, home only */}
            {isHome && (
              <ul className="hidden md:flex items-center gap-1 list-none">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link.id)}
                      className={`text-sm font-medium px-3 py-1.5 rounded-full nav-link-transition nav-indicator active:scale-95 ${
                        activeNav === link.id
                          ? 'text-[var(--text)] active'
                          : 'text-[var(--text-2)] hover:text-[var(--text)]'
                      } hover:bg-[rgba(255,255,255,0.06)]`}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Auth buttons — desktop */}
            <div className="hidden md:flex items-center gap-1">
              {token ? (
                <>
                  <FriendsDropdown {...friendsState} />
                  <ProfileDropdown />
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="nav-ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button variant="nav-primary" size="sm">Sign Up</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Hamburger — mobile */}
            <button
              className="md:hidden relative flex flex-col items-center justify-center w-11 h-11 gap-[5px] rounded-full hover:bg-[rgba(255,255,255,0.06)] active:scale-95 transition-colors duration-200"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span
                className={`block h-[1.5px] w-5 bg-[var(--gold)] origin-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-[6.5px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-[1.5px] w-5 bg-[var(--gold)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'opacity-0 scale-x-0' : ''
                }`}
              />
              <span
                className={`block h-[1.5px] w-5 bg-[var(--gold)] origin-center transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? '-translate-y-[6.5px] -rotate-45' : ''
                }`}
              />
              {!menuOpen && token && friendsState.incoming.length > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-[var(--gold)] text-[#0a0e12] text-[9px] font-bold flex items-center justify-center">
                  {friendsState.incoming.length}
                </span>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile full-screen overlay */}
      <div
        className={`fixed inset-0 z-[99] md:hidden overflow-y-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backdropFilter: menuOpen ? 'blur(24px)' : 'none', background: 'rgba(10,14,18,0.92)' }}
        aria-hidden={!menuOpen}
        // @ts-expect-error — inert is a valid HTML attribute but not yet in React's types
        inert={!menuOpen ? '' : undefined}
      >
        <div className="flex flex-col items-center min-h-full gap-2 px-8 pt-28 pb-12">
          {/* Identity row */}
          {token && (
            <Link
              to="/account/profile"
              onClick={() => setMenuOpen(false)}
              className={`flex flex-col items-center gap-2 mb-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}
              style={{ transitionDelay: menuOpen ? '60ms' : '0ms' }}
            >
              <Avatar avatarURL={user?.avatarURL} size={48} />
              <span className="text-sm font-semibold text-[var(--text)]">{user?.username}</span>
              <span className="text-xs text-[var(--text-3)]">{user?.email}</span>
            </Link>
          )}

          {/* Nav links */}
          {isHome &&
            navLinks.map((link, i) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.id)}
                className={`font-serif text-4xl font-semibold text-[var(--text)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? `${100 + i * 60}ms` : '0ms' }}
              >
                {link.label}
              </button>
            ))}

          {/* Divider */}
          <div
            className={`w-16 h-px bg-[rgba(212,175,55,0.2)] my-4 transition-all duration-500 ${
              menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: menuOpen ? '180ms' : '0ms' }}
          />

          {/* Auth actions */}
          {token ? (
            <>
              <button
                onClick={() => setMobileFriendsOpen(true)}
                className={`inline-flex items-center gap-2 text-lg font-medium text-[var(--text-2)] hover:text-[var(--text)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '220ms' : '0ms' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Friends
                {friendsState.incoming.length > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-[var(--gold)] text-[#0a0e12] text-xs font-bold flex items-center justify-center">
                    {friendsState.incoming.length}
                  </span>
                )}
              </button>

              <Link
                to="/account/profile"
                onClick={() => setMenuOpen(false)}
                className={`inline-flex items-center gap-2 text-lg font-medium text-[var(--text-2)] hover:text-[var(--text)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '260ms' : '0ms' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Profile
              </Link>
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className={`inline-flex items-center gap-2 text-lg font-medium text-[var(--text-2)] hover:text-[var(--text)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '300ms' : '0ms' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
                Deposit
              </Link>

              {/* Divider */}
              <div
                className={`w-16 h-px bg-[rgba(212,175,55,0.2)] my-4 transition-all duration-500 ${
                  menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: menuOpen ? '330ms' : '0ms' }}
              />

              <button
                onClick={handleLogout}
                className={`text-base font-medium text-red-400 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '360ms' : '0ms' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signup"
                onClick={() => setMenuOpen(false)}
                className={`font-serif text-4xl font-semibold text-[var(--gold)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '220ms' : '0ms' }}
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className={`text-lg text-[var(--text-2)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '280ms' : '0ms' }}
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Friends full-screen panel */}
      <div
        className={`fixed inset-0 z-[101] md:hidden overflow-y-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          mobileFriendsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backdropFilter: mobileFriendsOpen ? 'blur(24px)' : 'none', background: 'rgba(10,14,18,0.92)' }}
        aria-hidden={!mobileFriendsOpen}
        // @ts-expect-error — inert is a valid HTML attribute but not yet in React's types
        inert={!mobileFriendsOpen ? '' : undefined}
      >
        <div className="flex items-center gap-3 px-5 h-14 border-b border-[rgba(212,175,55,0.12)]">
          <button
            onClick={() => setMobileFriendsOpen(false)}
            aria-label="Back to menu"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[rgba(255,255,255,0.06)] active:scale-95 transition-colors duration-200 text-[var(--text)]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-serif text-lg font-semibold text-[var(--text)]">Friends</span>
        </div>
        <div className="px-6 pt-6 pb-12">
          <FriendsPanelContent
            friends={friendsState.friends}
            incoming={friendsState.incoming}
            outgoing={friendsState.outgoing}
            searchResults={friendsState.searchResults}
            error={friendsState.error}
            searchUsers={friendsState.searchUsers}
            addFriend={friendsState.addFriend}
            removeFriend={friendsState.removeFriend}
          />
        </div>
      </div>
    </>
  );
};

export default Header;
