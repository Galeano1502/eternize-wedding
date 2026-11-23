import { useEffect, useState } from 'react';
import { X, Copy, Link2, Users } from 'lucide-react';
import { joinWeddingByCode } from '../../services/weddingService';

export default function CoupleModal({
  isOpen,
  onClose,
  wedding,
  uid,
  onSave,
  onJoinedWedding,
}) {
  const [form, setForm] = useState({
    coupleNames: '',
    weddingDate: '',
    weddingTime: '',
    venue: '',
  });
  const [partnerCode, setPartnerCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (wedding) {
      setForm({
        coupleNames: wedding.coupleNames || '',
        weddingDate: wedding.weddingDate || '',
        weddingTime: wedding.weddingTime || '',
        venue: wedding.venue || '',
      });
    }
    setJoinError('');
    setPartnerCode('');
  }, [wedding, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
    onClose();
  };

  const handleCopyCode = async () => {
    if (!wedding?.inviteCode) return;
    await navigator.clipboard.writeText(wedding.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    setJoinError('');
    try {
      const newWeddingId = await joinWeddingByCode(uid, partnerCode);
      onJoinedWedding?.(newWeddingId);
      onClose();
    } catch (err) {
      setJoinError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-theme rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Dados do Casamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Nomes do Casal
            </label>
            <input
              type="text"
              placeholder="Ex: Ana & Pedro"
              value={form.coupleNames}
              onChange={(e) => setForm({ ...form, coupleNames: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Data da Cerimônia
              </label>
              <input
                type="date"
                value={form.weddingDate}
                onChange={(e) => setForm({ ...form, weddingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Horário
              </label>
              <input
                type="time"
                value={form.weddingTime}
                onChange={(e) => setForm({ ...form, weddingTime: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Local da Cerimônia / Festa
            </label>
            <input
              type="text"
              placeholder="Ex: Espaço Villa Jardim, São Paulo"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-subtle text-ink text-sm font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>

        {/* Sincronização entre contas do casal */}
        <div className="pt-4 border-t border-theme space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
              <Users className="w-3.5 h-3.5" />
              Sincronizar Casal ({wedding?.members?.length || 1} conta(s))
            </span>
          </div>

          <div className="p-3 rounded-xl bg-subtle flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted">Seu Código para Compartilhar:</div>
              <div className="text-base font-mono font-bold text-ink tracking-widest">
                {wedding?.inviteCode || '------'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] text-muted">
              Entrou em outra conta? Cole o código do seu parceiro(a) para ver os mesmos dados:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: A8F29C"
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs font-mono uppercase focus:outline-none"
              />
              <button
                type="button"
                onClick={handleJoin}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold hover:opacity-85 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                Vincular
              </button>
            </div>
            {joinError && <p className="text-xs text-ink font-medium">{joinError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}