import { useRef, useState } from 'react';
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
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const sortedPhotos = [...photos].sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tB - tA;
  });

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

  return (
    <div className="space-y-6">
      {/* Formulário de envio de fotos */}
      <form
        onSubmit={handleUploadPhotos}
        className="bg-card border border-theme rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {canModerate
                ? 'Álbum de Fotos dos Convidados'
                : 'Compartilhe seus Cliques do Casamento'}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {canModerate
                ? 'Veja em tempo real as fotos enviadas pelos convidados, baixe suas favoritas ou remova itens.'
                : 'Tire uma foto agora ou escolha até 10 fotos da sua galeria para enviar diretamente aos noivos.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
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

      {/* Grade de Fotos */}
      {sortedPhotos.length === 0 ? (
        <div className="bg-card border border-dashed border-theme rounded-2xl p-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-subtle text-ink flex items-center justify-center mx-auto mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-ink">Nenhuma foto enviada ainda</h4>
          <p className="text-xs text-muted max-w-md mx-auto">
            {canModerate
              ? 'Assim que os convidados enviarem fotos pelo portal do convite, elas aparecerão aqui automaticamente.'
              : 'Seja o primeiro a registrar um momento especial deste dia!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPhotos.map((photo) => (
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
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink truncate">
                    <User className="w-3.5 h-3.5 text-muted shrink-0" />
                    {photo.guestName || 'Convidado(a)'}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
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

                {photo.caption && (
                  <p className="text-xs text-muted leading-relaxed">{photo.caption}</p>
                )}
              </div>
            </div>
          ))}
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