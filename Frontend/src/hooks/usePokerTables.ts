import { useCallback, useState } from 'react';
import { apiCall } from '@/utils/api';

export interface PokerTableSummary {
  id: number;
  hostUserId: number;
  name: string;
  status: string;
  isPrivate: boolean;
  maxSeats: number;
  buyIn: string;
  smallBlind: string;
  bigBlind: string;
  createdAt: string;
  seatedCount: number;
  spectatorCount: number;
}

interface RawPokerTable {
  id: number;
  host_user_id: number;
  name: string;
  status: string;
  is_private: boolean;
  max_seats: number;
  buy_in: string;
  small_blind: string;
  big_blind: string;
  created_at: string;
  seated_count: number;
  spectator_count: number;
}

interface RawPokerTableList {
  tables: RawPokerTable[];
  total: number;
}

export interface CreatePokerTableRequest {
  name: string;
  isPrivate: boolean;
  maxSeats: number;
  buyIn: string;
  smallBlind: string;
  bigBlind: string;
}

function toPokerTable(raw: RawPokerTable): PokerTableSummary {
  return {
    id: raw.id,
    hostUserId: raw.host_user_id,
    name: raw.name,
    status: raw.status,
    isPrivate: raw.is_private,
    maxSeats: raw.max_seats,
    buyIn: raw.buy_in,
    smallBlind: raw.small_blind,
    bigBlind: raw.big_blind,
    createdAt: raw.created_at,
    seatedCount: raw.seated_count,
    spectatorCount: raw.spectator_count,
  };
}

export function usePokerTables() {
  const [tables, setTables] = useState<PokerTableSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listTables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const raw = await apiCall<RawPokerTableList>('GET', '/poker-tables?limit=50');
      setTables(raw.tables.map(toPokerTable));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load poker tables');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTable = async (req: CreatePokerTableRequest): Promise<PokerTableSummary> => {
    const raw = await apiCall<RawPokerTable>('POST', '/poker-tables', {
      name: req.name,
      is_private: req.isPrivate,
      max_seats: req.maxSeats,
      buy_in: req.buyIn,
      small_blind: req.smallBlind,
      big_blind: req.bigBlind,
    });
    return toPokerTable(raw);
  };

  const getTable = async (id: number): Promise<PokerTableSummary> => {
    const raw = await apiCall<RawPokerTable>('GET', `/poker-tables/${id}`);
    return toPokerTable(raw);
  };

  const updateSettings = async (
    id: number,
    settings: { name: string; isPrivate: boolean; maxSeats: number; buyIn: string; smallBlind: string; bigBlind: string }
  ): Promise<PokerTableSummary> => {
    const raw = await apiCall<RawPokerTable>('PUT', `/poker-tables/${id}/settings`, {
      name: settings.name,
      is_private: settings.isPrivate,
      max_seats: settings.maxSeats,
      buy_in: settings.buyIn,
      small_blind: settings.smallBlind,
      big_blind: settings.bigBlind,
    });
    return toPokerTable(raw);
  };

  const closeTable = async (id: number): Promise<void> => {
    await apiCall('POST', `/poker-tables/${id}/close`, undefined);
  };

  const inviteUser = async (id: number, userId: number): Promise<void> => {
    await apiCall('POST', `/poker-tables/${id}/invite`, { user_id: userId });
  };

  const kickUser = async (id: number, userId: number): Promise<void> => {
    await apiCall('POST', `/poker-tables/${id}/kick`, { user_id: userId });
  };

  return { tables, isLoading, error, listTables, createTable, getTable, updateSettings, closeTable, inviteUser, kickUser };
}
