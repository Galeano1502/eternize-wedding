import { useMemo, useState } from 'react';
import { X, Upload } from 'lucide-react';
import { formatPhone } from '../../utils/formatters';

export default function ImportModal({ isOpen, onClose, onImport }) {
  const [rawText, setRawText] = useState('');

  const parsedRows = useMemo(() => {
    return rawText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[;,\t]/).map((p) => p.trim());
        return {
          name: parts[0] || '',
          phone: formatPhone(parts[1] || ''),
          email: parts[2] || '',
          group: parts[3] || 'Amigos',
          adults: Number(parts[4]) || 1,
          children: Number(parts[5]) || 0,
        };
      })
      .filter((r) => r.name);
  }, [rawText]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!parsedRows.length) return;
    await onImport(parsedRows);
    setRawText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-theme rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Importar Lista de Convidados</h2>
            <p className="text-xs text-muted">
              Cole uma linha por convidado no formato: Nome; Celular; E-mail; Grupo; Adultos; Crianças
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          rows={6}
          placeholder={`Exemplo:
João e Maria; 11999998888; joao@email.com; Família Noiva; 2; 1
Carlos Souza; 11988887777; ; Amigos; 1; 0`}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="w-full p-3.5 rounded-xl bg-primary border border-theme text-ink text-sm font-mono focus:outline-none mb-4"
        />

        {parsedRows.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto border border-theme rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle text-ink">
                <tr>
                  <th className="p-2.5">Nome</th>
                  <th className="p-2.5">Celular</th>
                  <th className="p-2.5">E-mail</th>
                  <th className="p-2.5">Grupo</th>
                  <th className="p-2.5">Pessoas</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r, i) => (
                  <tr key={i} className="border-t border-theme">
                    <td className="p-2.5 font-medium">{r.name}</td>
                    <td className="p-2.5">{r.phone || '-'}</td>
                    <td className="p-2.5">{r.email || '-'}</td>
                    <td className="p-2.5">{r.group}</td>
                    <td className="p-2.5">
                      {r.adults}A + {r.children}C
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-subtle text-ink text-sm font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!parsedRows.length}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold disabled:opacity-40 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Importar {parsedRows.length} Convidado(s)
          </button>
        </div>
      </div>
    </div>
  );
}
