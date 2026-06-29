import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UseFriendsReturn } from '@/hooks/useFriends';
import { useOutsideClick } from '@/utils/useOutsideClick';
import FriendsPanelContent from '@/components/layout/FriendsPanelContent';

const FriendsDropdown: React.FC<UseFriendsReturn> = ({
  friends,
  incoming,
  outgoing,
  searchResults,
  error,
  searchUsers,
  addFriend,
  removeFriend,
  refetch,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useOutsideClick(wrapperRef, () => setOpen(false), open);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) refetch();
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleToggle}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.06)] transition-colors duration-200"
        aria-label="Friends"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        {incoming.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--gold)] text-[#0a0e12] text-[10px] font-bold flex items-center justify-center">
            {incoming.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[70vh] overflow-y-auto bg-[rgba(13,17,23,0.95)] backdrop-blur-xl border border-[rgba(212,175,55,0.15)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 z-50 fade-in-up">
          <FriendsPanelContent
            friends={friends}
            incoming={incoming}
            outgoing={outgoing}
            searchResults={searchResults}
            error={error}
            searchUsers={searchUsers}
            addFriend={addFriend}
            removeFriend={removeFriend}
          />
        </div>
      )}
    </div>
  );
};

export default FriendsDropdown;
