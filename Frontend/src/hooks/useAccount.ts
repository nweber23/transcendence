import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/utils/api';

export interface Account {
  id: number;
  balance: string;
  total_winnings: string;
  total_losses: string;
}

export interface Transaction {
  id: number;
  type: string;
  amount: string;
  balance_after: string;
  created_at: string;
}

export interface UseAccountReturn {
  account: Account | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  getAccount: () => Promise<void>;
  getTransactions: (limit?: number, offset?: number) => Promise<void>;
  deposit: (amount: string) => Promise<void>;
  withdraw: (amount: string) => Promise<void>;
}

export function useAccount(autoFetch = true): UseAccountReturn {
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccount = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall<Account>('GET', '/user/account');
      setAccount(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account data';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTransactions = useCallback(async (limit = 20, offset = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall<{ transactions: Transaction[] }>(
        'GET',
        `/user/account/transactions?limit=${limit}&offset=${offset}`
      );
      setTransactions(result.transactions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transaction history';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deposit = useCallback(async (amount: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall<Account>('POST', '/user/account/deposit', {
        amount,
      });
      setAccount(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const withdraw = useCallback(async (amount: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall<Account>('POST', '/user/account/withdraw', {
        amount,
      });
      setAccount(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount if token exists and autoFetch is true
  useEffect(() => {
    if (autoFetch && localStorage.getItem('auth_token')) {
      Promise.all([getAccount(), getTransactions()]).catch(() => {
        // Silently fail auto-fetch on mount
      });
    }
  }, [autoFetch, getAccount, getTransactions]);

  return {
    account,
    transactions,
    isLoading,
    error,
    getAccount,
    getTransactions,
    deposit,
    withdraw,
  };
}
