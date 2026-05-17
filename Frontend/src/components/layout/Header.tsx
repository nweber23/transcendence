import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onScroll?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onScroll }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const isHome = location.pathname === '/';

  const navLinks: { label: string; href: string; id: string }[] = [
    { label: 'Games', href: '#games', id: 'games' },
  ];
  const [activeNav, setActiveNav] = React.useState<string>('');

  const handleNavClick = (id: string) => {
    setActiveNav(id);
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
    navigate('/');
  };

  return (
    <nav className="fixed inset-0 bottom-auto z-100 bg-[rgba(13,17,23,0.88)] backdrop-blur-3xl border-b border-[rgba(212,175,55,0.08)] shadow-md">
      <div className="flex items-center justify-between h-16 max-w-5xl mx-auto px-8">
        {/* Wordmark */}
        <Link
          to="/"
          className="font-serif text-lg font-semibold tracking-widest text-[var(--gold)] hover:text-[var(--text)] transition-colors"
          aria-label="ft_casino home"
        >
          FT_CASINO
        </Link>

        {/* Nav links - only show on home */}
        {isHome && (
          <ul className="hidden md:flex items-center gap-1 list-none">
            {navLinks.map((link) => (
              <li key={link.label}>
                <button
                  onClick={() => handleNavClick(link.id)}
                  className={`text-sm font-medium px-3 py-1.5 rounded nav-link-transition nav-indicator active:scale-97 ${
                    activeNav === link.id
                      ? 'text-[var(--text)] active'
                      : 'text-[var(--text-2)] hover:text-[var(--text)]'
                  } hover:bg-[rgba(255,255,255,0.04)]`}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {token ? (
            <>
              <Link to="/account">
                <Button variant="nav-ghost" size="sm">
                  Account
                </Button>
              </Link>
              <Button
                variant="nav-ghost"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="nav-ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="nav-primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;
