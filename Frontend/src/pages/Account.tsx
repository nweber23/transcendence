import React, { useState, useEffect, useRef } from 'react';

import { createWebSocket } from '@/utils/ws';

import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccount, TransactionCategory } from '@/hooks/useAccount';
import CasinoBackground from '@/components/ui/CasinoBackground';
import Spinner from '@/components/ui/Spinner';

const QUICK_PLAY_GAMES = [
  { label: 'Blackjack', tagline: 'Beat the dealer', path: '/games/blackjack', glyph: '♠' },
  { label: "Texas Hold'em", tagline: 'Take a seat at the table', path: '/games/poker', glyph: '◆' },
  { label: 'Slots', tagline: 'Spin the reels', path: '/games/slots', glyph: '7' },
];

const MAX_TRANSACTION_AMOUNT = 1_000_000;

const CREDIT_TRANSACTION_TYPES = new Set(['deposit', 'win', 'cashout', 'refund']);
const isCreditTransaction = (type: string) => CREDIT_TRANSACTION_TYPES.has(type);

const CATEGORY_FILTERS: { label: string; value: TransactionCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'Wallet', value: 'wallet' },
  { label: 'Game', value: 'game' },
];

const Account: React.FC = () => {
  const { user } = useAuth();
  const {
    account,
    transactions,
    hasMoreTransactions,
    isLoading,
    isLoadingMoreTransactions,
    error,
    deposit,
    withdraw,
    getTransactions,
    loadMoreTransactions,
  } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [operationError, setOperationError] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [justDeposited, setJustDeposited] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<TransactionCategory>('all');
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const depositExceedsLimit = Number(depositAmount) > MAX_TRANSACTION_AMOUNT;

  useEffect(() => {
    if (!justDeposited) return;
    const timeout = window.setTimeout(() => setJustDeposited(null), 15000);
    return () => window.clearTimeout(timeout);
  }, [justDeposited]);

  const handleCategoryChange = (nextCategory: TransactionCategory) => {
    if (nextCategory === activeCategory) return;
    setActiveCategory(nextCategory);
    getTransactions(nextCategory).catch(() => {
      // Error is already surfaced via the `error` state
    });
  };

  // Infinite scroll: fetch the next page once the sentinel below the list scrolls into view
  useEffect(() => {
    if (!hasMoreTransactions) return;
    const node = loadMoreSentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreTransactions) {
          loadMoreTransactions().catch(() => {
            // Error is already surfaced via the `error` state
          });
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreTransactions, isLoadingMoreTransactions, loadMoreTransactions]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || depositExceedsLimit) return;
    setOperationError(null);
    setDepositLoading(true);
    try {
      await deposit(depositAmount);
      setJustDeposited(depositAmount);
      setDepositAmount('');
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount) return;
    setOperationError(null);
    setWithdrawLoading(true);
    try {
      await withdraw(withdrawAmount);
      setWithdrawAmount('');
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };
  if (isLoading && !account) {
    return (
      <div className="min-h-screen bg-[var(--base)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" variant="minimal" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)]">Loading</p>
        </div>
      </div>
    );
  }
  if (error && !account) {
    return (
      <div className="min-h-screen bg-[var(--base)] flex items-center justify-center px-8">
        <div className="max-w-sm w-full bg-[var(--surface)] border border-red-500/20 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="font-serif text-lg font-semibold text-[var(--text)] mb-2">Something went wrong</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="overflow-x-hidden w-full max-w-full">
      <div className="min-h-screen bg-[var(--base)] text-[var(--text)] pt-24 pb-16 px-6">
        <CasinoBackground />

        <div className="relative z-10 max-w-5xl mx-auto">

          {/* Page header */}
          <div className="mb-10 fade-in-up">
            <p className="eyebrow mb-2">Account</p>
            <h1 className="font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
              Welcome back,{' '}
              <span className="text-[var(--gold)] italic">{user?.username}</span>
            </h1>
          </div>

          {/* Balance cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="group card-transition overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[var(--surface)] p-6 md:p-8 hover:border-[rgba(212,175,55,0.4)] relative fade-in-up" style={{ animationDelay: '80ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(212,175,55,0.06)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-widest text-[var(--text-3)] mb-3 font-semibold">Balance</p>
                <p className="font-serif text-3xl md:text-4xl font-bold text-[var(--gold)] leading-none mb-3">
                  ${account?.balance ?? '0.00'}
                </p>
                <div className="h-px w-10 bg-gradient-to-r from-[var(--gold)] to-transparent" />
              </div>
            </div>

            <div className="group card-transition overflow-hidden rounded-2xl border border-[rgba(45,122,99,0.15)] bg-[var(--surface)] p-6 md:p-8 hover:border-[rgba(45,122,99,0.4)] relative fade-in-up" style={{ animationDelay: '160ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(45,122,99,0.06)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-widest text-[var(--text-3)] mb-3 font-semibold">Winnings</p>
                <p className="font-serif text-3xl md:text-4xl font-bold text-emerald-400 leading-none mb-3">
                  ${account?.total_won ?? '0.00'}
                </p>
                <div className="h-px w-10 bg-gradient-to-r from-emerald-400 to-transparent" />
              </div>
            </div>

            <div className="group card-transition overflow-hidden rounded-2xl border border-[rgba(139,38,53,0.15)] bg-[var(--surface)] p-6 md:p-8 hover:border-[rgba(139,38,53,0.4)] relative fade-in-up" style={{ animationDelay: '240ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(139,38,53,0.06)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-widest text-[var(--text-3)] mb-3 font-semibold">Losses</p>
                <p className="font-serif text-3xl md:text-4xl font-bold text-red-400 leading-none mb-3">
                  ${account?.total_lost ?? '0.00'}
                </p>
                <div className="h-px w-10 bg-gradient-to-r from-red-400 to-transparent" />
              </div>
            </div>
          </div>

          {/* Error */}
          {operationError && (
            <div className="mb-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                <p className="font-semibold text-sm mb-0.5">Transaction Error</p>
                <p className="text-sm opacity-80">{operationError}</p>
              </div>
            </div>
          )}

          {/* Deposit / Withdraw */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {/* Deposit */}
            <div className="overflow-hidden rounded-2xl border border-[rgba(45,122,99,0.2)] bg-[var(--surface)] p-6 md:p-7 hover:border-[rgba(45,122,99,0.4)] card-transition fade-in-up" style={{ animationDelay: '320ms' }}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-full bg-[rgba(45,122,99,0.15)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-semibold text-[var(--text)]">Deposit</h3>
              </div>
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label htmlFor="deposit" className="block text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-2">
                    Amount
                  </label>
                  <input
                    id="deposit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[rgba(45,122,99,0.2)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[rgba(45,122,99,0.5)] focus:ring-2 focus:ring-[rgba(45,122,99,0.15)] input-focus-transition"
                  />
                  <p className="text-sm text-red-400">
                    {depositExceedsLimit && `Please only deposit up to ${MAX_TRANSACTION_AMOUNT.toLocaleString()} at a time`}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={depositLoading || !depositAmount || depositExceedsLimit}
                  className="w-full py-3 rounded-lg bg-[#1e5a45] text-[#e9f5ef] font-semibold text-sm uppercase tracking-wider hover:bg-[#247052] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {depositLoading ? 'Processing…' : 'Add Chips'}
                </button>
              </form>
            </div>

            {/* Withdraw */}
            <div className="overflow-hidden rounded-2xl border border-[rgba(139,38,53,0.2)] bg-[var(--surface)] p-6 md:p-7 hover:border-[rgba(139,38,53,0.4)] card-transition fade-in-up" style={{ animationDelay: '380ms' }}>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-full bg-[rgba(139,38,53,0.15)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-semibold text-[var(--text)]">Withdraw</h3>
              </div>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label htmlFor="withdraw" className="block text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-2">
                    Amount
                  </label>
                  <input
                    id="withdraw"
                    type="number"
                    step="0.01"
                    min="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[rgba(139,38,53,0.2)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[rgba(139,38,53,0.5)] focus:ring-2 focus:ring-[rgba(139,38,53,0.15)] input-focus-transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount}
                  className="w-full py-3 rounded-lg bg-[var(--red)] text-[#f6e3e6] font-semibold text-sm uppercase tracking-wider hover:bg-[#a12e40] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? 'Processing…' : 'Cash Out'}
                </button>
              </form>
            </div>
          </div>

          {/* Play — the conversion point from adding chips to actually playing */}
          <div className={`mb-8 p-5 md:p-6 rounded-2xl border bg-[var(--surface)] transition-colors duration-500 ${
            justDeposited ? 'border-[rgba(45,122,99,0.5)]' : 'border-[rgba(212,175,55,0.1)]'
          }`}>
            {justDeposited ? (
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-full bg-[rgba(45,122,99,0.18)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  ${Number(justDeposited).toLocaleString()} added — ready to play
                </p>
              </div>
            ) : (
              <p className="text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-4">Play Now</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {QUICK_PLAY_GAMES.map(({ label, tagline, path, glyph }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setJustDeposited(null)}
                  className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[var(--surface-2)] hover:border-[rgba(212,175,55,0.55)] hover:bg-[rgba(212,175,55,0.08)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <span className="w-10 h-10 rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.1)] flex items-center justify-center flex-shrink-0">
                    <span className="font-serif text-lg text-[var(--gold)] leading-none">{glyph}</span>
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-serif text-base font-semibold text-[var(--text)]">{label}</span>
                    <span className="text-xs text-[var(--text-2)] group-hover:text-[var(--text)]">{tagline}</span>
                  </span>
                  <svg className="w-4 h-4 ml-auto flex-shrink-0 text-[var(--gold)] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Transaction history */}
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight">Activity</h2>
              {transactions.length > 0 && (
                <span className="text-xs uppercase tracking-widest font-semibold text-[var(--text-3)]">
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex gap-2 mb-5">
              {CATEGORY_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleCategoryChange(filter.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border transition-all duration-200 ${
                    activeCategory === filter.value
                      ? 'border-[rgba(212,175,55,0.6)] bg-[var(--surface-2)] text-[var(--text)]'
                      : 'border-[rgba(212,175,55,0.08)] text-[var(--text-3)] hover:border-[rgba(212,175,55,0.3)] hover:text-[var(--text-2)]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.08)] bg-[var(--surface)] p-10 text-center">
                <p className="font-medium text-[var(--text-2)] mb-1">No transactions yet</p>
                <p className="text-sm text-[var(--text-3)]">Your chip activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandedTx === tx.id}
                    className="overflow-hidden rounded-xl border border-[rgba(212,175,55,0.08)] bg-[var(--surface)] hover:border-[rgba(212,175,55,0.2)] cursor-pointer transition-all duration-200 fade-in-up"
                    style={{ animationDelay: `${idx * 40}ms` }}
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedTx(expandedTx === tx.id ? null : tx.id);
                      }
                    }}
                  >
                    <div className="px-5 pt-4">
                      <div className="flex items-center justify-between pb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCreditTransaction(tx.type) ? 'bg-emerald-400/10' : 'bg-red-400/10'
                          }`}>
                            <svg className={`w-3.5 h-3.5 ${isCreditTransaction(tx.type) ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              {isCreditTransaction(tx.type)
                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                : <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              }
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text)] capitalize">{tx.type}</p>
                            <p className="text-xs text-[var(--text-3)]">
                              {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {' · '}
                              {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className={`font-serif text-lg font-bold ${isCreditTransaction(tx.type) ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCreditTransaction(tx.type) ? '+' : '−'}${tx.amount}
                        </span>
                      </div>

                      {/* Smooth expand via grid-template-rows */}
                      <div
                        className="expand-transition"
                        style={{ gridTemplateRows: expandedTx === tx.id ? '1fr' : '0fr' }}
                      >
                        <div className="overflow-hidden">
                          <div className="pt-4 pb-4 border-t border-[rgba(212,175,55,0.08)] grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-widest text-[var(--text-3)] mb-1">Transaction ID</p>
                              <p className="font-mono text-xs text-[var(--text-2)]">#{tx.id}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-widest text-[var(--text-3)] mb-1">Balance After</p>
                              <p className="text-sm font-semibold text-[var(--text)]">${tx.balance_after}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {hasMoreTransactions && (
                  <div ref={loadMoreSentinelRef} className="pt-4 flex justify-center h-10 items-center">
                    {isLoadingMoreTransactions && <Spinner size="sm" />}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Account;
