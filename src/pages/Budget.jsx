import { useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { formatCurrency } from '../utils/formatters';

const CATEGORIES = [
  'Espaço & Buffet',
  'Decoração & Flores',
  'Foto & Vídeo',
  'Música & Som',
  'Trajes & Beleza',
  'Convites & Papelaria',
  'Assessoria & Outros',
];

export default function Budget({ items, onAdd, onDelete, onNotify }) {
  const [form, setForm] = useState({
    category: CATEGORIES[0],
    description: '',
    estimated: '',
    closed: '',
    paid: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    await onAdd({
      category: form.category,
      description: form.description.trim(),
      estimated: Number(form.estimated) || 0,
      closed: Number(form.closed) || 0,
      paid: Number(form.paid) || 0,
    });
    setForm({ ...form, description: '', estimated: '', closed: '', paid: '' });
    onNotify?.('Item adicionado ao orçamento!');
  };

  const totalEstimated = items.reduce((a, b) => a + (Number(b.estimated) || 0), 0);
  const totalClosed = items.reduce((a, b) => a + (Number(b.closed) || 0), 0);
  const totalPaid = items.reduce((a, b) => a + (Number(b.paid) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Controle de Orçamento</h2>
        <p className="text-sm text-muted">
          Acompanhe valores estimados, contratos fechados e parcelas pagas.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-theme rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
      >
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="text"
          required
          placeholder="Descrição do item"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Estimado (R$)"
          value={form.estimated}
          onChange={(e) => setForm({ ...form, estimated: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Fechado (R$)"
          value={form.closed}
          onChange={(e) => setForm({ ...form, closed: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Pago (R$)"
          value={form.paid}
          onChange={(e) => setForm({ ...form, paid: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Orçamento ainda vazio"
          description="Registre suas categorias de investimento para acompanhar quanto já foi fechado e pago."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-theme rounded-xl p-4">
              <div className="text-xs text-muted uppercase font-semibold">Total Estimado</div>
              <div className="text-xl font-bold text-ink mt-1">{formatCurrency(totalEstimated)}</div>
            </div>
            <div className="bg-card border border-theme rounded-xl p-4">
              <div className="text-xs text-muted uppercase font-semibold">Total Fechado</div>
              <div className="text-xl font-bold text-ink mt-1">{formatCurrency(totalClosed)}</div>
            </div>
            <div className="bg-card border border-theme rounded-xl p-4">
              <div className="text-xs text-muted uppercase font-semibold">Saldo a Pagar</div>
              <div className="text-xl font-bold text-ink mt-1">
                {formatCurrency(Math.max(0, totalClosed - totalPaid))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-theme rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-subtle text-xs uppercase text-muted">
                <tr>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Descrição</th>
                  <th className="p-3.5">Estimado</th>
                  <th className="p-3.5">Fechado</th>
                  <th className="p-3.5">Pago</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-theme">
                    <td className="p-3.5 text-xs font-semibold text-muted">{item.category}</td>
                    <td className="p-3.5 font-semibold text-ink">{item.description}</td>
                    <td className="p-3.5">{formatCurrency(item.estimated)}</td>
                    <td className="p-3.5 font-semibold">{formatCurrency(item.closed)}</td>
                    <td className="p-3.5">{formatCurrency(item.paid)}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => {
                          onDelete(item.id);
                          onNotify?.('Item removido do orçamento.');
                        }}
                        className="p-2 rounded-lg bg-subtle text-ink hover:opacity-80 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
