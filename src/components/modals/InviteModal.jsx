import { useEffect, useState } from 'react';
import { X, MessageCircle, Mail, Smartphone, Copy, Save } from 'lucide-react';
import {
  DEFAULT_INVITE_TEMPLATE,
  parseInviteMessage,
  buildWhatsAppUrl,
  buildMailtoUrl,
  buildSmsUrl,
} from '../../utils/inviteParser';

const TAGS = ['{convidado}', '{casal}', '{data}', '{hora}', '{local}'];

export default function InviteModal({
  isOpen,
  onClose,
  guest,
  wedding,
  onSaveTemplate,
  onMarkSent,
  onNotify,
}) {
  const [template, setTemplate] = useState(DEFAULT_INVITE_TEMPLATE);

  useEffect(() => {
    setTemplate(wedding?.inviteTemplate || DEFAULT_INVITE_TEMPLATE);
  }, [wedding?.inviteTemplate, isOpen]);

  if (!isOpen) return null;

  const previewText = parseInviteMessage(template, guest, wedding);
  const waUrl = guest ? buildWhatsAppUrl(guest.phone, previewText) : null;
  const mailUrl = guest
    ? buildMailtoUrl(guest.email, wedding?.coupleNames, previewText)
    : null;
  const smsUrl = guest ? buildSmsUrl(guest.phone, previewText) : null;

  const insertTag = (tag) => {
    setTemplate((prev) => `${prev} ${tag}`.trim());
  };

  const handleChannelClick = async (channel, url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    if (guest?.id) {
      await onMarkSent(guest.id, channel);
    }
    onNotify?.(`Convite registrado via ${channel.toUpperCase()}!`);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(previewText);
    if (guest?.id) {
      await onMarkSent(guest.id, 'copiado');
    }
    onNotify?.('Texto do convite copiado para a área de transferência!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-theme rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-ink">
              {guest ? `Enviar Convite — ${guest.name}` : 'Modelo de Convite'}
            </h2>
            <p className="text-xs text-muted">
              Personalize a mensagem e envie pelo canal preferido do convidado
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Variáveis Dinâmicas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Variáveis Dinâmicas (clique para inserir)
              </span>
              <button
                type="button"
                onClick={() => {
                  onSaveTemplate(template);
                  onNotify?.('Modelo padrão salvo no Firebase!');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar como modelo padrão
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="px-2.5 py-1 rounded-lg bg-subtle text-ink text-xs font-mono hover:opacity-80 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Editor de Template */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Texto do Convite
            </label>
            <textarea
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
            />
          </div>

          {/* Prévia em Tempo Real */}
          <div className="p-4 rounded-xl bg-subtle border border-theme">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Pré-visualização da Mensagem
            </div>
            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {previewText}
            </p>
          </div>

          {/* Botões de Envio */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <button
              type="button"
              disabled={!waUrl}
              onClick={() => handleChannelClick('whatsapp', waUrl)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold disabled:opacity-40 hover:opacity-90 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

            <button
              type="button"
              disabled={!mailUrl}
              onClick={() => handleChannelClick('email', mailUrl)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold disabled:opacity-40 hover:opacity-90 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              E-mail
            </button>

            <button
              type="button"
              disabled={!smsUrl}
              onClick={() => handleChannelClick('sms', smsUrl)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold disabled:opacity-40 hover:opacity-90 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              SMS
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              Copiar Texto
            </button>
          </div>

          {guest && !guest.phone && !guest.email && (
            <p className="text-xs text-muted text-center">
              Dica: Cadastre um celular ou e-mail para habilitar os botões diretos de WhatsApp, E-mail e SMS.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
