import { useMemo, useState } from 'react';
import {
  Heart,
  Armchair,
  Map,
  Gift,
  LogOut,
  Lock,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import LayoutPlanner from './LayoutPlanner';
import GiftRegistry from './GiftRegistry';

export default function GuestPortal({
  wedding,
  guest,
  guests = [],
  tables = [],
  layoutItems = [],
  gifts = [],
  onReserveGift,
  onLogout,
  onNotify,
}) {
  const [tab, setTab] = useState('table'); // 'table' | 'layout' | 'gifts'

  const myTable = useMemo(() => {
    if (!guest?.tableId) return null;
    return tables.find((t) => t.id === guest.tableId) || null;
  }, [guest?.tableId, tables]);

  const tableCompanions = useMemo(() => {
    if (!myTable) return [];
    return guests.filter((g) => g.tableId === myTable.id);
  }, [myTable, guests]);

  const noop = async () => {};

  const handleReserve = async (giftId, updates) => {
    if (onReserveGift) {
      await onReserveGift(giftId, {
        ...updates,
        reservedBy: updates?.reservedBy || guest?.name || 'Convidado',
      });
      onNotify?.('Presente reservado com sucesso!');
    }
  };

  return (
    <div className="min-h-screen bg-primary text-ink pb-16">
      <header className="bg-card border-b border-theme sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent text-accent-contrast flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold leading-tight">
                  {wedding?.coupleNames || 'Nosso Casamento'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-subtle border border-theme text-muted">
                  <Lock className="w-3 h-3" />
                  Somente leitura
                </span>
              </div>
              <p className="text-xs text-muted">
                Bem-vindo(a),{' '}
                <span className="font-semibold text-ink">
                  {guest?.name || 'Convidado'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-subtle border border-theme text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        {(wedding?.weddingDate || wedding?.weddingTime || wedding?.venue) && (
          <div className="bg-subtle/60 border-t border-theme">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-4 text-xs text-muted">
              {wedding?.weddingDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-ink" />
                  {wedding.weddingDate}
                </span>
              )}
              {wedding?.weddingTime && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-ink" />
                  {wedding.weddingTime}
                </span>
              )}
              {wedding?.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ink" />
                  {wedding.venue}
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      <nav className="max-w-6xl mx-auto px-4 sm:px-6 pt-5">
        <div className="flex flex-wrap gap-2 bg-card border border-theme p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab('table')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              tab === 'table'
                ? 'bg-accent text-accent-contrast'
                : 'text-muted hover:text-ink hover:bg-subtle'
            }`}
          >
            <Armchair className="w-4 h-4" />
            Minha Mesa
          </button>

          <button
            type="button"
            onClick={() => setTab('layout')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              tab === 'layout'
                ? 'bg-accent text-accent-contrast'
                : 'text-muted hover:text-ink hover:bg-subtle'
            }`}
          >
            Layout do Salão
          </button>

          <button
            type="button"
            onClick={() => setTab('gifts')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              tab === 'gifts'
                ? 'bg-accent text-accent-contrast'
                : 'text-muted hover:text-ink hover:bg-subtle'
            }`}
          >
            <Gift className="w-4 h-4" />
            Lista de Presentes
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {tab === 'table' && (
          <div className="bg-card border border-theme rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-xl font-bold">Minha Mesa</h2>
              <p className="text-sm text-muted">
                Confira sua localização reservada na recepção (visualização somente leitura).
              </p>
            </div>

            {myTable ? (
              <div className="rounded-2xl bg-subtle border border-theme p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-muted">
                      Mesa Designada
                    </span>
                    <h3 className="text-2xl font-bold mt-0.5">{myTable.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-contrast">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Capacidade: {myTable.capacity || 8} lugares
                  </span>
                </div>

                {tableCompanions.length > 0 && (
                  <div className="pt-2 border-t border-theme">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                      Convidados nesta mesa
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tableCompanions.map((person) => (
                        <span
                          key={person.id}
                          className="px-3 py-1.5 rounded-xl bg-card border border-theme text-xs font-medium"
                        >
                          {person.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-subtle border border-theme p-6 text-sm text-muted">
                Sua mesa ainda não foi atribuída pelos noivos. Você pode consultar o{' '}
                <button
                  type="button"
                  onClick={() => setTab('layout')}
                  className="font-semibold text-ink underline cursor-pointer"
                >
                  Layout do Salão
                </button>{' '}
                enquanto isso.
              </div>
            )}
          </div>
        )}

        {tab === 'layout' && (
          <LayoutPlanner
            wedding={wedding}
            weddingId={wedding?.id}
            tables={tables}
            guests={guests}
            layoutItems={layoutItems}
            readOnly={true}
            onAddTable={noop}
            onUpdateTable={noop}
            onDeleteTable={noop}
            onAddLayoutItem={noop}
            onUpdateLayoutItem={noop}
            onDeleteLayoutItem={noop}
            onNotify={onNotify}
          />
        )}

        {tab === 'gifts' && (
          <GiftRegistry
            items={gifts}
            readOnly={true}
            guestName={guest?.name || ''}
            onAdd={noop}
            onUpdate={handleReserve}
            onDelete={noop}
            onNotify={onNotify}
          />
        )}
      </main>
    </div>
  );
}