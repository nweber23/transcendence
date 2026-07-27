import React from 'react';
import GameInfoModal, { InfoSectionHeading } from '@/components/games/GameInfoModal';

interface BlackjackRulesModalProps {
  onClose: () => void;
}

const BlackjackRulesModal: React.FC<BlackjackRulesModalProps> = ({ onClose }) => {
  return (
    <GameInfoModal title="Rules" onClose={onClose}>
      <section>
        <InfoSectionHeading>Objective</InfoSectionHeading>
        <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
          Get your hand's total closer to <span className="text-[var(--gold)]">21</span> than the dealer's
          without going over. Every round is played against the dealer, single deck.
        </p>
      </section>

      <section>
        <InfoSectionHeading>Card Values</InfoSectionHeading>
        <div className="flex flex-col gap-1.5">
          {[
            ['2 – 10', 'Face value'],
            ['J, Q, K', 'Worth 10'],
            ['Ace', 'Worth 1 or 11 — whichever keeps your hand from busting'],
          ].map(([label, desc]) => (
            <div
              key={label}
              className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)]"
            >
              <span className="w-20 shrink-0 text-[12px] text-[var(--gold)] font-serif">{label}</span>
              <span className="text-[12px] text-[var(--text-2)]">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <InfoSectionHeading>Your Turn</InfoSectionHeading>
        <div className="flex flex-col gap-1.5">
          {[
            ['Hit', 'Take another card'],
            ['Stand', 'Keep your current total and end your turn'],
          ].map(([label, desc]) => (
            <div
              key={label}
              className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)]"
            >
              <span className="w-16 shrink-0 text-[12px] text-[var(--gold)] font-serif">{label}</span>
              <span className="text-[12px] text-[var(--text-2)]">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-2)] leading-relaxed mt-2">
          Going over 21 is a <span className="text-[var(--gold)]">bust</span> and loses the hand immediately,
          regardless of what the dealer draws.
        </p>
      </section>

      <section>
        <InfoSectionHeading>Dealer Rules</InfoSectionHeading>
        <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
          The dealer must draw on 16 or below and stand on 17 or above — the dealer has no other choices to
          make.
        </p>
      </section>

      <section className="pt-1 border-t border-[rgba(212,175,55,0.1)]">
        <InfoSectionHeading>Payouts</InfoSectionHeading>
        <div className="flex flex-col gap-1.5">
          {[
            ['Blackjack', 'An Ace + 10-value card on the first two cards pays 3 to 2'],
            ['Win', 'A higher total than the dealer, or the dealer busts, pays 1 to 1'],
            ['Push', 'Equal totals return your bet'],
            ['Dealer Win', 'A higher dealer total, or your bust, loses the bet'],
          ].map(([label, desc]) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="text-[12px] text-[var(--gold)] font-serif shrink-0">{label}</span>
              <span className="text-[11px] text-[var(--text-2)]">{desc}</span>
            </div>
          ))}
        </div>
      </section>
    </GameInfoModal>
  );
};

export default BlackjackRulesModal;
