import { useMemo, useState } from 'react';
import {
  UserPlus,
  Send,
  Search,
  Upload,
  Download,
  Printer,
  LayoutList,
  LayoutGrid,
  Edit3,
  Trash2,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  FileText,
  QrCode,
  KeyRound,
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import GuestModal from '../components/modals/GuestModal';
import InviteModal from '../components/modals/InviteModal';
import ImportModal from '../components/modals/ImportModal';
import PrintQrModal from '../components/modals/PrintQrModal';
import {
  addGuest,
  updateGuest,
  deleteGuest,
  markInviteSent,
  bulkUpdateGuests,
  bulkDeleteGuests,
  bulkImportGuests,
  exportGuestsCSV,
} from '../services/guestService';
import { updateWeddingInfo } from '../services/weddingService';

const RSVP_CYCLE = {
  pendente: 'confirmado',
  confirmado: 'recusado',
  recusado: 'pendente',
};

export default function GuestsAdmin({
  uid,
  wedding,
  guests,
  stats,
  tables,
  onOpenGuestPreview,
  onNotify,
}) {
  const [search, setSearch] = useState('');
  const [filterRsvp, setFilterRsvp] = useState('todos');
  const [filterInvite, setFilterInvite] = useState('todos');
  const [filterGroup, setFilterGroup] = useState('todos');
  const [filterTable, setFilterTable] = useState('todos');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('table');

  const [selectedIds, setSelectedIds] = useState([]);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invitingGuest, setInvitingGuest] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [printQrOpen, setPrintQrOpen] = useState(false);

  const tablesMap = useMemo(() => {
    const map = {};
    tables.forEach((t) => {
      map[t.id] = t.name;
    });
    return map;
  }, [tables]);

  const existingPins = useMemo(() => {
    return new Set(guests.map((g) => g.pin).filter(Boolean));
  }, [guests]);

  const filteredGuests = useMemo(() => {
    return guests
      .filter((g) => {
        const q = search.toLowerCase().trim();
        if (q) {
          const match =
            g.name?.toLowerCase().includes(q) ||
            g.phone?.toLowerCase().includes(q) ||
            g.email?.toLowerCase().includes(q) ||
            g.pin?.toLowerCase().includes(q) ||
            g.dietary?.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (filterRsvp !== 'todos' && g.rsvp !== filterRsvp) return false;
        if (filterInvite === 'enviado' && !g.inviteSent) return false;
        if (filterInvite === 'pendente' && g.inviteSent) return false;
        if (filterGroup !== 'todos' && g.group !== filterGroup) return false;
        if (filterTable === 'sem_mesa' && g.tableId) return false;
        if (filterTable !== 'todos' && filterTable !== 'sem_mesa' && g.tableId !== filterTable)
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'group') return (a.group || '').localeCompare(b.group || '');
        if (sortBy === 'rsvp') return (a.rsvp || '').localeCompare(b.rsvp || '');
        if (sortBy === 'people') {
          const pa = (Number(a.adults) || 0) + (Number(a.children) || 0);
          const pb = (Number(b.adults) || 0) + (Number(b.children) || 0);
          return pb - pa;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [guests, search, filterRsvp, filterInvite, filterGroup, filterTable, sortBy]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredGuests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredGuests.map((g) => g.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveGuest = async (payload, guestId) => {
    if (guestId) {
      await updateGuest(uid, guestId, payload);
      onNotify?.('Convidado atualizado com sucesso!');
    } else {
      await addGuest(uid, payload, existingPins);
      onNotify?.('Convidado adicionado à lista!');
    }
  };

  const handleSaveAndInvite = async (payload, guestId) => {
    let targetId = guestId;
    if (guestId) {
      await updateGuest(uid, guestId, payload);
    } else {
      targetId = await addGuest(uid, payload, existingPins);
    }
    setInvitingGuest({ id: targetId, ...payload });
    setInviteModalOpen(true);
  };

  const handleCycleRsvp = async (guest) => {
    const next = RSVP_CYCLE[guest.rsvp] || 'confirmado';
    await updateGuest(uid, guest.id, { rsvp: next });
    onNotify?.(`${guest.name}: status alterado para ${next.toUpperCase()}`);
  };

  const renderRsvpBadge = (guest) => {
    const map = {
      confirmado: {
        label: 'Confirmado',
        icon: CheckCircle2,
        cls: 'bg-accent text-accent-contrast',
      },
      recusado: {
        label: 'Recusado',
        icon: XCircle,
        cls: 'bg-subtle text-muted line-through',
      },
      pendente: {
        label: 'Pendente',
        icon: Clock,
        cls: 'bg-subtle text-ink border border-theme',
      },
    };
    const cfg = map[guest.rsvp] || map.pendente;
    const Icon = cfg.icon;
    return (
      <button
        type="button"
        onClick={() => handleCycleRsvp(guest)}
        title="Clique para alternar RSVP"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${cfg.cls}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {cfg.label}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Administrar Convidados</h2>
          <p className="text-sm text-muted">
            {stats.totalInvites} convite(s) • {stats.totalPeople} pessoa(s) •{' '}
            {stats.invitesSent} enviado(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => {
              setEditingGuest(null);
              setGuestModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Novo Convidado
          </button>

          <button
            type="button"
            onClick={() => setPrintQrOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-accent/15 border border-theme text-ink text-sm font-semibold hover:bg-subtle cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            QR Code Convite Impresso
          </button>

          <button
            type="button"
            onClick={() => {
              setInvitingGuest(null);
              setInviteModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-sm font-semibold hover:bg-subtle cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Modelo Convite
          </button>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-sm font-semibold hover:bg-subtle cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Importar
          </button>

          <button
            type="button"
            onClick={() => exportGuestsCSV(guests, tablesMap)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-sm font-semibold hover:bg-subtle cursor-pointer"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-sm font-semibold hover:bg-subtle cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros & Busca */}
      {guests.length > 0 && (
        <div className="bg-card border border-theme rounded-2xl p-4 space-y-3 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar nome, PIN, celular, restrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
              />
            </div>

            <select
              value={filterRsvp}
              onChange={(e) => setFilterRsvp(e.target.value)}
              className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
            >
              <option value="todos">RSVP: Todos</option>
              <option value="confirmado">Confirmados</option>
              <option value="pendente">Pendentes</option>
              <option value="recusado">Recusados</option>
            </select>

            <select
              value={filterInvite}
              onChange={(e) => setFilterInvite(e.target.value)}
              className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
            >
              <option value="todos">Convite: Todos</option>
              <option value="enviado">Enviados</option>
              <option value="pendente">Não enviados</option>
            </select>

            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
            >
              <option value="todos">Grupo: Todos</option>
              <option value="Família Noiva">Família Noiva</option>
              <option value="Família Noivo">Família Noivo</option>
              <option value="Padrinhos">Padrinhos</option>
              <option value="Amigos">Amigos</option>
              <option value="Trabalho">Trabalho</option>
              <option value="Outros">Outros</option>
            </select>

            <select
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
              className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
            >
              <option value="todos">Mesa: Todas</option>
              <option value="sem_mesa">Sem mesa</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-primary border border-theme text-ink text-xs"
              >
                <option value="name">Nome (A-Z)</option>
                <option value="group">Grupo</option>
                <option value="rsvp">Status RSVP</option>
                <option value="people">Qtd. Pessoas</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg cursor-pointer ${
                  viewMode === 'table' ? 'bg-accent text-accent-contrast' : 'bg-subtle text-ink'
                }`}
                title="Visualização em Tabela"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg cursor-pointer ${
                  viewMode === 'cards' ? 'bg-accent text-accent-contrast' : 'bg-subtle text-ink'
                }`}
                title="Visualização em Cartões"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ações em Lote */}
      {selectedIds.length > 0 && (
        <div className="bg-accent text-accent-contrast rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 no-print">
          <span className="text-xs font-bold">
            {selectedIds.length} convidado(s) selecionado(s)
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await bulkUpdateGuests(uid, selectedIds, { rsvp: 'confirmado' });
                setSelectedIds([]);
                onNotify?.('Convidados confirmados em lote!');
              }}
              className="px-3 py-1.5 rounded-lg bg-card text-ink text-xs font-semibold cursor-pointer"
            >
              Confirmar Presença
            </button>
            <button
              type="button"
              onClick={async () => {
                await bulkUpdateGuests(uid, selectedIds, { inviteSent: true });
                setSelectedIds([]);
                onNotify?.('Convites marcados como enviados!');
              }}
              className="px-3 py-1.5 rounded-lg bg-card text-ink text-xs font-semibold cursor-pointer"
            >
              Marcar Enviado
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`Excluir ${selectedIds.length} convidado(s)?`)) return;
                await bulkDeleteGuests(uid, selectedIds);
                setSelectedIds([]);
                onNotify?.('Convidados removidos.', 'info');
              }}
              className="px-3 py-1.5 rounded-lg bg-card text-ink text-xs font-semibold cursor-pointer"
            >
              Excluir
            </button>
          </div>
        </div>
      )}

      {/* Lista de Convidados */}
      {guests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum convidado cadastrado"
          description="Adicione seus convidados com celular ou nome para gerar automaticamente o PIN de acesso ao convite."
          actionLabel="Adicionar Primeiro Convidado"
          onAction={() => {
            setEditingGuest(null);
            setGuestModalOpen(true);
          }}
        />
      ) : viewMode === 'table' ? (
        <div className="bg-card border border-theme rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-ink text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-10 no-print">
                  <input
                    type="checkbox"
                    checked={
                      filteredGuests.length > 0 &&
                      selectedIds.length === filteredGuests.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3.5">Convidado</th>
                <th className="p-3.5">PIN</th>
                <th className="p-3.5">Contato</th>
                <th className="p-3.5">Pessoas</th>
                <th className="p-3.5">Mesa</th>
                <th className="p-3.5">RSVP</th>
                <th className="p-3.5 text-right no-print">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest) => {
                const total = (Number(guest.adults) || 0) + (Number(guest.children) || 0);
                return (
                  <tr key={guest.id} className="border-t border-theme hover:bg-subtle/40">
                    <td className="p-3.5 no-print">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(guest.id)}
                        onChange={() => toggleSelectOne(guest.id)}
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-ink">{guest.name}</div>
                      <div className="text-xs text-muted">{guest.group}</div>
                      {guest.dietary && (
                        <div className="text-[11px] text-ink mt-0.5">
                          Obs: {guest.dietary}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-subtle border border-theme font-mono text-xs font-bold text-ink">
                        <KeyRound className="w-3 h-3 text-muted" />
                        {guest.pin || '----'}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-muted space-y-1">
                      {guest.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> {guest.phone}
                        </div>
                      )}
                      {guest.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> {guest.email}
                        </div>
                      )}
                      {!guest.phone && !guest.email && <span>Sem contato</span>}
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-ink">
                      {total} ({guest.adults ?? 1}A + {guest.children ?? 0}C)
                    </td>
                    <td className="p-3.5 text-xs">
                      {guest.tableId && tablesMap[guest.tableId] ? (
                        <span className="px-2.5 py-1 rounded-full bg-subtle text-ink font-medium">
                          {tablesMap[guest.tableId]}
                        </span>
                      ) : (
                        <span className="text-muted">Sem mesa</span>
                      )}
                    </td>
                    <td className="p-3.5">{renderRsvpBadge(guest)}</td>
                    <td className="p-3.5 text-right no-print">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInvitingGuest(guest);
                            setInviteModalOpen(true);
                          }}
                          title="Enviar convite / Ver QR Code individual"
                          className={`p-2 rounded-lg cursor-pointer ${
                            guest.inviteSent
                              ? 'bg-accent text-accent-contrast'
                              : 'bg-subtle text-ink'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGuest(guest);
                            setGuestModalOpen(true);
                          }}
                          title="Editar convidado"
                          className="p-2 rounded-lg bg-subtle text-ink cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteGuest(uid, guest.id);
                            onNotify?.('Convidado excluído.', 'info');
                          }}
                          title="Excluir convidado"
                          className="p-2 rounded-lg bg-subtle text-ink cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuests.map((guest) => {
            const total = (Number(guest.adults) || 0) + (Number(guest.children) || 0);
            return (
              <div
                key={guest.id}
                className="bg-card border border-theme rounded-2xl p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-ink">{guest.name}</h3>
                      <span className="text-xs text-muted">
                        {guest.group} • {total} pessoa(s)
                      </span>
                    </div>
                    {renderRsvpBadge(guest)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-subtle border border-theme font-mono font-bold text-ink">
                      PIN: {guest.pin || '----'}
                    </span>
                    {guest.phone && <span className="text-muted">{guest.phone}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-theme no-print">
                  <button
                    type="button"
                    onClick={() => {
                      setInvitingGuest(guest);
                      setInviteModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
                  >
                    <Send className="w-3 h-3" /> Convite
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGuest(guest);
                      setGuestModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-subtle text-ink cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteGuest(uid, guest.id);
                      onNotify?.('Convidado excluído.', 'info');
                    }}
                    className="p-1.5 rounded-lg bg-subtle text-ink cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <GuestModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        guest={editingGuest}
        tables={tables}
        onSaveGuest={handleSaveGuest}
        onSaveAndInvite={handleSaveAndInvite}
      />

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        guest={invitingGuest}
        wedding={wedding}
        weddingId={uid}
        onSaveTemplate={(tpl) => updateWeddingInfo(uid, { inviteTemplate: tpl })}
        onMarkSent={(id, channel) => markInviteSent(uid, id, channel)}
        onNotify={onNotify}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={async (rows) => {
          await bulkImportGuests(uid, rows, existingPins);
          onNotify?.(`${rows.length} convidado(s) importado(s)!`);
        }}
      />

      <PrintQrModal
        isOpen={printQrOpen}
        onClose={() => setPrintQrOpen(false)}
        weddingId={uid}
        wedding={wedding}
        guests={guests}
        onOpenGuestPreview={onOpenGuestPreview}
        onNotify={onNotify}
      />
    </div>
  );
}