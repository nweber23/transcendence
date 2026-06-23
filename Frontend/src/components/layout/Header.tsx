import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import FriendsDropdown from '@/components/layout/FriendsDropdown';
import FriendsPanelContent from '@/components/layout/FriendsPanelContent';
import ProfileDropdown from '@/components/layout/ProfileDropdown';

interface HeaderProps {
  onScroll?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onScroll }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
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
                onClick={() => setMobileFriendsOpen((o) => {
                  const next = !o;
                  if (next) friendsState.refetch();
                  return next;
                })}
                aria-expanded={mobileFriendsOpen}
                className={`flex items-center gap-2 font-serif text-4xl font-semibold text-[var(--text)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '220ms' : '0ms' }}
              >
                Friends
                {friendsState.incoming.length > 0 && (
                  <span className="min-w-[22px] h-[22px] px-1 rounded-full bg-[var(--gold)] text-[#0a0e12] text-xs font-bold flex items-center justify-center">
                    {friendsState.incoming.length}
                  </span>
                )}
              </button>

              {mobileFriendsOpen && (
                <div className="w-full max-w-sm bg-[rgba(13,17,23,0.85)] border border-[rgba(212,175,55,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 mb-2 fade-in-up">
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
              )}

              <Link
                to="/account/profile"
                onClick={() => setMenuOpen(false)}
                className={`font-serif text-4xl font-semibold text-[var(--text)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '260ms' : '0ms' }}
              >
                Profile
              </Link>
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className={`text-lg text-[var(--text-2)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '300ms' : '0ms' }}
              >
                Deposit
              </Link>
              <button
                onClick={handleLogout}
                className={`text-lg text-[var(--text-2)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? '340ms' : '0ms' }}
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
    </>
  );
};

export default Header;
