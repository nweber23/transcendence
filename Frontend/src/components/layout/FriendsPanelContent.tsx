import React, { useState } from 'react';
import { useFriends, Friend, UserSearchResult } from '@/hooks/useFriends';
import Avatar from '@/components/ui/Avatar';

const ghostBtn = 'px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 active:scale-95';

const OnlineDot: React.FC<{ isOnline: boolean }> = ({ isOnline }) => (
  <span
    className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-400' : 'bg-[var(--text-3)]'}`}
    title={isOnline ? 'Online' : 'Offline'}
  />
);

const FriendRow: React.FC<{ friend: Friend; actions: React.ReactNode }> = ({ friend, actions }) => (
  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.06)]">
    <div className="flex items-center gap-2">
      <Avatar avatarURL={friend.avatarURL} size={28} />
      <OnlineDot isOnline={friend.isOnline} />
      <span className="text-sm font-medium text-[var(--text)]">{friend.username || `User #${friend.friendId}`}</span>
    </div>
    {actions}
  </div>
);

type UseFriends = ReturnType<typeof useFriends>;

interface FriendsPanelContentProps {
  friends: UseFriends['friends'];
  incoming: UseFriends['incoming'];
  outgoing: UseFriends['outgoing'];
  searchResults: UseFriends['searchResults'];
  error: UseFriends['error'];
  searchUsers: UseFriends['searchUsers'];
  addFriend: UseFriends['addFriend'];
  removeFriend: UseFriends['removeFriend'];
}

const FriendsPanelContent: React.FC<FriendsPanelContentProps> = ({
  friends,
  incoming,
  outgoing,
  searchResults,
  error,
  searchUsers,
  addFriend,
  removeFriend,
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await searchUsers(query.trim());
  };

  const inputClass =
    'flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.15)] text-[var(--text)] placeholder-[var(--text-3)] focus:outline-none focus:border-[rgba(212,175,55,0.4)] text-sm';

  return (
    <>
      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) searchUsers('');
          }}
          placeholder="Search by username…"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="px-3 py-2 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] text-[var(--gold)] text-xs font-semibold uppercase tracking-wider hover:bg-[rgba(212,175,55,0.18)] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          Search
        </button>
      </form>

      {searchResults.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {searchResults.map((result: UserSearchResult) => {
            const isAlreadyFriend = friends.some((f) => f.friendId === result.id);
            const isOutgoing = outgoing.some((f) => f.friendId === result.id);
            return (
              <div key={result.id} className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-[var(--surface-2)] border border-[rgba(212,175,55,0.06)]">
                <div className="flex items-center gap-2">
                  <Avatar avatarURL={result.avatarURL} size={28} />
                  <span className="text-sm font-medium text-[var(--text)]">{result.username}</span>
                </div>
                <button
                  onClick={() => addFriend(result.id)}
                  disabled={isAlreadyFriend || isOutgoing}
                  className={`${ghostBtn} border ${
                    isAlreadyFriend
                      ? 'border-[rgba(45,122,99,0.3)] text-emerald-400 opacity-60 cursor-not-allowed'
                      : isOutgoing
                      ? 'border-[rgba(212,175,55,0.15)] text-[var(--text-3)] cursor-not-allowed'
                      : 'border-[rgba(212,175,55,0.3)] text-[var(--gold)] hover:bg-[rgba(212,175,55,0.08)]'
                  }`}
                >
                  {isAlreadyFriend ? 'Friends' : isOutgoing ? 'Pending' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {incoming.length > 0 && (
        <div className="mb-3">
          <p className="text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-2">Requests</p>
          <div className="space-y-1.5">
            {incoming.map((f) => (
              <FriendRow
                key={f.friendId}
                friend={f}
                actions={
                  <div className="flex gap-1.5">
                    <button onClick={() => addFriend(f.friendId)} className={`${ghostBtn} border border-[rgba(45,122,99,0.3)] text-emerald-400 hover:bg-[rgba(45,122,99,0.08)]`}>
                      Accept
                    </button>
                    <button onClick={() => removeFriend(f.friendId)} className={`${ghostBtn} border border-[rgba(139,38,53,0.3)] text-red-400 hover:bg-[rgba(139,38,53,0.08)]`}>
                      Decline
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="mb-3">
          <p className="text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-2">Pending</p>
          <div className="space-y-1.5">
            {outgoing.map((f) => (
              <FriendRow
                key={f.friendId}
                friend={f}
                actions={
                  <button onClick={() => removeFriend(f.friendId)} className={`${ghostBtn} border border-[rgba(212,175,55,0.15)] text-[var(--text-3)] hover:text-red-400 hover:border-red-400/30`}>
                    Cancel
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {friends.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-[var(--text-3)] mb-2">Friends</p>
          <div className="space-y-1.5">
            {friends.map((f) => (
              <FriendRow
                key={f.friendId}
                friend={f}
                actions={
                  <button onClick={() => removeFriend(f.friendId)} className={`${ghostBtn} border border-[rgba(139,38,53,0.3)] text-red-400 hover:bg-[rgba(139,38,53,0.08)]`}>
                    Remove
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 && incoming.length === 0 && outgoing.length === 0 && searchResults.length === 0 && (
        <p className="text-sm italic text-[var(--text-3)] text-center py-2">No friends yet — search above</p>
      )}
    </>
  );
};

export default FriendsPanelContent;
