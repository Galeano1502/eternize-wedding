import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { createQrMatrix, downloadQrPng } from '../../utils/qrCode';

export default function QrCodeBox({
  value,
  size = 190,
  showDownload = false,
  downloadFilename = 'qrcode-convite.png',
  label = 'Baixar PNG p/ Gráfica',
}) {
  const matrix = useMemo(() => {
    try {
      return createQrMatrix(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;

  const count = matrix.length;

  return (
    <div className="inline-flex flex-col items-center gap-3">
      <div className="p-3.5 bg-white rounded-2xl border border-theme shadow-sm">
        <svg
          width={size}
          height={size}
          viewBox={`-4 -4 ${count + 8} ${count + 8}`}
          shapeRendering="crispEdges"
          aria-label="QR Code do Convite"
        >
          <rect x={-4} y={-4} width={count + 8} height={count + 8} fill="#FFFFFF" />
          {matrix.map((row, y) =>
            row.map((cell, x) =>
              cell ? (
                <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111827" />
              ) : null
            )
          )}
        </svg>
      </div>

      {showDownload && (
        <button
          type="button"
          onClick={() => downloadQrPng(value, downloadFilename)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          {label}
        </button>
      )}
    </div>
  );
}