import { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  Download,
  Image as ImageIcon,
  X,
  Loader2,
  Sparkles,
  User,
  Users,
  LayoutGrid,
  FolderArchive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';

function compressImageToDataUrl(file, maxDimension = 1080, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Falha ao processar a imagem.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

// Utilitários nativos para gerar .ZIP sem dependências externas
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sanitizePathSegment(name, fallback = 'convidado') {
  const cleaned = String(name || fallback)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function createZipBlob(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const data = entry.data;
    const checksum = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x0021, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x0021, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((acc, part) => acc + part.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd], {
    type: 'application/zip',
  });
}

export default function WeddingPhotosGallery({
  weddingId,
  photos = [],
  uploaderName = 'Convidado(a)',
  canModerate = false,
  onNotify,
}) {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // 'grouped' = Agrupadas por convidado | 'all' = Todas as fotos juntas
  const [viewMode, setViewMode] = useState('grouped');
  const [guestFilter, setGuestFilter] = useState('todos');
  const [collapsedGuests, setCollapsedGuests] = useState({});

  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tB - tA;
    });
  }, [photos]);

  const groupedByGuest = useMemo(() => {
    const map = new Map();
    for (const photo of sortedPhotos) {
      const displayName = (photo.guestName || 'Convidado(a)').trim() || 'Convidado(a)';
      const key = displayName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          key,
          guestName: displayName,
          photos: [],
        });
      }
      map.get(key).photos.push(photo);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.guestName.localeCompare(b.guestName, 'pt-BR')
    );
  }, [sortedPhotos]);

  const visibleAllPhotos = useMemo(() => {
    if (guestFilter === 'todos') return sortedPhotos;
    return sortedPhotos.filter(
      (p) => (p.guestName || 'Convidado(a)').trim().toLowerCase() === guestFilter
    );
  }, [sortedPhotos, guestFilter]);

  const toggleGuestCollapse = (guestKey) => {
    setCollapsedGuests((prev) => ({
      ...prev,
      [guestKey]: !prev[guestKey],
    }));
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (!files.length) return;
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 10));
    e.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUploadPhotos = async (e) => {
    e.preventDefault();
    if (!db || !weddingId || !selectedFiles.length) return;

    setUploading(true);
    let uploadedCount = 0;

    try {
      const photosCol = collection(db, 'weddings', weddingId, 'photos');

      for (const file of selectedFiles) {
        const compressedDataUrl = await compressImageToDataUrl(file);
        await addDoc(photosCol, {
          imageData: compressedDataUrl,
          guestName: uploaderName?.trim() || 'Convidado(a)',
          caption: caption.trim(),
          createdAt: serverTimestamp(),
        });
        uploadedCount += 1;
      }

      setSelectedFiles([]);
      setCaption('');
      if (onNotify) {
        onNotify(
          uploadedCount === 1
            ? 'Foto enviada para o álbum do casamento!'
            : `${uploadedCount} fotos enviadas para o álbum do casamento!`
        );
      }
    } catch (err) {
      console.error('Erro ao enviar fotos:', err);
      if (onNotify) {
        onNotify('Não foi possível enviar uma ou mais fotos. Tente novamente.', 'info');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!canModerate || !db || !weddingId) return;
    if (!window.confirm('Deseja excluir esta foto do álbum do casamento?')) return;

    try {
      await deleteDoc(doc(db, 'weddings', weddingId, 'photos', photo.id));
      if (lightboxPhoto?.id === photo.id) {
        setLightboxPhoto(null);
      }
      if (onNotify) {
        onNotify('Foto removida do álbum.', 'info');
      }
    } catch (err) {
      console.error('Erro ao excluir foto:', err);
    }
  };

  const handleDownloadPhoto = (photo) => {
    if (!photo?.imageData) return;
    const link = document.createElement('a');
    link.href = photo.imageData;
    const safeAuthor = (photo.guestName || 'convidado')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    link.download = `eternize-foto-${safeAuthor}-${photo.id.slice(0, 5)}.jpg`;
    link.click();
  };

  const handleExportZip = (targetPhotos, customGuestName = null) => {
    if (!targetPhotos.length || exportingZip) return;
    setExportingZip(true);

    try {
      const entries = [];
      const countersByGuest = {};

      for (const photo of targetPhotos) {
        if (!photo?.imageData) continue;
        const folderName = sanitizePathSegment(photo.guestName, 'Convidado');
        countersByGuest[folderName] = (countersByGuest[folderName] || 0) + 1;
        const seq = String(countersByGuest[folderName]).padStart(2, '0');
        const bytes = dataUrlToBytes(photo.imageData);

        const filePath = customGuestName
          ? `foto-${seq}.jpg`
          : `${folderName}/foto-${seq}.jpg`;

        entries.push({ path: filePath, data: bytes });
      }

      if (!entries.length) return;

      const zipBlob = createZipBlob(entries);
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;

      if (customGuestName) {
        const slug = sanitizePathSegment(customGuestName, 'convidado')
          .toLowerCase()
          .replace(/\s+/g, '-');
        link.download = `eternize-fotos-${slug}.zip`;
      } else {
        link.download = `eternize-fotos-casamento-${new Date()
          .toISOString()
          .slice(0, 10)}.zip`;
      }

      link.click();
      URL.revokeObjectURL(url);

      if (onNotify) {
        onNotify(
          customGuestName
            ? `Álbum de ${customGuestName} (${entries.length} foto(s)) exportado!`
            : `Todas as ${entries.length} foto(s) exportadas organizadas por convidado!`
        );
      }
    } catch (err) {
      console.error('Erro ao exportar ZIP:', err);
      if (onNotify) {
        onNotify('Não foi possível gerar o arquivo ZIP.', 'info');
      }
    } finally {
      setExportingZip(false);
    }
  };

  const renderPhotoCard = (photo, showAuthorHeader = true) => (
    <div
      key={photo.id}
      className="bg-card border border-theme rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs group"
    >
      <div
        onClick={() => setLightboxPhoto(photo)}
        className="relative aspect-[4/3] bg-subtle overflow-hidden cursor-pointer"
      >
        <img
          src={photo.imageData}
          alt={photo.caption || `Foto de ${photo.guestName}`}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
        />
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {showAuthorHeader ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink truncate">
              <User className="w-3.5 h-3.5 text-muted shrink-0" />
              {photo.guestName || 'Convidado(a)'}
            </span>
          ) : (
            <span className="text-[11px] text-muted truncate">
              {photo.caption || 'Clique para ampliar'}
            </span>
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => handleDownloadPhoto(photo)}
              title="Baixar foto"
              className="p-1.5 rounded-lg bg-subtle text-ink hover:opacity-85 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {canModerate && (
              <button
                type="button"
                onClick={() => handleDeletePhoto(photo)}
                title="Excluir foto"
                className="p-1.5 rounded-lg bg-subtle text-ink hover:opacity-85 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {showAuthorHeader && photo.caption && (
          <p className="text-xs text-muted leading-relaxed">{photo.caption}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Formulário de envio de fotos */}
      <form
        onSubmit={handleUploadPhotos}
        className="bg-card border border-theme rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {canModerate
                ? 'Álbum de Fotos dos Convidados'
                : 'Compartilhe seus Cliques do Casamento'}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {canModerate
                ? 'Visualize agrupado por convidado ou veja todas juntas, baixe em lote (.ZIP) ou remova itens.'
                : 'Tire uma foto agora ou escolha até 10 fotos da sua galeria para enviar diretamente aos noivos.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sortedPhotos.length > 0 && (
              <button
                type="button"
                disabled={exportingZip}
                onClick={() => handleExportZip(sortedPhotos)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-subtle border border-theme text-ink text-xs sm:text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition cursor-pointer"
              >
                <FolderArchive className="w-4 h-4" />
                {exportingZip
                  ? 'Gerando ZIP...'
                  : `Exportar Todas (.ZIP • ${sortedPhotos.length})`}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs sm:text-sm font-semibold hover:opacity-90 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Selecionar ou Tirar Fotos
            </button>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="bg-subtle/60 border border-theme rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                {selectedFiles.length}{' '}
                {selectedFiles.length === 1 ? 'foto selecionada' : 'fotos selecionadas'} (enviando
                como <strong>{uploaderName}</strong>)
              </span>
              <button
                type="button"
                disabled={uploading}
                onClick={() => setSelectedFiles([])}
                className="text-xs text-muted hover:text-ink underline cursor-pointer"
              >
                Limpar seleção
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-theme text-xs text-ink"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span className="max-w-[160px] truncate">{file.name}</span>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => removeSelectedFile(idx)}
                    className="text-muted hover:text-ink cursor-pointer"
                    aria-label="Remover foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                disabled={uploading}
                placeholder="Adicione uma legenda opcional (ex: Pista de dança animada!)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
              />
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-bold hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Enviar para os Noivos
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Barra de Alternância de Visualização (Agrupado por Convidado vs Todas) */}
      {sortedPhotos.length > 0 && (
        <div className="bg-card border border-theme rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-subtle text-ink hover:opacity-85'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Por Convidado ({groupedByGuest.length})
            </button>

            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-subtle text-ink hover:opacity-85'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Todas as Fotos ({sortedPhotos.length})
            </button>
          </div>

          {viewMode === 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Filtrar por:</span>
              <select
                value={guestFilter}
                onChange={(e) => setGuestFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
              >
                <option value="todos">Todos os convidados ({sortedPhotos.length})</option>
                {groupedByGuest.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.guestName} ({group.photos.length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Galeria */}
      {sortedPhotos.length === 0 ? (
        <div className="bg-card border border-dashed border-theme rounded-2xl p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-subtle text-ink flex items-center justify-center mx-auto mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-ink">Nenhuma foto enviada ainda</h4>
          <p className="text-xs text-muted max-w-md mx-auto">
            {canModerate
              ? 'Assim que os convidados enviarem fotos pelo portal do convite, elas aparecerão aqui automaticamente agrupadas por convidado.'
              : 'Seja o primeiro a registrar um momento especial deste dia!'}
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* MODO 1: AGRUPADO POR CONVIDADO */
        <div className="space-y-4">
          {groupedByGuest.map((group) => {
            const isCollapsed = Boolean(collapsedGuests[group.key]);
            return (
              <div
                key={group.key}
                className="bg-card border border-theme rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleGuestCollapse(group.key)}
                    className="flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-subtle text-ink flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-ink flex items-center gap-2">
                        {group.guestName}
                        <span className="px-2 py-0.5 rounded-full bg-subtle text-ink text-xs font-semibold">
                          {group.photos.length}{' '}
                          {group.photos.length === 1 ? 'foto' : 'fotos'}
                        </span>
                      </h4>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={exportingZip}
                    onClick={() => handleExportZip(group.photos, group.guestName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold hover:opacity-85 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar Álbum (.ZIP)
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                    {group.photos.map((photo) => renderPhotoCard(photo, false))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO 2: TODAS AS FOTOS JUNTAS */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleAllPhotos.map((photo) => renderPhotoCard(photo, true))}
        </div>
      )}

      {/* Modal Lightbox para visualização ampliada */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-theme rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
              <div className="text-xs font-semibold text-ink">
                Enviada por <strong>{lightboxPhoto.guestName || 'Convidado(a)'}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPhoto(lightboxPhoto)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </button>
                {canModerate && (
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(lightboxPhoto)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-subtle text-ink text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="p-1.5 rounded-xl bg-subtle text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-black flex items-center justify-center max-h-[75vh]">
              <img
                src={lightboxPhoto.imageData}
                alt={lightboxPhoto.caption || 'Foto do casamento'}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>

            {lightboxPhoto.caption && (
              <div className="px-4 py-3 text-xs text-ink bg-card border-t border-theme">
                {lightboxPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}