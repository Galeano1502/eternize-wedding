import { useEffect, useState } from 'react';
import { X, Send, Save } from 'lucide-react';
import { formatPhone } from '../../utils/formatters';

const GROUPS = ['Família Noiva', 'Família Noivo', 'Amigos', 'Padrinhos', 'Trabalho'];

export default function GuestModal({
  isOpen,
  onClose,
  guest,
  tables = [],
  onSaveGuest,
  onSaveAndInvite,
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    group: 'Amigos',
    adults: 1,
    children: 0,
    rsvp: 'pendente',
    tableId: '',
    dietary: '',
  });

  useEffect(() => {
    if (guest) {
      setForm({
        name: guest.name || '',
        phone: guest.phone || '',
        email: guest.email || '',
        group: guest.group || 'Amigos',
        adults: guest.adults ?? 1,
        children: guest.children ?? 0,
        rsvp: guest.rsvp || 'pendente',
        tableId: guest.tableId || '',
        dietary: guest.dietary || '',
      });
    } else {
      setForm({
        name: '',
        phone: '',
        email: '',
        group: 'Amigos',
        adults: 1,
        children: 0,
        rsvp: 'pendente',
        tableId: '',
        dietary: '',
      });
    }
  }, [guest, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e, openInviteAfter = false) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      tableId: form.tableId || null,
    };
    if (openInviteAfter) {
      await onSaveAndInvite(payload, guest?.id);
    } else {
      await onSaveGuest(payload, guest?.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-theme rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-ink">
            {guest ? 'Editar Convidado' : 'Novo Convidado'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Nome ou Família *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Família Silva / Mariana Costa"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Celular / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: formatPhone(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                E-mail
              </label>
              <input
                type="email"
                placeholder="convidado@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Grupo
              </label>
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Adultos
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={form.adults}
                onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Crianças
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={form.children}
                onChange={(e) =>
                  setForm({ ...form, children: Number(e.target.value) })
                }
                className="w-full px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Status RSVP
              </label>
              <select
                value={form.rsvp}
                onChange={(e) => setForm({ ...form, rsvp: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              >
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="recusado">Recusado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Mesa
              </label>
              <select
                value={form.tableId}
                onChange={(e) => setForm({ ...form, tableId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              >
                <option value="">Sem mesa definida</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Restrição Alimentar / Observações
            </label>
            <input
              type="text"
              placeholder="Ex: Vegetariano, intolerante a lactose..."
              value={form.dietary}
              onChange={(e) => setForm({ ...form, dietary: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-theme">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-subtle text-ink text-sm font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-subtle border border-theme text-ink text-sm font-semibold hover:opacity-90 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Convidado
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Salvar e Enviar Convite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
