import React, { useState } from 'react';
import GameInfoModal from '@/components/games/GameInfoModal';
import Avatar from '@/components/ui/Avatar';
import { apiCall } from '@/utils/api';

interface UserSearchResult {
  id: number;
  username: string;
  avatarURL: string;
}

interface InvitePanelProps {
  onClose: () => void;
  onInvite: (userId: number) => Promise<void>;
}

/* Same search-box-with-result-rows shape as FriendsPanelContent, reusing
   the existing GET /user/search endpoint — invite has no lookup mechanism
   of its own. */
const InvitePanel: React.FC<InvitePanelProps> = ({ onClose, onInvite }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      const found = await apiCall<UserSearchResult[]>('GET', `/user/search?q=${encodeURIComponent(query.trim())}&limit=10`);
      setResults(found);
    } catch {
      setResults([]);
    }
  };

  const handleInvite = async (userId: number) => {
    setError(null);
    try {
      await onInvite(userId);
      setInvitedIds((prev) => new Set(prev).add(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    }
  };

  const inputClass =
    'flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.15)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[rgba(212,175,55,0.4)] text-sm';

  return (
    <GameInfoModal title="Invite Players" onClose={onClose}>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          className={inputClass}
          autoFocus
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-3 py-2 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] text-[var(--gold)] text-xs font-semibold uppercase tracking-wider hover:bg-[rgba(212,175,55,0.18)] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          Search
        </button>
      </form>

      {error && <p className="text-xs text-[#e8a5ae]">{error}</p>}

      <div className="flex flex-col gap-1.5">
        {results.map((result) => {
          const invited = invitedIds.has(result.id);
          return (
            <div
              key={result.id}
              className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.06)]"
            >
              <div className="flex items-center gap-2">
                <Avatar avatarURL={result.avatarURL} size={28} />
                <span className="text-sm font-medium text-[var(--text)]">{result.username}</span>
              </div>
              <button
                onClick={() => handleInvite(result.id)}
                disabled={invited}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 active:scale-95 border ${
                  invited
                    ? 'border-[rgba(45,122,99,0.3)] text-emerald-400 opacity-60 cursor-not-allowed'
                    : 'border-[rgba(212,175,55,0.3)] text-[var(--gold)] hover:bg-[rgba(212,175,55,0.08)]'
                }`}
              >
                {invited ? 'Invited' : 'Invite'}
              </button>
            </div>
          );
        })}
        {results.length === 0 && <p className="text-sm italic text-[var(--text-3)] text-center py-2">Search for a player to invite</p>}
      </div>
    </GameInfoModal>
  );
};

export default InvitePanel;
