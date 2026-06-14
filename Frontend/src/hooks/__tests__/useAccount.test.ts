import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccount } from '../useAccount';

vi.mock('@/utils/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/utils/api';

const mockApiCall = vi.mocked(apiCall);

const mockAccount = {
  id: 1,
  balance: '1000.00',
  total_winnings: '500.00',
  total_losses: '200.00',
};

const mockTransactions = [
  { id: 1, type: 'deposit', amount: '100.00', balance_after: '1100.00', created_at: '2024-01-01' },
  { id: 2, type: 'withdraw', amount: '50.00', balance_after: '1050.00', created_at: '2024-01-02' },
];

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('useAccount - initialization', () => {
  it('starts with null account and empty transactions', () => {
    const { result } = renderHook(() => useAccount(false));
    expect(result.current.account).toBeNull();
    expect(result.current.transactions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('auto-fetches account and transactions when token exists', async () => {
    localStorage.setItem('auth_token', 'token');
    mockApiCall
      .mockResolvedValueOnce(mockAccount)
      .mockResolvedValueOnce({ transactions: mockTransactions });

    const { result } = renderHook(() => useAccount(true));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.account).toEqual(mockAccount);
    expect(result.current.transactions).toEqual(mockTransactions);
  });

  it('does not auto-fetch when no token in localStorage', async () => {
    const { result } = renderHook(() => useAccount(true));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockApiCall).not.toHaveBeenCalled();
    expect(result.current.account).toBeNull();
  });

  it('does not auto-fetch when autoFetch is false', async () => {
    localStorage.setItem('auth_token', 'token');
    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockApiCall).not.toHaveBeenCalled();
    expect(result.current.account).toBeNull();
  });
});

describe('useAccount - getAccount', () => {
  it('fetches and sets account data', async () => {
    mockApiCall.mockResolvedValueOnce(mockAccount);

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.getAccount();
    });

    expect(result.current.account).toEqual(mockAccount);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error when getAccount fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.getAccount().catch(() => {});
    });

    expect(result.current.account).toBeNull();
    expect(result.current.error).toBe('Unauthorized');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets isLoading to false after failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.getAccount().catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAccount - deposit', () => {
  it('updates account after successful deposit', async () => {
    const updatedAccount = { ...mockAccount, balance: '1100.00' };
    mockApiCall.mockResolvedValueOnce(updatedAccount);

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.deposit('100.00');
    });

    expect(result.current.account).toEqual(updatedAccount);
    expect(result.current.error).toBeNull();
  });

  it('sets error when deposit fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Deposit failed'));

    const { result } = renderHook(() => useAccount(false));
    let caughtError: Error | undefined;

    await act(async () => {
      await result.current.deposit('100.00').catch((e) => { caughtError = e; });
    });

    expect(caughtError?.message).toBe('Deposit failed');
    expect(result.current.error).toBe('Deposit failed');
  });

  it('calls deposit endpoint with correct amount', async () => {
    mockApiCall.mockResolvedValueOnce(mockAccount);

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.deposit('250.00');
    });

    expect(mockApiCall).toHaveBeenCalledWith('POST', '/user/account/deposit', { amount: '250.00' });
  });
});

describe('useAccount - withdraw', () => {
  it('updates account after successful withdrawal', async () => {
    const updatedAccount = { ...mockAccount, balance: '900.00' };
    mockApiCall.mockResolvedValueOnce(updatedAccount);

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.withdraw('100.00');
    });

    expect(result.current.account).toEqual(updatedAccount);
    expect(result.current.error).toBeNull();
  });

  it('sets error when withdrawal fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Insufficient funds'));

    const { result } = renderHook(() => useAccount(false));
    let caughtError: Error | undefined;

    await act(async () => {
      await result.current.withdraw('9999.00').catch((e) => { caughtError = e; });
    });

    expect(caughtError?.message).toBe('Insufficient funds');
    expect(result.current.error).toBe('Insufficient funds');
  });

  it('calls withdraw endpoint with correct amount', async () => {
    mockApiCall.mockResolvedValueOnce(mockAccount);

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.withdraw('50.00');
    });

    expect(mockApiCall).toHaveBeenCalledWith('POST', '/user/account/withdraw', { amount: '50.00' });
  });
});

describe('useAccount - getTransactions', () => {
  it('fetches and sets transactions', async () => {
    mockApiCall.mockResolvedValueOnce({ transactions: mockTransactions });

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.getTransactions();
    });

    expect(result.current.transactions).toEqual(mockTransactions);
    expect(result.current.error).toBeNull();
  });

  it('passes limit and offset to the API', async () => {
    mockApiCall.mockResolvedValueOnce({ transactions: [] });

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.getTransactions(10, 5);
    });

    expect(mockApiCall).toHaveBeenCalledWith('GET', '/user/account/transactions?limit=10&offset=5');
  });

  it('sets error when getTransactions fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Failed to fetch transaction history'));

    const { result } = renderHook(() => useAccount(false));

    await act(async () => {
      await result.current.getTransactions().catch(() => {});
    });

    expect(result.current.error).toBe('Failed to fetch transaction history');
    expect(result.current.transactions).toEqual([]);
  });
});
