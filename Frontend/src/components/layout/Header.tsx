import React from 'react';
import Button from '@/components/ui/Button';

interface HeaderProps {
  onScroll?: (section: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onScroll }) => {
  const navLinks = ['Games', 'Features', 'About'];

  const handleNavClick = (link: string) => {
    const sectionId = link.toLowerCase();
    onScroll?.(sectionId);
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="fixed inset-0 bottom-auto z-100 bg-[rgba(13,17,23,0.88)] backdrop-blur-3xl border-b border-[rgba(212,175,55,0.08)] shadow-md">
      <div className="flex items-center justify-between h-16 max-w-5xl mx-auto px-8">
        {/* Wordmark */}
        <a
          href="#"
          className="font-serif text-lg font-semibold tracking-widest text-[var(--gold)]"
          aria-label="Transcendence home"
        >
          TRANSCENDENCE
        </a>

        {/* Nav links */}
        <ul className="hidden md:flex items-center gap-1 list-none">
          {navLinks.map((link) => (
            <li key={link}>
              <button
                onClick={() => handleNavClick(link)}
                className="text-sm font-medium text-[var(--text-2)] px-3 py-1.5 rounded transition-all duration-150 hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.04)]"
              >
                {link}
              </button>
            </li>
          ))}
        </ul>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="nav-ghost" size="sm">
            Sign In
          </Button>
          <Button variant="nav-primary" size="sm">
            Play Now
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Header;
