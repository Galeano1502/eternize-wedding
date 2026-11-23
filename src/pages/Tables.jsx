import { useState } from 'react';
import { Plus, Trash2, LayoutGrid, UserPlus, UserMinus } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { updateGuest } from '../services/guestService';

export default function Tables({ uid, tables, guests, onAdd, onDelete, onNotify }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(8);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), capacity: Number(capacity) || 8 });
    setName('');
    onNotify?.('Mesa criada!');
  };

  const unassignedGuests = guests.filter((g) => !g.tableId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Mapa & Organização de Mesas</h2>
        <p className="text-sm text-muted">
          Crie as mesas da recepção e distribua seus convidados controlando a lotação.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-card border border-theme rounded-2xl p-4 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          required
          placeholder="Nome da mesa (ex: Mesa 01 — Família Noiva)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />
        <input
          type="number"
          min="1"
          max="30"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="w-full sm:w-32 px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Criar Mesa
        </button>
      </form>

      {tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhuma mesa criada ainda"
          description="Crie as mesas do salão acima para começar a alocar seus convidados."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((table) => {
              const seated = guests.filter((g) => g.tableId === table.id);
              const occupiedSeats = seated.reduce(
                (acc, g) => acc + (Number(g.adults) || 0) + (Number(g.children) || 0),
                0
              );
              const isOver = occupiedSeats > table.capacity;
              const pct = Math.min(100, Math.round((occupiedSeats / table.capacity) * 100));

              return (
                <div
                  key={table.id}
                  className="bg-card border border-theme rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-ink">{table.name}</h3>
                      <p className="text-xs text-muted">
                        {occupiedSeats} / {table.capacity} lugares ocupados{' '}
                        {isOver ? '(Superlotada!)' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onDelete(table.id);
                        onNotify?.('Mesa removida.');
                      }}
                      className="p-1.5 rounded-lg bg-subtle text-ink cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-full h-2 bg-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {seated.length === 0 ? (
                      <p className="text-xs text-muted">Nenhum convidado nesta mesa.</p>
                    ) : (
                      seated.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-subtle text-xs"
                        >
                          <span className="font-medium text-ink">
                            {g.name} ({(Number(g.adults) || 0) + (Number(g.children) || 0)}p)
                          </span>
                          <button
                            onClick={() => updateGuest(uid, g.id, { tableId: null })}
                            title="Remover da mesa"
                            className="text-muted hover:text-ink cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Painel Lateral: Convidados sem Mesa */}
          <div className="bg-card border border-theme rounded-2xl p-5 h-fit space-y-3">
            <h3 className="font-bold text-ink">
              Sem Mesa ({unassignedGuests.length})
            </h3>
            {unassignedGuests.length === 0 ? (
              <p className="text-xs text-muted">
                Todos os convidados cadastrados já possuem mesa ou a lista está vazia.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {unassignedGuests.map((g) => (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-xl bg-subtle flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink">{g.name}</div>
                      <div className="text-muted">
                        {(Number(g.adults) || 0) + (Number(g.children) || 0)} pessoa(s)
                      </div>
                    </div>
                    <select
                      defaultValue=""
                      onChange={async (e) => {
                        if (!e.target.value) return;
                        await updateGuest(uid, g.id, { tableId: e.target.value });
                        onNotify?.(`${g.name} alocado(a)!`);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-card border border-theme text-ink text-xs"
                    >
                      <option value="">Alocar...</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
