import React from 'react';

const Footer: React.FC = () => {
  const footerLinks = ['Privacy', 'Terms'];

  return (
    <footer className="bg-[var(--surface)] border-t border-[var(--border)] px-8 py-8" role="contentinfo">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-6">
        <span className="font-serif text-base font-semibold tracking-widest text-gold">
          TRANSCENDENCE
        </span>

        <p className="text-sm text-[var(--text-3)] text-center md:text-left">
          All currency is fictional and has no real-world value.
        </p>

        <ul className="flex gap-6 list-none md:flex-none">
          {footerLinks.map((link) => (
            <li key={link}>
              <a
                href="#"
                className="text-sm text-[var(--text-3)] transition-colors duration-150 hover:text-[var(--text-2)]"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
