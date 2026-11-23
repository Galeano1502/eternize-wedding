import { useState } from 'react';
import { Plus, MessageCircle, Instagram, Trash2, Briefcase } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { formatPhone } from '../utils/formatters';

export default function Vendors({ items, onAdd, onDelete, onNotify }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Buffet',
    phone: '',
    instagram: '',
    status: 'Orçamento',
    notes: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onAdd(form);
    setForm({
      name: '',
      category: 'Buffet',
      phone: '',
      instagram: '',
      status: 'Orçamento',
      notes: '',
    });
    onNotify?.('Fornecedor cadastrado!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Fornecedores & Contratos</h2>
        <p className="text-sm text-muted">
          Centralize contatos e abra conversas direto no WhatsApp ou Instagram.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-theme rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
      >
        <input
          type="text"
          required
          placeholder="Nome da empresa / profissional"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <input
          type="text"
          placeholder="Categoria (ex: Fotografia)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <input
          type="tel"
          placeholder="WhatsApp"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <input
          type="text"
          placeholder="@instagram"
          value={form.instagram}
          onChange={(e) => setForm({ ...form, instagram: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />

        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        >
          <option value="Orçamento">Em Orçamento</option>
          <option value="Reunião">Reunião Agendada</option>
          <option value="Contratado">Contratado</option>
        </select>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Salvar
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nenhum fornecedor cadastrado"
          description="Adicione buffet, fotografia, música e assessoria para ter acesso rápido ao contato de cada um."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((v) => {
            const digits = String(v.phone || '').replace(/\D/g, '');
            const waLink = digits ? `https://wa.me/55${digits}` : null;
            const igHandle = String(v.instagram || '').replace(/^@/, '').trim();
            const igLink = igHandle ? `https://instagram.com/${igHandle}` : null;

            return (
              <div
                key={v.id}
                className="bg-card border border-theme rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase text-muted">
                        {v.category}
                      </span>
                      <h3 className="text-lg font-bold text-ink">{v.name}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-subtle text-ink text-xs font-semibold">
                      {v.status}
                    </span>
                  </div>
                  {v.phone && <p className="text-xs text-muted mt-2">Tel: {v.phone}</p>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-theme">
                  <div className="flex items-center gap-2">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-semibold"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    )}
                    {igLink && (
                      <a
                        href={igLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-subtle text-ink text-xs font-semibold"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        Instagram
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onDelete(v.id);
                      onNotify?.('Fornecedor excluído.');
                    }}
                    className="p-2 rounded-lg bg-subtle text-ink hover:opacity-80 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
