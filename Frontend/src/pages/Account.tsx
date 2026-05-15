import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/hooks/useAccount';
import Button from '@/components/ui/Button';
import CasinoBackground from '@/components/ui/CasinoBackground';

const Account: React.FC = () => {
  const { user } = useAuth();
  const { account, transactions, isLoading, error, deposit, withdraw } = useAccount();
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [operationError, setOperationError] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const balanceRef = useRef<HTMLDivElement>(null);
  const winsRef = useRef<HTMLDivElement>(null);
  const lossesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const elements = [
      { ref: balanceRef, delay: 0 },
      { ref: winsRef, delay: 100 },
      { ref: lossesRef, delay: 200 },
    ];

    elements.forEach(({ ref, delay }) => {
      if (ref.current) {
        ref.current.style.animation = 'none';
        setTimeout(() => {
          if (ref.current) {
            ref.current.style.animation = 'fadeInUp 600ms var(--ease-out) forwards';
          }
        }, delay);
      }
    });
  }, [account]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount) return;
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
      <div className="min-h-screen bg-[var(--base)] text-[var(--text)] flex items-center justify-center">
        <div className="text-xl">Loading account...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--base)] text-[var(--text)] flex items-center justify-center">
        <div className="text-red-400 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <main className="overflow-x-hidden w-full max-w-full">
      <div className="min-h-screen bg-[var(--base)] text-[var(--text)] pt-24 pb-20 px-4">
        <CasinoBackground />

        <div className="relative z-10">
          {/* HERO SECTION */}
          <div className="max-w-6xl mx-auto text-center mb-32 md:mb-40">
            <h1 className="font-serif text-5xl md:text-6xl font-semibold text-[var(--text)] leading-tight mb-4 tracking-tight">
              Your Financial Dashboard
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-2)] mb-8">
              Manage your account and track your casino activity as{' '}
              <span className="text-[var(--gold)] font-semibold">{user?.username}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gold" className="px-8 py-3 text-base">
                View Activity
              </Button>
              <Button variant="gold" className="px-8 py-3 text-base">
                Settings
              </Button>
            </div>
          </div>

          {/* BALANCE CARDS (BENTO GRID) */}
          <div className="max-w-6xl mx-auto mb-32 md:mb-40">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 grid-auto-flow-dense">
              {/* Current Balance Card */}
              <div
                ref={balanceRef}
                className="group card-transition overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[var(--surface)] p-8 md:p-10 backdrop-blur-sm hover:border-[rgba(212,175,55,0.4)] relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(212,175,55,0.08)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-2)] mb-4 font-semibold">Current Balance</p>
                  <p className="text-3xl md:text-5xl font-bold text-[var(--gold)] font-serif mb-4 break-words overflow-hidden" style={{ fontSize: 'clamp(1.875rem, 8vw, 3rem)' }}>
                    ${account?.balance || '0.00'}
                  </p>
                  <div className="h-1 w-12 bg-gradient-to-r from-[var(--gold)] to-transparent rounded-full" />
                </div>
              </div>

              {/* Total Winnings Card */}
              <div
                ref={winsRef}
                className="group card-transition overflow-hidden rounded-2xl border border-[rgba(45,122,99,0.15)] bg-[var(--surface)] p-8 md:p-10 backdrop-blur-sm hover:border-[rgba(45,122,99,0.4)] relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(45,122,99,0.08)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-2)] mb-4 font-semibold">Total Winnings</p>
                  <p className="text-3xl md:text-5xl font-bold text-emerald-400 font-serif mb-4 break-words overflow-hidden" style={{ fontSize: 'clamp(1.875rem, 8vw, 3rem)' }}>
                    ${account?.total_winnings || '0.00'}
                  </p>
                  <div className="h-1 w-12 bg-gradient-to-r from-emerald-400 to-transparent rounded-full" />
                </div>
              </div>

              {/* Total Losses Card */}
              <div
                ref={lossesRef}
                className="group card-transition overflow-hidden rounded-2xl border border-[rgba(139,38,53,0.15)] bg-[var(--surface)] p-8 md:p-10 backdrop-blur-sm hover:border-[rgba(139,38,53,0.4)] relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[rgba(139,38,53,0.08)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                  <p className="text-xs uppercase tracking-widest text-[var(--text-2)] mb-4 font-semibold">Total Losses</p>
                  <p className="text-3xl md:text-5xl font-bold text-red-400 font-serif mb-4 break-words overflow-hidden" style={{ fontSize: 'clamp(1.875rem, 8vw, 3rem)' }}>
                    ${account?.total_losses || '0.00'}
                  </p>
                  <div className="h-1 w-12 bg-gradient-to-r from-red-400 to-transparent rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* ERROR MESSAGE */}
          {operationError && (
            <div className="max-w-6xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-400 backdrop-blur-sm">
                <p className="font-semibold mb-1">Transaction Error</p>
                <p>{operationError}</p>
              </div>
            </div>
          )}

          {/* DEPOSIT/WITHDRAW SECTION */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 mb-32 md:mb-40">
            {/* Deposit Form */}
            <div className="group card-transition overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[var(--surface)] p-8 md:p-10 backdrop-blur-sm hover:border-[rgba(212,175,55,0.4)]">
              <h3 className="text-2xl font-serif font-semibold text-[var(--text)] mb-8">Deposit Funds</h3>
              <form onSubmit={handleDeposit} className="space-y-6">
                <div>
                  <label htmlFor="deposit" className="block text-sm uppercase tracking-wider font-semibold text-[var(--text-2)] mb-3">
                    Amount
                  </label>
                  <input
                    id="deposit"
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="input-focus-transition w-full px-6 py-4 rounded-xl bg-[var(--surface-2)] border border-[rgba(212,175,55,0.15)] text-[var(--text)] placeholder-[var(--text-3)] focus:border-[rgba(212,175,55,0.4)] focus:ring-2 focus:ring-[var(--gold)]/20 transition-all duration-300"
                  />
                </div>
                <Button
                  variant="gold"
                  className="w-full py-4 text-base font-semibold btn-gold-transition"
                  disabled={depositLoading || !depositAmount}
                >
                  {depositLoading ? 'Processing...' : 'Deposit Now'}
                </Button>
              </form>
            </div>

            {/* Withdraw Form */}
            <div className="group card-transition overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[var(--surface)] p-8 md:p-10 backdrop-blur-sm hover:border-[rgba(212,175,55,0.4)]">
              <h3 className="text-2xl font-serif font-semibold text-[var(--text)] mb-8">Withdraw Funds</h3>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                  <label htmlFor="withdraw" className="block text-sm uppercase tracking-wider font-semibold text-[var(--text-2)] mb-3">
                    Amount
                  </label>
                  <input
                    id="withdraw"
                    type="number"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="input-focus-transition w-full px-6 py-4 rounded-xl bg-[var(--surface-2)] border border-[rgba(212,175,55,0.15)] text-[var(--text)] placeholder-[var(--text-3)] focus:border-[rgba(212,175,55,0.4)] focus:ring-2 focus:ring-[var(--gold)]/20 transition-all duration-300"
                  />
                </div>
                <Button
                  variant="gold"
                  className="w-full py-4 text-base font-semibold btn-gold-transition"
                  disabled={withdrawLoading || !withdrawAmount}
                >
                  {withdrawLoading ? 'Processing...' : 'Withdraw Now'}
                </Button>
              </form>
            </div>
          </div>

          {/* TRANSACTION HISTORY SECTION */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[var(--text)] mb-12 tracking-tight">
              Recent Activity Timeline
            </h2>

            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[var(--surface)] p-12 md:p-16 text-center backdrop-blur-sm">
                <p className="text-lg text-[var(--text-2)]">No transactions recorded yet</p>
                <p className="text-sm text-[var(--text-3)] mt-2">Your activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="group card-transition overflow-hidden rounded-xl border border-[rgba(212,175,55,0.1)] bg-[var(--surface)] backdrop-blur-sm hover:border-[rgba(212,175,55,0.3)] cursor-pointer transition-all duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                  >
                    <div className="p-6 md:p-8">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              tx.type === 'deposit'
                                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                : 'bg-red-400/10 text-red-400 border border-red-400/20'
                            }`}>
                              {tx.type}
                            </div>
                            <p className="text-sm text-[var(--text-2)]">
                              {new Date(tx.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <p className="text-[var(--text-3)] text-xs">
                            {new Date(tx.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold font-serif ${
                            tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {tx.type === 'deposit' ? '+' : '-'}${tx.amount}
                          </p>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedTx === tx.id && (
                        <div className="mt-6 pt-6 border-t border-[rgba(212,175,55,0.1)] space-y-3 animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-2)]">Transaction ID</span>
                            <span className="text-[var(--text)] font-mono text-xs">#{tx.id}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-2)]">Balance After</span>
                            <span className="text-[var(--text)] font-semibold">${tx.balance_after}</span>
                          </div>
                        </div>
                      )}
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
