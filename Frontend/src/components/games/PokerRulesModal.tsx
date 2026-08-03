import React from 'react';
import GameInfoModal, { InfoSectionHeading } from '@/components/games/GameInfoModal';

interface PokerRulesModalProps {
  onClose: () => void;
  smallBlind: number;
  bigBlind: number;
  buyIn: number;
  turnTimeoutSeconds: number;
}

const HAND_RANKINGS = [
  'Royal Flush',
  'Straight Flush',
  'Four of a Kind',
  'Full House',
  'Flush',
  'Straight',
  'Three of a Kind',
  'Two Pair',
  'One Pair',
  'High Card',
];

const PokerRulesModal: React.FC<PokerRulesModalProps> = ({
  onClose,
  smallBlind,
  bigBlind,
  buyIn,
  turnTimeoutSeconds,
}) => {
  return (
    <GameInfoModal title="Rules" onClose={onClose}>
      <section>
        <InfoSectionHeading>Objective</InfoSectionHeading>
        <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
          No-Limit Texas Hold'em, up to 6 players. Make the best 5-card hand from your 2 hole cards and the 5
          shared community cards, or win the pot by making every other player fold.
        </p>
      </section>

      <section>
        <InfoSectionHeading>Buy-in &amp; Blinds</InfoSectionHeading>
        <div className="flex gap-2">
          {[
            ['Buy-in', `$${buyIn.toLocaleString()}`],
            ['Small Blind', `$${smallBlind.toLocaleString()}`],
            ['Big Blind', `$${bigBlind.toLocaleString()}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex-1 text-center px-2 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)]"
            >
              <p className="text-[11px] text-[var(--text-2)]">{label}</p>
              <p className="text-[12px] text-[var(--gold)] font-serif">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-2)] leading-relaxed mt-2">
          The two seats left of the dealer post the small and big blind before cards are dealt, seeding the
          pot each hand.
        </p>
      </section>

      <section>
        <InfoSectionHeading>Betting Rounds</InfoSectionHeading>
        <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
          Each hand runs through up to four rounds of betting: <span className="text-[var(--gold)]">pre-flop</span>{' '}
          (after hole cards), <span className="text-[var(--gold)]">flop</span> (3 community cards),{' '}
          <span className="text-[var(--gold)]">turn</span> (a 4th card), and{' '}
          <span className="text-[var(--gold)]">river</span> (a 5th and final card). The pot goes to the best
          hand still in at showdown.
        </p>
      </section>

      <section>
        <InfoSectionHeading>Your Actions</InfoSectionHeading>
        <div className="flex flex-col gap-1.5">
          {[
            ['Fold', 'Give up your hand and any claim to the pot'],
            ['Check', 'Pass the action with no bet, only when nobody has bet yet this round'],
            ['Call', "Match the current bet to stay in the hand"],
            ['Raise', 'Increase the bet, forcing others to call, fold, or re-raise'],
            ['All In', 'Bet your entire remaining stack'],
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
          You have {turnTimeoutSeconds} seconds to act on your turn — running out of time automatically folds
          your hand and, if you idle out repeatedly, removes you from the table.
        </p>
      </section>

      <section className="pt-1 border-t border-[rgba(212,175,55,0.1)]">
        <InfoSectionHeading>
          Hand Rankings <span className="normal-case tracking-normal">(best to worst)</span>
        </InfoSectionHeading>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {HAND_RANKINGS.map((hand, i) => (
            <div key={hand} className="flex items-baseline gap-2">
              <span className="text-[10px] text-[var(--text-2)] w-4 shrink-0">{i + 1}.</span>
              <span className="text-[12px] text-[var(--text)]">{hand}</span>
            </div>
          ))}
        </div>
      </section>
    </GameInfoModal>
  );
};

export default PokerRulesModal;
