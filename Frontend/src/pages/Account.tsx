import React, { useState, useEffect, useRef } from 'react';

import { createWebSocket } from '@/utils/ws';

import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/hooks/useAccount';
import Button from '@/components/ui/Button';
import CasinoBackground from '@/components/ui/CasinoBackground';
import Spinner from '@/components/ui/Spinner';

const MaxTransactionAmount: number = 1000000

const Account: React.FC = () => {
  const { user } = useAuth();
  const { account, transactions, isLoading, error, deposit, withdraw } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [operationError, setOperationError] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [expandedTx, setExpandedTx] = useState<number | null>(null);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount) return;
    if (parseInt(depositAmount) > MaxTransactionAmount) return;
    setOperationError(null);
    setDepositLoading(true);
    try {
      await deposit(depositAmount);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--base)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" variant="minimal" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)]">Loading</p>
        </div>
      </div>
    );
  }

  if (error) {
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
                  ${account?.total_winnings ?? '0.00'}
                </p>
                <div className="h-px w-10 bg-gradient-to-r from-emerald-400 to-transparent" />
              </div>
            </div>

            <div className="group card-transition overflow-hidden rounded-2xl border border-[rgba(139,38,53,0.15)] bg-[var(--surface)] p-6 md:p-8 hover:border-[rgba(139,38,53,0.4)] relative fade-in-up" style={{ animationDelay: '240ms' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(139,38,53,0.06)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-widest text-[var(--text-3)] mb-3 font-semibold">Losses</p>
                <p className="font-serif text-3xl md:text-4xl font-bold text-red-400 leading-none mb-3">
                  ${account?.total_losses ?? '0.00'}
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
                    {Number(depositAmount) > MaxTransactionAmount && "Please only deposit up to " + String(MaxTransactionAmount) + " at a time"}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={depositLoading || !depositAmount}
                  className="w-full py-3 rounded-lg bg-[rgba(45,122,99,0.12)] border border-[rgba(45,122,99,0.3)] text-emerald-400 font-semibold text-sm uppercase tracking-wider hover:bg-[rgba(45,122,99,0.22)] hover:border-[rgba(45,122,99,0.5)] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="w-full py-3 rounded-lg bg-[rgba(139,38,53,0.12)] border border-[rgba(139,38,53,0.3)] text-red-400 font-semibold text-sm uppercase tracking-wider hover:bg-[rgba(139,38,53,0.22)] hover:border-[rgba(139,38,53,0.5)] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? 'Processing…' : 'Cash Out'}
                </button>
              </form>
            </div>
          </div>

          {/* Quick play */}
          <div className="mb-8 p-5 rounded-2xl border border-[rgba(212,175,55,0.08)] bg-[var(--surface)]">
            <p className="text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-3">Quick Play</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Blackjack', path: '/games/blackjack' },
                { label: 'Texas Hold\'em', path: '/games/poker' },
                { label: 'Slots', path: '/games/slots' },
              ].map((game) => (
                <Link key={game.path} to={game.path}>
                  <span className="inline-block px-5 py-2 rounded-full border border-[rgba(212,175,55,0.18)] bg-[var(--surface-2)] text-sm font-medium text-[var(--text-2)] hover:border-[rgba(212,175,55,0.45)] hover:text-[var(--text)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 cursor-pointer">
                    {game.label}
                  </span>
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
                            tx.type === 'deposit' ? 'bg-emerald-400/10' : 'bg-red-400/10'
                          }`}>
                            <svg className={`w-3.5 h-3.5 ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              {tx.type === 'deposit'
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
                        <span className={`font-serif text-lg font-bold ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.type === 'deposit' ? '+' : '−'}${tx.amount}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Account;
