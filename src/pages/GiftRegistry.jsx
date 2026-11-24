import { useMemo, useState } from 'react';
import {
  Gift,
  Plus,
  ExternalLink,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Link2,
  Search,
  CheckCircle2,
  Clock,
  X,
  Upload,
  BookmarkCheck,
} from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency } from '../utils/formatters';

const GIFT_CATEGORIES = [
  'Cozinha',
  'Eletrodomésticos',
  'Quarto & Banho',
  'Sala & Decoração',
  'Cotas Lua de Mel',
  'Outros',
];

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const maxSide = 640;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function GiftCardImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-44 bg-subtle flex flex-col items-center justify-center text-muted gap-1.5 border-b border-theme">
        <Gift className="w-9 h-9 opacity-60" />
        <span className="text-[11px]">Sem imagem definida</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-full h-44 object-cover border-b border-theme bg-subtle"
    />
  );
}

export default function GiftRegistry({
  items = [],
  readOnly = false,
  guestName = '',
  onAdd,
  onUpdate,
  onDelete,
  onNotify,
}) {
  const [form, setForm] = useState({
    title: '',
    imageUrl: '',
    link: '',
    price: '',
    category: GIFT_CATEGORIES[0],
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [reservingId, setReservingId] = useState(null);
  const [editingGift, setEditingGift] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    imageUrl: '',
    link: '',
    price: '',
    category: GIFT_CATEGORIES[0],
    status: 'disponivel',
    reservedBy: '',
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (readOnly || !form.title.trim()) return;

    await onAdd?.({
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      link: normalizeUrl(form.link),
      price: Number(form.price) || 0,
      category: form.category || 'Outros',
      status: 'disponivel',
      reservedBy: '',
    });

    setForm({
      title: '',
      imageUrl: '',
      link: '',
      price: '',
      category: form.category,
    });
    onNotify?.('Presente adicionado à lista!');
  };

  const handleFileUpload = async (e, isEdit = false) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      if (isEdit) {
        setEditForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      } else {
        setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      }
      onNotify?.('Imagem carregada!');
    } catch {
      onNotify?.('Não foi possível processar essa imagem.', 'info');
    }
  };

  const openEditModal = (gift) => {
    if (readOnly) return;
    setEditingGift(gift);
    setEditForm({
      title: gift.title || '',
      imageUrl: gift.imageUrl || '',
      link: gift.link || '',
      price: gift.price || '',
      category: gift.category || GIFT_CATEGORIES[0],
      status: gift.status || 'disponivel',
      reservedBy: gift.reservedBy || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (readOnly || !editingGift || !editForm.title.trim()) return;

    await onUpdate?.(editingGift.id, {
      title: editForm.title.trim(),
      imageUrl: editForm.imageUrl.trim(),
      link: normalizeUrl(editForm.link),
      price: Number(editForm.price) || 0,
      category: editForm.category,
      status: editForm.status,
      reservedBy: editForm.status === 'disponivel' ? '' : editForm.reservedBy.trim(),
    });

    setEditingGift(null);
    onNotify?.('Presente atualizado!');
  };

  const handleCycleStatus = async (gift) => {
    if (readOnly) return;
    const nextStatus =
      gift.status === 'disponivel'
        ? 'reservado'
        : gift.status === 'reservado'
        ? 'comprado'
        : 'disponivel';

    await onUpdate?.(gift.id, {
      status: nextStatus,
      reservedBy: nextStatus === 'disponivel' ? '' : gift.reservedBy || '',
    });
    onNotify?.(
      `Status alterado para ${
        nextStatus === 'disponivel'
          ? 'Disponível'
          : nextStatus === 'reservado'
          ? 'Reservado'
          : 'Comprado'
      }.`
    );
  };

  const handleGuestReserve = async (gift) => {
    if (!gift?.id || (gift.status || 'disponivel') !== 'disponivel') return;
    setReservingId(gift.id);
    try {
      await onUpdate?.(gift.id, {
        status: 'reservado',
        reservedBy: (guestName || 'Convidado').trim(),
      });
      onNotify?.(`Você reservou "${gift.title}"!`);
    } finally {
      setReservingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = items.length;
    const available = items.filter((g) => (g.status || 'disponivel') === 'disponivel').length;
    const claimed = total - available;
    return { total, available, claimed };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((g) => {
      const status = g.status || 'disponivel';
      if (statusFilter === 'disponivel' && status !== 'disponivel') return false;
      if (statusFilter === 'ganhos' && status === 'disponivel') return false;
      if (q) {
        const matchTitle = g.title?.toLowerCase().includes(q);
        const matchCat = g.category?.toLowerCase().includes(q);
        const matchBy = g.reservedBy?.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchBy) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Lista de Presentes</h2>
        <p className="text-sm text-muted">
          {readOnly
            ? 'Consulte os itens da lista e reserve um presente disponível para o casal.'
            : 'Cadastre itens com foto, título e link da loja. Você pode editar qualquer detalhe a qualquer momento.'}
        </p>
      </div>

      {/* Formulário de Novo Presente (apenas administradores) */}
      {!readOnly && (
        <form
          onSubmit={handleCreate}
          className="bg-card border border-theme rounded-2xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              required
              placeholder="Título do presente (ex: Cafeteira Expresso)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="lg:col-span-2 px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
            />

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <ImageIcon className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="URL da imagem ou envie foto ->"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                />
              </div>
              <label
                title="Carregar imagem do dispositivo"
                className="p-2.5 rounded-xl bg-subtle border border-theme text-ink hover:opacity-85 cursor-pointer shrink-0"
              >
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative">
              <Link2 className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Link da loja / compra"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs font-semibold focus:outline-none"
            >
              {GIFT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  Categoria: {cat}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Valor estimado R$ (opcional)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-52 px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
            />

            {form.imageUrl && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <img
                  src={form.imageUrl}
                  alt="Prévia"
                  className="w-8 h-8 rounded-lg object-cover border border-theme"
                />
                <span>Prévia da imagem pronta</span>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Resumo e Filtros */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-theme rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                statusFilter === 'todos'
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-subtle text-ink'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disponivel')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                statusFilter === 'disponivel'
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-subtle text-ink'
              }`}
            >
              Disponíveis ({stats.available})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ganhos')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                statusFilter === 'ganhos'
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-subtle text-ink'
              }`}
            >
              Reservados / Comprados ({stats.claimed})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar presente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Grade de Presentes */}
      {items.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Nenhum presente cadastrado ainda"
          description={
            readOnly
              ? 'Os noivos ainda não adicionaram itens à lista de presentes.'
              : 'Adicione itens acima com foto, título e link da loja para montar sua lista de presentes.'
          }
        />
      ) : filteredItems.length === 0 ? (
        <div className="bg-card border border-theme rounded-2xl p-8 text-center text-sm text-muted">
          Nenhum presente encontrado com esse filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((gift) => {
            const status = gift.status || 'disponivel';
            const isAvailable = status === 'disponivel';

            return (
              <div
                key={gift.id}
                className="bg-card border border-theme rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="relative">
                    <GiftCardImage key={gift.imageUrl} src={gift.imageUrl} alt={gift.title} />
                    {readOnly ? (
                      <span
                        className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow ${
                          isAvailable
                            ? 'bg-card/95 text-ink border border-theme'
                            : 'bg-accent text-accent-contrast'
                        }`}
                      >
                        {isAvailable ? (
                          <>
                            <Clock className="w-3 h-3" /> Disponível
                          </>
                        ) : status === 'reservado' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Reservado
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Comprado
                          </>
                        )}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCycleStatus(gift)}
                        title="Clique para alternar status"
                        className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shadow cursor-pointer ${
                          isAvailable
                            ? 'bg-card/95 text-ink border border-theme'
                            : 'bg-accent text-accent-contrast'
                        }`}
                      >
                        {isAvailable ? (
                          <>
                            <Clock className="w-3 h-3" /> Disponível
                          </>
                        ) : status === 'reservado' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Reservado
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Comprado
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                        {gift.category || 'Presente'}
                      </span>
                      {Number(gift.price) > 0 && (
                        <span className="text-xs font-bold text-ink">
                          {formatCurrency(gift.price)}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-ink leading-snug line-clamp-2">
                      {gift.title}
                    </h3>

                    {gift.reservedBy && (
                      <p className="text-xs text-muted pt-1">
                        Presenteado por: <strong className="text-ink">{gift.reservedBy}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-4 pt-2 border-t border-theme flex items-center justify-between gap-2">
                  {gift.link ? (
                    <a
                      href={gift.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-subtle text-ink border border-theme text-xs font-semibold hover:opacity-85"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver na Loja
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted">Sem link</span>
                  )}

                  {readOnly ? (
                    isAvailable && (
                      <button
                        type="button"
                        disabled={reservingId === gift.id}
                        onClick={() => handleGuestReserve(gift)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 cursor-pointer disabled:opacity-60"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        {reservingId === gift.id ? 'Reservando...' : 'Reservar'}
                      </button>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(gift)}
                        title="Editar título, imagem ou link"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-subtle text-ink text-xs font-semibold hover:opacity-85 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDelete?.(gift.id);
                          onNotify?.('Presente removido da lista.');
                        }}
                        title="Excluir presente"
                        className="p-1.5 rounded-xl bg-subtle text-ink hover:opacity-85 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição Completa do Presente (apenas administradores) */}
      {!readOnly && editingGift && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-theme rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-ink">Editar Presente</h3>
              <button
                type="button"
                onClick={() => setEditingGift(null)}
                className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Título do Presente
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Imagem (cole o link da foto ou envie uma nova)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                  />
                  <label
                    title="Carregar imagem"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold cursor-pointer shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    Foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>
                {editForm.imageUrl && (
                  <img
                    src={editForm.imageUrl}
                    alt="Prévia"
                    className="mt-2 w-full h-36 object-cover rounded-xl border border-theme"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Link da Loja / Compra
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editForm.link}
                  onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Categoria
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                  >
                    {GIFT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Valor Estimado (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Status do Presente
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="reservado">Reservado</option>
                    <option value="comprado">Comprado</option>
                  </select>
                </div>

                {editForm.status !== 'disponivel' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">
                      Quem presenteou / reservou
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do convidado"
                      value={editForm.reservedBy}
                      onChange={(e) =>
                        setEditForm({ ...editForm, reservedBy: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGift(null)}
                  className="px-4 py-2.5 rounded-xl bg-subtle text-ink text-sm font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}