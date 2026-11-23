import { useState } from 'react';
import {
  X,
  QrCode,
  Copy,
  ExternalLink,
  Printer,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import QrCodeBox from '../ui/QrCodeBox';
import { buildGuestPortalUrl } from '../../utils/inviteParser';
import { generateGuestPin, updateGuest } from '../../services/guestService';

export default function PrintQrModal({
  isOpen,
  onClose,
  weddingId,
  wedding,
  guests = [],
  onOpenGuestPreview,
  onNotify,
}) {
  const [generatingPins, setGeneratingPins] = useState(false);

  if (!isOpen) return null;

  const generalInviteUrl = buildGuestPortalUrl(weddingId);
  const guestsWithoutPin = guests.filter((g) => !g.pin);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(generalInviteUrl);
    onNotify?.('Link do convite copiado!');
  };

  const handleGenerateMissingPins = async () => {
    if (!guestsWithoutPin.length) return;
    setGeneratingPins(true);
    try {
      const existing = new Set(guests.map((g) => g.pin).filter(Boolean));
      for (const g of guestsWithoutPin) {
        const pin = generateGuestPin(existing);
        existing.add(pin);
        await updateGuest(weddingId, g.id, { pin });
      }
      onNotify?.(`${guestsWithoutPin.length} PIN(s) gerado(s) com sucesso!`);
    } finally {
      setGeneratingPins(false);
    }
  };

  const handlePrintPinTags = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-theme rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center text-ink">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">QR Code do Convite Impresso</h2>
              <p className="text-xs text-muted">
                Use este QR Code único na arte da gráfica + o PIN de 4 dígitos no envelope de cada convidado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bloco Principal: QR Code da Gráfica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-subtle/60 border border-theme rounded-2xl p-5 items-center">
          <div className="flex flex-col items-center justify-center">
            <QrCodeBox
              value={generalInviteUrl}
              size={185}
              showDownload
              downloadFilename={`qrcode-convite-${wedding?.coupleNames || 'casamento'}.png`}
            />
          </div>

          <div className="space-y-3">
            <span className="inline-block px-2.5 py-1 rounded-full bg-card border border-theme text-[11px] font-bold uppercase tracking-wider text-ink">
              Como funciona no papel
            </span>
            <h3 className="text-base font-bold text-ink">
              1 QR Code para todos + PIN individual
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Você imprime <strong className="text-ink">este mesmo QR Code</strong> em todos os
              convites na gráfica. Quando o convidado escanear com a câmera, o app pede apenas o{' '}
              <strong className="text-ink">PIN de 4 dígitos</strong> (escrito na tag/envelope) ou
              o <strong className="text-ink">celular cadastrado</strong>.
            </p>

            <div className="p-2.5 rounded-xl bg-primary border border-theme text-[11px] font-mono text-ink break-all">
              {generalInviteUrl}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-theme text-ink text-xs font-semibold hover:bg-subtle cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Link
              </button>

              {onOpenGuestPreview && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenGuestPreview();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Testar Tela do Convidado
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Lista de PINs para Etiquetar os Convites Impressos */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                Tabela de PINs dos Convidados ({guests.length})
              </h3>
              <p className="text-xs text-muted">
                Anote o PIN correspondente no cartão individual ou envelope de cada família
              </p>
            </div>

            <div className="flex items-center gap-2">
              {guestsWithoutPin.length > 0 && (
                <button
                  type="button"
                  disabled={generatingPins}
                  onClick={handleGenerateMissingPins}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingPins ? 'animate-spin' : ''}`} />
                  Gerar {guestsWithoutPin.length} PIN(s) Pendente(s)
                </button>
              )}

              <button
                type="button"
                onClick={handlePrintPinTags}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold hover:opacity-85 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Lista de PINs
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-theme rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-ink sticky top-0">
                <tr>
                  <th className="p-2.5">Convidado / Família</th>
                  <th className="p-2.5">PIN (4 dígitos)</th>
                  <th className="p-2.5">Celular Alternativo</th>
                  <th className="p-2.5">Pessoas</th>
                </tr>
              </thead>
              <tbody>
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted">
                      Cadastre convidados para gerar os PINs de acesso.
                    </td>
                  </tr>
                ) : (
                  guests.map((g) => (
                    <tr key={g.id} className="border-t border-theme">
                      <td className="p-2.5 font-semibold text-ink">{g.name}</td>
                      <td className="p-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-accent text-accent-contrast font-mono font-bold tracking-widest">
                          {g.pin || '----'}
                        </span>
                      </td>
                      <td className="p-2.5 text-muted">{g.phone || 'Sem celular'}</td>
                      <td className="p-2.5 text-muted">
                        {(Number(g.adults) || 0) + (Number(g.children) || 0)} pessoa(s)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}