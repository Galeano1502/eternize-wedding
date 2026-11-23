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
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import GuestModal from '../components/modals/GuestModal';
import InviteModal from '../components/modals/InviteModal';
import ImportModal from '../components/modals/ImportModal';
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

export default function GuestsAdmin({ uid, wedding, guests, stats, tables, onNotify }) {
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

  const tablesMap = useMemo(() => {
    const map = {};
    tables.forEach((t) => {
      map[t.id] = t.name;
    });
    return map;
  }, [tables]);

  const filteredGuests = useMemo(() => {
    return guests
      .filter((g) => {
        const q = search.toLowerCase().trim();
        if (q) {
          const match =
            g.name?.toLowerCase().includes(q) ||
            g.phone?.toLowerCase().includes(q) ||
            g.email?.toLowerCase().includes(q) ||
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
      await addGuest(uid, payload);
      onNotify?.('Convidado adicionado à lista!');
    }
  };

  const handleSaveAndInvite = async (payload, guestId) => {
    let targetId = guestId;
    if (guestId) {
      await updateGuest(uid, guestId, payload);
    } else {
      targetId = await addGuest(uid, payload);
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
      {/* Cabeçalho da Administração de Convidados */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-ink">Administração de Convidados</h2>
          <p className="text-sm text-muted">
            Gerencie confirmações RSVP, envie convites por WhatsApp/E-mail e organize mesas em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setInvitingGuest(null);
              setInviteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-xs font-semibold hover:bg-subtle transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Modelo de Convite
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-xs font-semibold hover:bg-subtle transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Importar Lista
          </button>

          <button
            onClick={() => exportGuestsCSV(filteredGuests, tablesMap)}
            disabled={guests.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-xs font-semibold hover:bg-subtle disabled:opacity-40 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          <button
            onClick={() => window.print()}
            disabled={guests.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-card border border-theme text-ink text-xs font-semibold hover:bg-subtle disabled:opacity-40 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Portaria
          </button>

          <button
            onClick={() => {
              setEditingGuest(null);
              setGuestModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Novo Convidado
          </button>
        </div>
      </div>

      {/* 4 Sub-KPIs Exclusivos de Convidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="bg-card border border-theme rounded-xl p-4">
          <div className="text-xs text-muted font-semibold uppercase">Total na Lista</div>
          <div className="text-2xl font-bold text-ink mt-1">{stats.totalPeople} pessoas</div>
          <div className="text-xs text-muted mt-0.5">
            {stats.totalAdults} adultos • {stats.totalChildren} crianças • {stats.totalInvites} convites
          </div>
        </div>

        <div className="bg-card border border-theme rounded-xl p-4">
          <div className="text-xs text-muted font-semibold uppercase">Status RSVP</div>
          <div className="text-2xl font-bold text-ink mt-1">
            {stats.confirmedPeople} confirmados
          </div>
          <div className="text-xs text-muted mt-0.5">
            {stats.pendingPeople} pendentes • {stats.declinedPeople} recusados
          </div>
        </div>

        <div className="bg-card border border-theme rounded-xl p-4">
          <div className="text-xs text-muted font-semibold uppercase">Envio de Convites</div>
          <div className="text-2xl font-bold text-ink mt-1">
            {stats.invitesSent} / {stats.totalInvites} enviados
          </div>
          <div className="text-xs text-muted mt-0.5">
            {stats.invitesPending} aguardando envio
          </div>
        </div>

        <div className="bg-card border border-theme rounded-xl p-4">
          <div className="text-xs text-muted font-semibold uppercase">Mesas & Restrições</div>
          <div className="text-2xl font-bold text-ink mt-1">
            {stats.withTable} alocados
          </div>
          <div className="text-xs text-muted mt-0.5">
            {stats.withDietary} com restrição alimentar
          </div>
        </div>
      </div>

      {guests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sua lista de convidados está vazia"
          description="Adicione convidados manualmente com celular ou e-mail para enviar convites personalizados, ou importe uma lista completa de uma só vez."
          actionLabel="Adicionar Primeiro Convidado"
          onAction={() => {
            setEditingGuest(null);
            setGuestModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* Barra de Busca e Filtros */}
          <div className="bg-card border border-theme rounded-2xl p-4 space-y-3 no-print">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone, e-mail..."
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
                <option value="enviado">Convite Enviado</option>
                <option value="pendente">Não Enviado</option>
              </select>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
              >
                <option value="todos">Grupo: Todos</option>
                <option value="Família Noiva">Família Noiva</option>
                <option value="Família Noivo">Família Noivo</option>
                <option value="Amigos">Amigos</option>
                <option value="Padrinhos">Padrinhos</option>
                <option value="Trabalho">Trabalho</option>
              </select>

              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
                >
                  <option value="name">Ordenar: Nome</option>
                  <option value="group">Ordenar: Grupo</option>
                  <option value="rsvp">Ordenar: RSVP</option>
                  <option value="people">Ordenar: Qtd. Pessoas</option>
                </select>

                <div className="flex rounded-xl bg-subtle p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      viewMode === 'table' ? 'bg-accent text-accent-contrast' : 'text-ink'
                    }`}
                    title="Visualização em Tabela"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      viewMode === 'cards' ? 'bg-accent text-accent-contrast' : 'text-ink'
                    }`}
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Barra de Ações em Lote */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-theme">
                <span className="text-xs font-bold text-ink">
                  {selectedIds.length} convidado(s) selecionado(s)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      await bulkUpdateGuests(uid, selectedIds, { rsvp: 'confirmado' });
                      setSelectedIds([]);
                      onNotify?.('Convidados confirmados em lote!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
                  >
                    Confirmar RSVP
                  </button>
                  <button
                    onClick={async () => {
                      await bulkUpdateGuests(uid, selectedIds, { inviteSent: true, inviteChannel: 'lote' });
                      setSelectedIds([]);
                      onNotify?.('Convites marcados como enviados!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-subtle text-ink text-xs font-semibold cursor-pointer"
                  >
                    Marcar Convite Enviado
                  </button>
                  {tables.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={async (e) => {
                        if (!e.target.value) return;
                        await bulkUpdateGuests(uid, selectedIds, { tableId: e.target.value });
                        setSelectedIds([]);
                        onNotify?.('Mesa atribuída em lote!');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-primary border border-theme text-ink text-xs"
                    >
                      <option value="">Atribuir Mesa...</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={async () => {
                      await bulkDeleteGuests(uid, selectedIds);
                      setSelectedIds([]);
                      onNotify?.('Convidados removidos.');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-subtle text-ink text-xs font-semibold hover:opacity-80 cursor-pointer"
                  >
                    Excluir Selecionados
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Listagem Tabela ou Cards */}
          {viewMode === 'table' ? (
            <div className="bg-card border border-theme rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-subtle text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="p-3.5 no-print">
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
                    <th className="p-3.5">Contato</th>
                    <th className="p-3.5">Grupo / Pessoas</th>
                    <th className="p-3.5">RSVP</th>
                    <th className="p-3.5">Convite</th>
                    <th className="p-3.5">Mesa</th>
                    <th className="p-3.5 text-right no-print">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((g) => (
                    <tr key={g.id} className="border-t border-theme hover:bg-subtle/40">
                      <td className="p-3.5 no-print">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(g.id)}
                          onChange={() => toggleSelectOne(g.id)}
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-ink">{g.name}</div>
                        {g.dietary && (
                          <div className="text-xs text-muted mt-0.5">Obs: {g.dietary}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-muted space-y-1">
                        {g.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {g.phone}
                          </div>
                        )}
                        {g.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {g.email}
                          </div>
                        )}
                        {!g.phone && !g.email && <span>Sem contato</span>}
                      </td>
                      <td className="p-3.5 text-xs">
                        <div className="font-medium text-ink">{g.group}</div>
                        <div className="text-muted">
                          {g.adults ?? 1} adulto(s)
                          {Number(g.children) > 0 ? ` + ${g.children} criança(s)` : ''}
                        </div>
                      </td>
                      <td className="p-3.5">{renderRsvpBadge(g)}</td>
                      <td className="p-3.5 text-xs">
                        {g.inviteSent ? (
                          <span className="px-2.5 py-1 rounded-full bg-subtle text-ink font-medium">
                            Enviado ({g.inviteChannel || 'ok'})
                          </span>
                        ) : (
                          <span className="text-muted">Não enviado</span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-ink">
                        {g.tableId ? tablesMap[g.tableId] || 'Atribuída' : '—'}
                      </td>
                      <td className="p-3.5 text-right no-print">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setInvitingGuest(g);
                              setInviteModalOpen(true);
                            }}
                            title="Enviar Convite"
                            className="p-2 rounded-lg bg-accent text-accent-contrast hover:opacity-90 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingGuest(g);
                              setGuestModalOpen(true);
                            }}
                            title="Editar"
                            className="p-2 rounded-lg bg-subtle text-ink hover:opacity-80 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              await deleteGuest(uid, g.id);
                              onNotify?.('Convidado excluído.');
                            }}
                            title="Excluir"
                            className="p-2 rounded-lg bg-subtle text-ink hover:opacity-80 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGuests.map((g) => (
                <div
                  key={g.id}
                  className="bg-card border border-theme rounded-2xl p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-ink">{g.name}</h3>
                        <span className="text-xs text-muted">
                          {g.group} • {g.adults ?? 1}A + {g.children ?? 0}C
                        </span>
                      </div>
                      {renderRsvpBadge(g)}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-muted">
                      {g.phone && <div>Celular: {g.phone}</div>}
                      {g.email && <div>E-mail: {g.email}</div>}
                      <div>
                        Mesa: {g.tableId ? tablesMap[g.tableId] || 'Atribuída' : 'Sem mesa'}
                      </div>
                      {g.dietary && <div>Restrição: {g.dietary}</div>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-theme">
                    <span className="text-xs text-muted">
                      {g.inviteSent ? `Convite: ${g.inviteChannel}` : 'Convite pendente'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setInvitingGuest(g);
                          setInviteModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> Convidar
                      </button>
                      <button
                        onClick={() => {
                          setEditingGuest(g);
                          setGuestModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-subtle text-ink cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
        onSaveTemplate={(tpl) => updateWeddingInfo(uid, { inviteTemplate: tpl })}
        onMarkSent={(id, channel) => markInviteSent(uid, id, channel)}
        onNotify={onNotify}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={async (rows) => {
          await bulkImportGuests(uid, rows);
          onNotify?.(`${rows.length} convidado(s) importado(s)!`);
        }}
      />
    </div>
  );
}
