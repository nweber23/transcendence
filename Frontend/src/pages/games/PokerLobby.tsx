import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GameTopBar from '@/components/games/GameTopBar';
import CreateTableModal from '@/components/games/poker/CreateTableModal';
import { useAccount } from '@/hooks/useAccount';
import { usePokerTables, PokerTableSummary, CreatePokerTableRequest } from '@/hooks/usePokerTables';

const PokerLobby: React.FC = () => {
  const { account, getAccount } = useAccount(false);
  useEffect(() => {
    getAccount().catch(() => {});
  }, [getAccount]);
  const balance = account ? Math.floor(Number(account.balance)) : 0;

  const navigate = useNavigate();
  const location = useLocation();
  const pokerNotice = (location.state as { pokerNotice?: string } | null)?.pokerNotice ?? null;
  const { tables, isLoading, error, listTables, createTable } = usePokerTables();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    listTables().catch(() => {});
  }, [listTables]);

  const handleCreate = async (req: CreatePokerTableRequest) => {
    const table = await createTable(req);
    setShowCreate(false);
    navigate(`/games/poker/${table.id}`);
  };

  return (
    <div className="mt-[4.75rem] flex flex-col bg-[var(--base)]" style={{ minHeight: 'calc(100dvh - 4.75rem)' }}>
      <GameTopBar title="Poker" subtitle="Choose a table" balance={balance} />

      <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-[var(--text)]">Open Tables</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs tracking-[0.22em] uppercase bg-[var(--gold)] text-[#0a0e12] hover:opacity-90 active:scale-[0.98] shadow-[0_2px_24px_rgba(212,175,55,0.3)] transition-all cursor-pointer"
          >
            Create Table
          </button>
        </div>

        {pokerNotice && <p className="text-sm text-[var(--gold)]">{pokerNotice}</p>}
        {error && <p className="text-sm text-[#e8a5ae]">{error}</p>}

        {isLoading && tables.length === 0 ? (
          <p className="text-sm text-[var(--text-3)] italic text-center py-10">Loading tables…</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-[var(--text-3)] italic text-center py-10">
            No open tables right now — create one to get a game going.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tables.map((table) => (
              <TableRow key={table.id} table={table} onJoin={() => navigate(`/games/poker/${table.id}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateTableModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
};

const TableRow: React.FC<{ table: PokerTableSummary; onJoin: () => void }> = ({ table, onJoin }) => {
  const isFull = table.seatedCount >= table.maxSeats;
  return (
    <button
      onClick={onJoin}
      className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-[rgba(212,175,55,0.14)] bg-[var(--surface)] hover:border-[var(--gold)] hover:bg-[rgba(212,175,55,0.06)] transition-all text-left cursor-pointer"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-serif text-[1rem] leading-[1.65] text-[var(--gold)] truncate">{table.name}</p>
          {table.isPrivate && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider text-[var(--gold)] border border-[rgba(212,175,55,0.4)]">
              Private
            </span>
          )}
        </div>
        <p className="text-xs text-[#7a8fa3] mt-0.5">
          Blinds ${table.smallBlind} / ${table.bigBlind} · Buy-in ${Number(table.buyIn).toLocaleString()}
        </p>
      </div>
      <div className="shrink-0 text-right leading-tight">
        <p className={`font-serif text-lg ${isFull ? 'text-[#7a8fa3]' : 'text-[var(--gold)]'}`}>
          {table.seatedCount}/{table.maxSeats}
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#7a8fa3]">
          {table.spectatorCount > 0 ? `+${table.spectatorCount} watching` : 'seated'}
        </p>
      </div>
    </button>
  );
};

export default PokerLobby;
