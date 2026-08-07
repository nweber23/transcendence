package ws

import "sync"

// pokerRegistry maps live table IDs to their in-memory PokerTable runtime.
// Its mutex is distinct from any PokerTable's own mutex and guards ONLY the
// map itself — never a table's internal state.
//
// Lock-ordering rule, enforced everywhere in this package: never hold the
// registry mutex and a PokerTable.mutex at the same time. Every operation
// that needs both does them as two sequential, non-overlapping critical
// sections (e.g. closing a table: lock+settle+unlock the table, THEN lock
// the registry to delete the entry). get()/snapshot() only ever hold the
// registry lock long enough to copy pointers out, never while touching what
// they point to.
type pokerRegistry struct {
	mutex  sync.RWMutex
	tables map[uint]*PokerTable
}

func newPokerRegistry() *pokerRegistry {
	return &pokerRegistry{tables: make(map[uint]*PokerTable)}
}

func (r *pokerRegistry) get(tableID uint) *PokerTable {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	return r.tables[tableID]
}

func (r *pokerRegistry) add(table *PokerTable) {
	r.mutex.Lock()
	r.tables[table.id] = table
	r.mutex.Unlock()
}

func (r *pokerRegistry) remove(tableID uint) {
	r.mutex.Lock()
	delete(r.tables, tableID)
	r.mutex.Unlock()
}

// snapshot returns a stable copy of all live table pointers, for callers
// (pokerHandleDisconnect) that must scan every table without holding the
// registry lock while doing per-table work.
func (r *pokerRegistry) snapshot() []*PokerTable {
	r.mutex.RLock()
	defer r.mutex.RUnlock()
	tables := make([]*PokerTable, 0, len(r.tables))
	for _, table := range r.tables {
		tables = append(tables, table)
	}
	return tables
}
