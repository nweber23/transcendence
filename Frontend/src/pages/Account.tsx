import React, { useState } from 'react';
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
    <div className="min-h-screen bg-[var(--base)] text-[var(--text)] py-12 px-4">
      <CasinoBackground />
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-serif text-4xl font-semibold text-[var(--text)] mb-2">
            Account Dashboard
          </h1>
          <p className="text-[var(--text-2)]">
            Welcome, <span className="text-[var(--gold)]">{user?.username}</span>
          </p>
        </div>

        {/* Error Message */}
        {operationError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            {operationError}
          </div>
        )}

        {/* Balance Card */}
        <div className="border border-[rgba(212,175,55,0.15)] rounded-2xl bg-[var(--surface)] p-8 mb-8">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-6">Account Balance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-2 border-[var(--gold)] pl-4">
              <p className="text-[var(--text-2)] text-sm mb-2">Current Balance</p>
              <p className="text-3xl font-bold text-[var(--gold)]">
                ${account?.balance || '0.00'}
              </p>
            </div>
            <div className="border-l-2 border-emerald-400 pl-4">
              <p className="text-[var(--text-2)] text-sm mb-2">Total Winnings</p>
              <p className="text-2xl font-semibold text-emerald-400">
                ${account?.total_winnings || '0.00'}
              </p>
            </div>
            <div className="border-l-2 border-red-400 pl-4">
              <p className="text-[var(--text-2)] text-sm mb-2">Total Losses</p>
              <p className="text-2xl font-semibold text-red-400">
                ${account?.total_losses || '0.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Deposit/Withdraw */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Deposit */}
          <div className="border border-[rgba(212,175,55,0.15)] rounded-2xl bg-[var(--surface)] p-8">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-6">Deposit Funds</h3>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label htmlFor="deposit" className="block text-sm font-medium text-[var(--text)] mb-2">
                  Amount
                </label>
                <input
                  id="deposit"
                  type="number"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50"
                />
              </div>
              <Button
                variant="gold"
                className="w-full"
                disabled={depositLoading || !depositAmount}
              >
                {depositLoading ? 'Processing...' : 'Deposit'}
              </Button>
            </form>
          </div>

          {/* Withdraw */}
          <div className="border border-[rgba(212,175,55,0.15)] rounded-2xl bg-[var(--surface)] p-8">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-6">Withdraw Funds</h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label htmlFor="withdraw" className="block text-sm font-medium text-[var(--text)] mb-2">
                  Amount
                </label>
                <input
                  id="withdraw"
                  type="number"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.1)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-opacity-50"
                />
              </div>
              <Button
                variant="gold"
                className="w-full"
                disabled={withdrawLoading || !withdrawAmount}
              >
                {withdrawLoading ? 'Processing...' : 'Withdraw'}
              </Button>
            </form>
          </div>
        </div>

        {/* Transaction History */}
        <div className="border border-[rgba(212,175,55,0.15)] rounded-2xl bg-[var(--surface)] p-8">
          <h3 className="text-lg font-semibold text-[var(--text)] mb-6">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="text-[var(--text-2)]">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(212,175,55,0.1)]">
                    <th className="text-left py-3 text-[var(--text-2)]">Date</th>
                    <th className="text-left py-3 text-[var(--text-2)]">Type</th>
                    <th className="text-right py-3 text-[var(--text-2)]">Amount</th>
                    <th className="text-right py-3 text-[var(--text-2)]">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-[rgba(212,175,55,0.05)] hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="py-3 capitalize">{tx.type}</td>
                      <td className={`py-3 text-right font-semibold ${
                        tx.type === 'deposit' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount}
                      </td>
                      <td className="py-3 text-right">${tx.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
