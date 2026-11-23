import { useEffect, useState } from 'react';
import { X, MessageCircle, Mail, Smartphone, Copy, Save, KeyRound } from 'lucide-react';
import QrCodeBox from '../ui/QrCodeBox';
import {
  DEFAULT_INVITE_TEMPLATE,
  parseInviteMessage,
  buildGuestPortalUrl,
  buildWhatsAppUrl,
  buildMailtoUrl,
  buildSmsUrl,
} from '../../utils/inviteParser';

const TAGS = ['{convidado}', '{casal}', '{data}', '{hora}', '{local}', '{pin}', '{link}'];

export default function InviteModal({
  isOpen,
  onClose,
  guest,
  wedding,
  weddingId,
  onSaveTemplate,
  onMarkSent,
  onNotify,
}) {
  const [template, setTemplate] = useState(DEFAULT_INVITE_TEMPLATE);

  useEffect(() => {
    setTemplate(wedding?.inviteTemplate || DEFAULT_INVITE_TEMPLATE);
  }, [wedding?.inviteTemplate, isOpen]);

  if (!isOpen) return null;

  const previewText = parseInviteMessage(template, guest, wedding, weddingId);
  const directGuestUrl = buildGuestPortalUrl(weddingId, guest?.pin || '');
  const waUrl = guest ? buildWhatsAppUrl(guest.phone, previewText) : null;
  const mailUrl = guest ? buildMailtoUrl(guest.email, wedding?.coupleNames, previewText) : null;
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
      <div className="bg-card border border-theme rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">
              {guest ? `Enviar Convite — ${guest.name}` : 'Modelo de Convite'}
            </h2>
            <p className="text-xs text-muted">
              Envie o link direto com PIN ou baixe o QR Code exclusivo deste convidado
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Coluna Esquerda: Editor e Prévia */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted mr-1">Tags:</span>
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="px-2 py-1 rounded-lg bg-subtle text-ink text-[11px] font-mono hover:opacity-85 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              rows={7}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-primary border border-theme text-ink text-xs leading-relaxed focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  await onSaveTemplate(template);
                  onNotify?.('Modelo de convite salvo!');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-subtle text-ink text-xs font-semibold hover:opacity-85 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar Modelo Padrão
              </button>
            </div>
          </div>

          {/* Coluna Direita: PIN e QR Individual */}
          <div className="bg-subtle/60 border border-theme rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
            {guest?.pin && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-contrast text-xs font-bold">
                <KeyRound className="w-3.5 h-3.5" />
                PIN: {guest.pin}
              </div>
            )}

            <QrCodeBox
              value={directGuestUrl}
              size={145}
              showDownload
              downloadFilename={`qrcode-${guest?.name || 'convidado'}.png`}
              label="Baixar QR Individual"
            />

            <p className="text-[11px] text-muted leading-snug">
              Este QR Code já entra direto na área de{' '}
              <strong className="text-ink">{guest?.name || 'convidado'}</strong> sem digitar PIN.
            </p>
          </div>
        </div>

        {/* Canais de Envio */}
        {guest && (
          <div className="pt-3 border-t border-theme flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!waUrl}
                onClick={() => handleChannelClick('whatsapp', waUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>

              <button
                type="button"
                disabled={!mailUrl}
                onClick={() => handleChannelClick('email', mailUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-subtle text-ink text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                E-mail
              </button>

              <button
                type="button"
                disabled={!smsUrl}
                onClick={() => handleChannelClick('sms', smsUrl)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-subtle text-ink text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                SMS
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary border border-theme text-ink text-xs font-semibold hover:bg-subtle cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              Copiar Mensagem
            </button>
          </div>
        )}
      </div>
    </div>
  );
}