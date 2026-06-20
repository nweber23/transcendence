import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfile } from '../useProfile';

vi.mock('@/utils/api', () => ({
  apiCall: vi.fn(),
  apiUpload: vi.fn(),
}));

import { apiCall, apiUpload } from '@/utils/api';

const mockApiCall = vi.mocked(apiCall);
const mockApiUpload = vi.mocked(apiUpload);

const mockProfile = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  avatarURL: 'default_avatar',
  joined_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('useProfile - initialization', () => {
  it('fetches profile on mount when token exists', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall.mockResolvedValueOnce(mockProfile);

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user).toEqual(mockProfile);
    expect(mockApiCall).toHaveBeenCalledWith('GET', '/user/profile');
  });

  it('does not fetch when no token', async () => {
    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.user).toBeNull();
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

describe('useProfile - updateProfile', () => {
  it('calls PUT /user/profile and re-fetches on success', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ...mockProfile, username: 'newname' });

    const { result } = renderHook(() => useProfile());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    await act(async () => {
      await result.current.updateProfile('newname', 'test@example.com');
    });

    expect(mockApiCall).toHaveBeenCalledWith('PUT', '/user/profile', { username: 'newname', email: 'test@example.com' });
    expect(result.current.user?.username).toBe('newname');
  });

  it('includes password in body only when provided', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(mockProfile);

    const { result } = renderHook(() => useProfile());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    await act(async () => {
      await result.current.updateProfile('testuser', 'test@example.com', 'newpassword1');
    });

    expect(mockApiCall).toHaveBeenCalledWith('PUT', '/user/profile', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'newpassword1',
    });
  });

  it('sets error and throws when update fails', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce(mockProfile)
      .mockRejectedValueOnce(new Error('Username taken'));

    const { result } = renderHook(() => useProfile());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    let caught: Error | undefined;
    await act(async () => {
      await result.current.updateProfile('taken', 'test@example.com').catch((e) => { caught = e; });
    });

    expect(caught?.message).toBe('Username taken');
    expect(result.current.error).toBe('Username taken');
  });
});

describe('useProfile - uploadAvatar', () => {
  it('calls POST /user/avatar via apiUpload and re-fetches', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce({ ...mockProfile, avatarURL: 'abc123.jpg' });
    mockApiUpload.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProfile());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.uploadAvatar(file);
    });

    expect(mockApiUpload).toHaveBeenCalledWith('/user/avatar', expect.any(FormData));
    expect(result.current.user?.avatarURL).toBe('abc123.jpg');
  });

  it('sets error and throws when upload fails', async () => {
    localStorage.setItem('auth_token', 'mock-token');
    mockApiCall.mockResolvedValueOnce(mockProfile);
    mockApiUpload.mockRejectedValueOnce(new Error('Storage full'));

    const { result } = renderHook(() => useProfile());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    let caught: Error | undefined;
    const file = new File(['img'], 'avatar.jpg', { type: 'image/jpeg' });
    await act(async () => {
      await result.current.uploadAvatar(file).catch((e) => { caught = e; });
    });

    expect(caught?.message).toBe('Storage full');
    expect(result.current.error).toBe('Storage full');
  });
});
