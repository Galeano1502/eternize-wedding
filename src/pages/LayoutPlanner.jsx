import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Grid,
  Download,
  Circle,
  Square,
  Music,
  Utensils,
  Wine,
  Sparkles,
  DoorOpen,
  Armchair,
  Heart,
  Copy,
  Ruler,
  MousePointer2,
  Minus,
  Layers,
} from 'lucide-react';
import { updateWeddingInfo } from '../services/weddingService';

const PX_PER_METER = 52;

const TABLE_TOKENS = [
  { id: 't-round', label: 'Mesa Redonda (8p)', shape: 'round', capacity: 8 },
  { id: 't-rect', label: 'Mesa Retangular (10p)', shape: 'rect', capacity: 10 },
  { id: 't-imp', label: 'Mesa Imperial (14p)', shape: 'rect', capacity: 14 },
];

const STRUCTURE_TOKENS = [
  { type: 'wall', label: 'Parede / Divisória', widthM: 3.5, heightM: 0.25, icon: Minus },
  { type: 'pillar', label: 'Pilar / Coluna', widthM: 0.6, heightM: 0.6, icon: Square },
  { type: 'entrance', label: 'Porta / Entrada', widthM: 2.0, heightM: 0.45, icon: DoorOpen },
  { type: 'restroom', label: 'Banheiros / Apoio', widthM: 3.0, heightM: 2.5, icon: Layers },
];

const DECOR_TOKENS = [
  { type: 'altar', label: 'Altar / Gazebo', widthM: 3.5, heightM: 2.2, icon: Heart },
  { type: 'aisle', label: 'Passarela / Tapete', widthM: 1.5, heightM: 7.0, icon: Minus },
  { type: 'ceremony-chairs', label: 'Bloco Cadeiras (12)', widthM: 3.5, heightM: 2.5, icon: Armchair },
  { type: 'chair', label: 'Cadeira Individual', widthM: 0.55, heightM: 0.55, icon: Armchair },
  { type: 'decor', label: 'Arranjo Floral', widthM: 1.0, heightM: 1.0, icon: Sparkles },
  { type: 'cake', label: 'Mesa Bolo & Doces', widthM: 3.0, heightM: 1.2, icon: Sparkles },
  { type: 'buffet', label: 'Buffet / Ilha', widthM: 4.0, heightM: 1.2, icon: Utensils },
  { type: 'bar', label: 'Bar de Drinks', widthM: 3.0, heightM: 1.2, icon: Wine },
  { type: 'dancefloor', label: 'Pista de Dança', widthM: 4.5, heightM: 4.5, icon: Grid },
  { type: 'dj', label: 'Palco / DJ / Banda', widthM: 3.5, heightM: 2.0, icon: Music },
  { type: 'lounge', label: 'Lounge / Sofás', widthM: 3.0, heightM: 2.0, icon: Armchair },
];

export default function LayoutPlanner({
  wedding,
  weddingId,
  tables = [],
  guests = [],
  layoutItems = [],
  onAddTable,
  onUpdateTable,
  onDeleteTable,
  onAddLayoutItem,
  onUpdateLayoutItem,
  onDeleteLayoutItem,
  onNotify,
}) {
  const roomWidth = Math.max(4, Number(wedding?.roomWidth) || 18);
  const roomLength = Math.max(4, Number(wedding?.roomLength) || 12);
  const roomShape = wedding?.roomShape || 'rect';

  const [draftWidth, setDraftWidth] = useState(roomWidth);
  const [draftLength, setDraftLength] = useState(roomLength);
  const [tool, setTool] = useState('select'); // 'select' | 'ruler'
  const [zoom, setZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showSubGrid, setShowSubGrid] = useState(true);

  const [selected, setSelected] = useState(null); // { id, kind: 'table' | 'item' }
  const [dragState, setDragState] = useState(null);
  const [draftPos, setDraftPos] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const [draftSize, setDraftSize] = useState(null);
  const [rulerLine, setRulerLine] = useState(null);

  useEffect(() => {
    setDraftWidth(roomWidth);
    setDraftLength(roomLength);
  }, [roomWidth, roomLength]);

  const canvasW = roomWidth * PX_PER_METER;
  const canvasH = roomLength * PX_PER_METER;
  const areaM2 =
    roomShape === 'l-shape'
      ? Math.round(roomWidth * roomLength * 0.75)
      : Math.round(roomWidth * roomLength);

  const occupancyByTable = useMemo(() => {
    const map = {};
    guests.forEach((g) => {
      if (!g.tableId) return;
      const count = (Number(g.adults) || 0) + (Number(g.children) || 0);
      map[g.tableId] = (map[g.tableId] || 0) + count;
    });
    return map;
  }, [guests]);

  const selectedEntity = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === 'table') {
      const found = tables.find((t) => t.id === selected.id);
      return found ? { ...found, kind: 'table' } : null;
    }
    const found = layoutItems.find((i) => i.id === selected.id);
    return found ? { ...found, kind: 'item' } : null;
  }, [selected, tables, layoutItems]);

  const handleApplyRoomDimensions = async (e) => {
    e.preventDefault();
    const w = Math.min(60, Math.max(4, Number(draftWidth) || 18));
    const l = Math.min(60, Math.max(4, Number(draftLength) || 12));
    await updateWeddingInfo(weddingId, { roomWidth: w, roomLength: l });
    onNotify?.(`Salão atualizado para ${w}m × ${l}m!`);
  };

  const handleSpawnTableToken = async (preset) => {
    const nextNum = tables.length + 1;
    const offset = (tables.length % 5) * 32;
    await onAddTable({
      name: `Mesa ${String(nextNum).padStart(2, '0')}`,
      capacity: preset.capacity,
      shape: preset.shape,
      x: 80 + offset,
      y: 80 + offset,
      rotation: 0,
    });
    setTool('select');
    onNotify?.(`Token ${preset.label} colocado no mapa!`);
  };

  const handleSpawnDecorToken = async (preset) => {
    const offset = (layoutItems.length % 6) * 24;
    await onAddLayoutItem({
      type: preset.type,
      label: preset.label,
      widthM: preset.widthM,
      heightM: preset.heightM,
      x: 60 + offset,
      y: 60 + offset,
      rotation: 0,
    });
    setTool('select');
    onNotify?.(`Token "${preset.label}" adicionado ao mapa!`);
  };

  const handleDuplicateSelected = async () => {
    if (!selectedEntity) return;
    if (selectedEntity.kind === 'item') {
      await onAddLayoutItem({
        type: selectedEntity.type,
        label: selectedEntity.label,
        widthM: selectedEntity.widthM || 2,
        heightM: selectedEntity.heightM || 1.5,
        x: (selectedEntity.x || 40) + 26,
        y: (selectedEntity.y || 40) + 26,
        rotation: selectedEntity.rotation || 0,
      });
      onNotify?.('Token duplicado!');
    } else {
      await onAddTable({
        name: `${selectedEntity.name} (Cópia)`,
        capacity: selectedEntity.capacity || 8,
        shape: selectedEntity.shape || 'round',
        x: (selectedEntity.x || 80) + 32,
        y: (selectedEntity.y || 80) + 32,
        rotation: selectedEntity.rotation || 0,
      });
      onNotify?.('Mesa duplicada!');
    }
  };

  // Arrastar Tokens (Drag)
  const handleTokenPointerDown = (e, entity, kind, defaultX, defaultY) => {
    if (tool === 'ruler') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startX = entity.x ?? defaultX;
    const startY = entity.y ?? defaultY;
    setSelected({ id: entity.id, kind });
    setDragState({
      id: entity.id,
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: startX,
      origY: startY,
    });
    setDraftPos({ id: entity.id, x: startX, y: startY });
  };

  const handleTokenPointerMove = (e) => {
    if (!dragState) return;
    const dx = (e.clientX - dragState.startClientX) / zoom;
    const dy = (e.clientY - dragState.startClientY) / zoom;
    let nextX = dragState.origX + dx;
    let nextY = dragState.origY + dy;

    if (snapToGrid) {
      const step = PX_PER_METER / 4; // 25cm
      nextX = Math.round(nextX / step) * step;
      nextY = Math.round(nextY / step) * step;
    }

    nextX = Math.max(0, Math.min(canvasW - 24, nextX));
    nextY = Math.max(0, Math.min(canvasH - 24, nextY));
    setDraftPos({ id: dragState.id, x: nextX, y: nextY });
  };

  const handleTokenPointerUp = async () => {
    if (!dragState || !draftPos) {
      setDragState(null);
      return;
    }
    const { id, kind } = dragState;
    const { x, y } = draftPos;
    setDragState(null);
    setDraftPos(null);

    if (kind === 'table') {
      await onUpdateTable(id, { x, y });
    } else {
      await onUpdateLayoutItem(id, { x, y });
    }
  };

  // Redimensionar Token pela alça
  const handleResizePointerDown = (e, item) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizeState({
      id: item.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origW: Number(item.widthM) || 2,
      origH: Number(item.heightM) || 1.5,
    });
    setDraftSize({
      id: item.id,
      widthM: Number(item.widthM) || 2,
      heightM: Number(item.heightM) || 1.5,
    });
  };

  const handleResizePointerMove = (e) => {
    if (!resizeState) return;
    const dwMeters = (e.clientX - resizeState.startClientX) / (PX_PER_METER * zoom);
    const dhMeters = (e.clientY - resizeState.startClientY) / (PX_PER_METER * zoom);
    const step = 0.25;
    const nextW = Math.max(
      0.25,
      Math.min(roomWidth, Math.round((resizeState.origW + dwMeters) / step) * step)
    );
    const nextH = Math.max(
      0.25,
      Math.min(roomLength, Math.round((resizeState.origH + dhMeters) / step) * step)
    );
    setDraftSize({ id: resizeState.id, widthM: nextW, heightM: nextH });
  };

  const handleResizePointerUp = async () => {
    if (!resizeState || !draftSize) {
      setResizeState(null);
      return;
    }
    const { id, widthM, heightM } = draftSize;
    setResizeState(null);
    setDraftSize(null);
    await onUpdateLayoutItem(id, { widthM, heightM });
  };

  // Ferramenta Régua / Trena VTT
  const handleBoardPointerDown = (e) => {
    if (tool !== 'ruler') {
      setSelected(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    e.currentTarget.setPointerCapture(e.pointerId);
    setRulerLine({ x1: x, y1: y, x2: x, y2: y, active: true });
  };

  const handleBoardPointerMove = (e) => {
    if (!rulerLine?.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvasW, (e.clientX - rect.left) / zoom));
    const y = Math.max(0, Math.min(canvasH, (e.clientY - rect.top) / zoom));
    setRulerLine((prev) => ({ ...prev, x2: x, y2: y }));
  };

  const handleBoardPointerUp = () => {
    if (rulerLine?.active) {
      setRulerLine((prev) => ({ ...prev, active: false }));
    }
  };

  const rulerDistanceMeters = useMemo(() => {
    if (!rulerLine) return 0;
    const dx = (rulerLine.x2 - rulerLine.x1) / PX_PER_METER;
    const dy = (rulerLine.y2 - rulerLine.y1) / PX_PER_METER;
    return Math.hypot(dx, dy).toFixed(2);
  }, [rulerLine]);

  // Exportar PNG da Planta
  const handleExportPng = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg = isDark ? '#091526' : '#F4EDE2';
    const cardBg = isDark ? '#10233E' : '#FBF8F3';
    const fg = isDark ? '#F3EAD8' : '#0F2342';
    const border = isDark ? 'rgba(243, 234, 216, 0.22)' : 'rgba(15, 35, 66, 0.22)';

    const padding = 56;
    const out = document.createElement('canvas');
    out.width = canvasW + padding * 2;
    out.height = canvasH + padding * 2 + 44;
    const ctx = out.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, out.width, out.height);

    ctx.fillStyle = fg;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(
      `${wedding?.coupleNames || 'Planta do Casamento'} — ${roomWidth}m × ${roomLength}m (${areaM2} m²)`,
      padding,
      36
    );

    ctx.save();
    ctx.translate(padding, padding + 24);

    ctx.fillStyle = cardBg;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, canvasW, canvasH);

    // Cotas em metros
    ctx.fillStyle = fg;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let m = 0; m <= roomWidth; m++) {
      ctx.fillText(`${m}m`, m * PX_PER_METER, -8);
    }
    ctx.textAlign = 'right';
    for (let m = 0; m <= roomLength; m++) {
      ctx.fillText(`${m}m`, -8, m * PX_PER_METER + 3);
    }

    // Grade 1m
    ctx.strokeStyle = border;
    ctx.lineWidth = 0.8;
    for (let x = PX_PER_METER; x < canvasW; x += PX_PER_METER) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
    for (let y = PX_PER_METER; y < canvasH; y += PX_PER_METER) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }

    // Tokens de Estrutura e Decoração
    layoutItems.forEach((item) => {
      const w = (Number(item.widthM) || 2) * PX_PER_METER;
      const h = (Number(item.heightM) || 1.5) * PX_PER_METER;
      const x = item.x || 40;
      const y = item.y || 40;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(((item.rotation || 0) * Math.PI) / 180);
      ctx.fillStyle = item.type === 'wall' ? fg : isDark ? '#162E52' : '#EAE0D0';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      if (item.type !== 'wall') {
        ctx.fillStyle = fg;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, 0, 0);
      }
      ctx.restore();
    });

    // Tokens de Mesas
    tables.forEach((t, idx) => {
      const defaultX = 80 + (idx % 4) * 165;
      const defaultY = 80 + Math.floor(idx / 4) * 165;
      const x = t.x ?? defaultX;
      const y = t.y ?? defaultY;
      const occupied = occupancyByTable[t.id] || 0;
      const isRect = t.shape === 'rect';

      ctx.save();
      ctx.translate(x + 60, y + 60);
      ctx.rotate(((t.rotation || 0) * Math.PI) / 180);

      ctx.fillStyle = fg;
      if (isRect) {
        ctx.fillRect(-56, -28, 112, 56);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = bg;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.name.slice(0, 14), 0, -7);
      ctx.font = '10px sans-serif';
      ctx.fillText(`${occupied}/${t.capacity} lug.`, 0, 9);
      ctx.restore();
    });

    ctx.restore();

    const link = document.createElement('a');
    link.download = `planta-casamento-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
    onNotify?.('Planta exportada em PNG!');
  };

  return (
    <div className="space-y-5">
      {/* Barra 1: Gerador do Salão Vazio (Dimensões + Formato) */}
      <div className="bg-card border border-theme rounded-2xl p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <form
          onSubmit={handleApplyRoomDimensions}
          className="flex flex-wrap items-center gap-3"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink block">
              1. Configurar Salão Vazio
            </span>
            <span className="text-[11px] text-muted">
              Área útil: <strong>{areaM2} m²</strong> (1 quadrado = 1m × 1m)
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-primary px-3 py-1.5 rounded-xl border border-theme text-xs">
            <span className="text-muted">Largura:</span>
            <input
              type="number"
              min="4"
              max="60"
              value={draftWidth}
              onChange={(e) => setDraftWidth(e.target.value)}
              className="w-12 bg-transparent font-bold text-ink text-center focus:outline-none"
            />
            <span className="text-muted">m × Comp.:</span>
            <input
              type="number"
              min="4"
              max="60"
              value={draftLength}
              onChange={(e) => setDraftLength(e.target.value)}
              className="w-12 bg-transparent font-bold text-ink text-center focus:outline-none"
            />
            <span className="text-muted">m</span>
          </div>

          <select
            value={roomShape}
            onChange={(e) => updateWeddingInfo(weddingId, { roomShape: e.target.value })}
            className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs font-semibold focus:outline-none"
          >
            <option value="rect">Formato: Retangular</option>
            <option value="l-shape">Formato: Salão em L</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 cursor-pointer"
          >
            Gerar Salão
          </button>
        </form>

        {/* Barra de Ferramentas VTT (Cursor, Régua, Imã, Zoom, PNG) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-subtle p-1 border border-theme">
            <button
              type="button"
              onClick={() => {
                setTool('select');
                setRulerLine(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                tool === 'select' ? 'bg-accent text-accent-contrast' : 'text-ink'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              Tokens
            </button>
            <button
              type="button"
              onClick={() => {
                setTool('ruler');
                setSelected(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                tool === 'ruler' ? 'bg-accent text-accent-contrast' : 'text-ink'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              Medir (Régua)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSnapToGrid((s) => !s)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border border-theme cursor-pointer ${
              snapToGrid ? 'bg-subtle text-ink' : 'bg-primary text-muted'
            }`}
          >
            Imã {snapToGrid ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setShowSubGrid((g) => !g)}
            className="px-3 py-2 rounded-xl bg-primary border border-theme text-ink text-xs font-semibold cursor-pointer"
          >
            Grade {showSubGrid ? '0,5m' : '1m'}
          </button>

          <div className="inline-flex items-center rounded-xl bg-primary border border-theme p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
              className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-bold text-ink">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(1))))}
              className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPng}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            PNG
          </button>
        </div>
      </div>

      {/* Inspetor Rápido do Token Selecionado */}
      {selectedEntity && (
        <div className="bg-card border border-theme rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-accent text-accent-contrast text-xs font-bold uppercase">
              {selectedEntity.kind === 'table' ? 'Token Mesa' : 'Token'}
            </span>
            {selectedEntity.kind === 'item' ? (
              <input
                type="text"
                value={selectedEntity.label}
                onChange={(e) =>
                  onUpdateLayoutItem(selectedEntity.id, { label: e.target.value })
                }
                className="px-2.5 py-1 rounded-lg bg-primary border border-theme text-ink text-sm font-semibold"
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedEntity.name}
                  onChange={(e) =>
                    onUpdateTable(selectedEntity.id, { name: e.target.value })
                  }
                  className="px-2.5 py-1 rounded-lg bg-primary border border-theme text-ink text-sm font-semibold w-36"
                />
                <span className="text-xs text-muted">
                  ({occupancyByTable[selectedEntity.id] || 0}/{selectedEntity.capacity} lug.)
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedEntity.kind === 'table' && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTable(selectedEntity.id, {
                      shape: selectedEntity.shape === 'rect' ? 'round' : 'rect',
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-subtle text-ink text-xs font-semibold cursor-pointer"
                >
                  {selectedEntity.shape === 'rect' ? (
                    <>
                      <Circle className="w-3.5 h-3.5" /> Redonda
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" /> Retangular
                    </>
                  )}
                </button>
                <div className="inline-flex items-center gap-1 bg-subtle px-2.5 py-1 rounded-lg text-xs">
                  <span className="text-muted">Cadeiras:</span>
                  <input
                    type="number"
                    min="2"
                    max="24"
                    value={selectedEntity.capacity || 8}
                    onChange={(e) =>
                      onUpdateTable(selectedEntity.id, {
                        capacity: Number(e.target.value) || 8,
                      })
                    }
                    className="w-11 bg-card border border-theme rounded text-center font-bold text-ink"
                  />
                </div>
              </>
            )}

            {selectedEntity.kind === 'item' && (
              <div className="inline-flex items-center gap-1.5 text-xs bg-subtle px-2.5 py-1 rounded-lg">
                <span className="text-muted">Medida (m):</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="30"
                  value={selectedEntity.widthM || 2}
                  onChange={(e) =>
                    onUpdateLayoutItem(selectedEntity.id, {
                      widthM: Number(e.target.value) || 1,
                    })
                  }
                  className="w-14 px-1 py-0.5 rounded bg-card border border-theme text-ink text-center font-bold"
                />
                <span>×</span>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  max="30"
                  value={selectedEntity.heightM || 1.5}
                  onChange={(e) =>
                    onUpdateLayoutItem(selectedEntity.id, {
                      heightM: Number(e.target.value) || 1,
                    })
                  }
                  className="w-14 px-1 py-0.5 rounded bg-card border border-theme text-ink text-center font-bold"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const nextRot = ((selectedEntity.rotation || 0) + 45) % 360;
                if (selectedEntity.kind === 'table') {
                  onUpdateTable(selectedEntity.id, { rotation: nextRot });
                } else {
                  onUpdateLayoutItem(selectedEntity.id, { rotation: nextRot });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-subtle text-ink text-xs font-semibold cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Girar 45°
            </button>

            <button
              type="button"
              onClick={handleDuplicateSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-subtle text-ink text-xs font-semibold cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicar
            </button>

            <button
              type="button"
              onClick={async () => {
                if (selectedEntity.kind === 'table') {
                  await onDeleteTable(selectedEntity.id);
                } else {
                  await onDeleteLayoutItem(selectedEntity.id);
                }
                setSelected(null);
                onNotify?.('Token removido do mapa.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-subtle text-ink text-xs font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        </div>
      )}

      {/* Área Principal: Bandeja de Tokens VTT + Planta Arquitetônica */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Bandeja de Tokens */}
        <div className="bg-card border border-theme rounded-2xl p-4 space-y-4 h-fit max-h-[760px] overflow-y-auto">
          <div>
            <h3 className="font-bold text-ink text-sm">2. Bandeja de Tokens</h3>
            <p className="text-xs text-muted">
              Clique para lançar um token no salão e arraste para posicionar:
            </p>
          </div>

          {/* Grupo: Mesas (Sincronizadas) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Tokens de Mesas (Sincronizados)
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {TABLE_TOKENS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSpawnTableToken(t)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    {t.shape === 'round' ? (
                      <Circle className="w-3.5 h-3.5" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    {t.label}
                  </span>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Grupo: Estrutura da Planta */}
          <div className="space-y-1.5 pt-2 border-t border-theme">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Paredes & Estrutura
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
              {STRUCTURE_TOKENS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleSpawnDecorToken(preset)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-subtle hover:opacity-85 text-ink text-xs font-semibold transition cursor-pointer text-left"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {preset.label}
                    </span>
                    <Plus className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grupo: Decoração & Mobiliário */}
          <div className="space-y-1.5 pt-2 border-t border-theme">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Cerimônia, Cadeiras & Decoração
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
              {DECOR_TOKENS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleSpawnDecorToken(preset)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-subtle hover:opacity-85 text-ink text-xs font-semibold transition cursor-pointer text-left"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {preset.label}
                    </span>
                    <Plus className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabuleiro / Planta Baixa */}
        <div className="lg:col-span-3 bg-card border border-theme rounded-2xl p-5 overflow-auto">
          {tool === 'ruler' && (
            <div className="mb-3 px-3.5 py-2 rounded-xl bg-accent text-accent-contrast text-xs font-semibold flex items-center justify-between">
              <span>
                Modo Régua ativo: clique e arraste sobre a planta para medir distâncias em metros.
              </span>
              {rulerLine && (
                <span className="font-mono text-sm font-bold">
                  Distância: {rulerDistanceMeters} m
                </span>
              )}
            </div>
          )}

          {/* Wrapper com Cotas Arquitetônicas Superior e Esquerda */}
          <div
            style={{
              width: (canvasW + 32) * zoom,
              height: (canvasH + 28) * zoom,
            }}
            className="relative mx-auto"
          >
            <div
              style={{
                width: canvasW + 32,
                height: canvasH + 28,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
              className="relative select-none"
            >
              {/* Régua Superior (0m até roomWidth) */}
              <div
                style={{ left: 32, width: canvasW }}
                className="absolute top-0 h-6 flex items-end border-b border-theme"
              >
                {Array.from({ length: roomWidth + 1 }).map((_, m) => (
                  <div
                    key={m}
                    style={{ left: m * PX_PER_METER }}
                    className="absolute -translate-x-1/2 text-[10px] font-mono text-muted pb-0.5"
                  >
                    {m}m
                  </div>
                ))}
              </div>

              {/* Régua Lateral (0m até roomLength) */}
              <div
                style={{ top: 28, height: canvasH }}
                className="absolute left-0 w-7 border-r border-theme"
              >
                {Array.from({ length: roomLength + 1 }).map((_, m) => (
                  <div
                    key={m}
                    style={{ top: m * PX_PER_METER }}
                    className="absolute -translate-y-1/2 right-1 text-[10px] font-mono text-muted"
                  >
                    {m}m
                  </div>
                ))}
              </div>

              {/* Área Interna do Salão */}
              <div
                onPointerDown={handleBoardPointerDown}
                onPointerMove={handleBoardPointerMove}
                onPointerUp={handleBoardPointerUp}
                style={{
                  left: 32,
                  top: 28,
                  width: canvasW,
                  height: canvasH,
                  cursor: tool === 'ruler' ? 'crosshair' : 'default',
                  backgroundImage: showSubGrid
                    ? `linear-gradient(to right, var(--border-color) 1.5px, transparent 1.5px),
                       linear-gradient(to bottom, var(--border-color) 1.5px, transparent 1.5px),
                       linear-gradient(to right, var(--border-color) 0.5px, transparent 0.5px),
                       linear-gradient(to bottom, var(--border-color) 0.5px, transparent 0.5px)`
                    : `linear-gradient(to right, var(--border-color) 1.5px, transparent 1.5px),
                       linear-gradient(to bottom, var(--border-color) 1.5px, transparent 1.5px)`,
                  backgroundSize: showSubGrid
                    ? `${PX_PER_METER}px ${PX_PER_METER}px, ${PX_PER_METER}px ${PX_PER_METER}px, ${
                        PX_PER_METER / 2
                      }px ${PX_PER_METER / 2}px, ${PX_PER_METER / 2}px ${PX_PER_METER / 2}px`
                    : `${PX_PER_METER}px ${PX_PER_METER}px`,
                }}
                className="absolute bg-primary border-4 border-ink rounded-lg overflow-hidden shadow-inner"
              >
                {/* Recorte visual caso o salão seja em formato L */}
                {roomShape === 'l-shape' && (
                  <div
                    style={{
                      width: canvasW * 0.5,
                      height: canvasH * 0.5,
                    }}
                    className="absolute top-0 right-0 bg-card border-b-4 border-l-4 border-ink flex items-center justify-center text-xs font-mono text-muted pointer-events-none"
                  >
                    Área Externa / Recuo
                  </div>
                )}

                {/* Tokens de Estrutura e Decoração */}
                {layoutItems.map((item) => {
                  const isDragged = draftPos && draftPos.id === item.id;
                  const isResized = draftSize && draftSize.id === item.id;
                  const x = isDragged ? draftPos.x : item.x ?? 40;
                  const y = isDragged ? draftPos.y : item.y ?? 40;
                  const wMeters = isResized ? draftSize.widthM : Number(item.widthM) || 2;
                  const hMeters = isResized ? draftSize.heightM : Number(item.heightM) || 1.5;
                  const w = wMeters * PX_PER_METER;
                  const h = hMeters * PX_PER_METER;
                  const isSelected = selected?.kind === 'item' && selected.id === item.id;
                  const isWall = item.type === 'wall';
                  const isPillar = item.type === 'pillar';

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => handleTokenPointerDown(e, item, 'item', 40, 40)}
                      onPointerMove={handleTokenPointerMove}
                      onPointerUp={handleTokenPointerUp}
                      style={{
                        left: x,
                        top: y,
                        width: w,
                        height: h,
                        transform: `rotate(${item.rotation || 0}deg)`,
                        touchAction: 'none',
                      }}
                      className={`absolute flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-shadow ${
                        isWall
                          ? 'bg-ink text-accent-contrast rounded-sm'
                          : isPillar
                          ? 'bg-ink text-accent-contrast rounded-full'
                          : 'bg-card/95 border-2 border-ink rounded-xl shadow-md p-1'
                      } ${isSelected ? 'ring-4 ring-ink/35 z-30' : 'z-10'}`}
                    >
                      {!isWall && !isPillar && (
                        <>
                          <span className="text-[10px] font-bold text-ink leading-tight line-clamp-2">
                            {item.label}
                          </span>
                          <span className="text-[9px] font-mono text-muted mt-0.5">
                            {wMeters}m×{hMeters}m
                          </span>
                        </>
                      )}

                      {/* Alça de Redimensionamento no canto inferior direito */}
                      {isSelected && (
                        <div
                          onPointerDown={(e) => handleResizePointerDown(e, item)}
                          onPointerMove={handleResizePointerMove}
                          onPointerUp={handleResizePointerUp}
                          title="Arraste para redimensionar"
                          className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-accent border-2 border-card cursor-nwse-resize shadow"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Tokens de Mesas com Cadeiras */}
                {tables.map((table, idx) => {
                  const defaultX = 80 + (idx % 4) * 165;
                  const defaultY = 80 + Math.floor(idx / 4) * 165;
                  const isDragged = draftPos && draftPos.id === table.id;
                  const x = isDragged ? draftPos.x : table.x ?? defaultX;
                  const y = isDragged ? draftPos.y : table.y ?? defaultY;
                  const capacity = Math.max(1, Number(table.capacity) || 8);
                  const occupied = occupancyByTable[table.id] || 0;
                  const isRect = table.shape === 'rect';
                  const isSelected = selected?.kind === 'table' && selected.id === table.id;

                  return (
                    <div
                      key={table.id}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) =>
                        handleTokenPointerDown(e, table, 'table', defaultX, defaultY)
                      }
                      onPointerMove={handleTokenPointerMove}
                      onPointerUp={handleTokenPointerUp}
                      style={{
                        left: x,
                        top: y,
                        width: 124,
                        height: 124,
                        transform: `rotate(${table.rotation || 0}deg)`,
                        touchAction: 'none',
                      }}
                      className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing ${
                        isSelected ? 'z-30' : 'z-20'
                      }`}
                    >
                      {/* Tokens de Cadeiras ao redor */}
                      {Array.from({ length: capacity }).map((_, seatIdx) => {
                        const isSeatOccupied = seatIdx < occupied;
                        let seatStyle = {};

                        if (isRect) {
                          const topCount = Math.ceil(capacity / 2);
                          const isTop = seatIdx < topCount;
                          const rowIdx = isTop ? seatIdx : seatIdx - topCount;
                          const rowTotal = isTop ? topCount : capacity - topCount;
                          const leftPct = ((rowIdx + 1) / (rowTotal + 1)) * 100;
                          seatStyle = {
                            left: `calc(${leftPct}% - 7px)`,
                            top: isTop ? 14 : 96,
                          };
                        } else {
                          const angle = (2 * Math.PI * seatIdx) / capacity - Math.PI / 2;
                          const radius = 50;
                          seatStyle = {
                            left: 62 + Math.cos(angle) * radius - 7,
                            top: 62 + Math.sin(angle) * radius - 7,
                          };
                        }

                        return (
                          <div
                            key={seatIdx}
                            style={seatStyle}
                            className={`absolute w-3.5 h-3.5 rounded-full border border-ink ${
                              isSeatOccupied ? 'bg-accent' : 'bg-card'
                            }`}
                          />
                        );
                      })}

                      {/* Token Central da Mesa */}
                      <div
                        className={`flex flex-col items-center justify-center text-center px-2 shadow-lg transition ${
                          isRect ? 'w-28 h-14 rounded-xl' : 'w-20 h-20 rounded-full'
                        } ${
                          isSelected
                            ? 'bg-accent text-accent-contrast ring-4 ring-ink/35'
                            : 'bg-card text-ink border-2 border-ink'
                        }`}
                      >
                        <span className="text-[10px] font-bold leading-tight line-clamp-1">
                          {table.name}
                        </span>
                        <span className="text-[9px] font-mono opacity-85 mt-0.5">
                          {occupied}/{capacity}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Linha da Régua / Trena VTT */}
                {rulerLine && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
                    <line
                      x1={rulerLine.x1}
                      y1={rulerLine.y1}
                      x2={rulerLine.x2}
                      y2={rulerLine.y2}
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      className="text-ink"
                    />
                    <circle cx={rulerLine.x1} cy={rulerLine.y1} r="4" className="fill-ink" />
                    <circle cx={rulerLine.x2} cy={rulerLine.y2} r="4" className="fill-ink" />
                    <g
                      transform={`translate(${(rulerLine.x1 + rulerLine.x2) / 2}, ${
                        (rulerLine.y1 + rulerLine.y2) / 2 - 12
                      })`}
                    >
                      <rect
                        x="-32"
                        y="-11"
                        width="64"
                        height="20"
                        rx="6"
                        className="fill-accent"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        className="fill-accent-contrast text-[11px] font-mono font-bold"
                      >
                        {rulerDistanceMeters}m
                      </text>
                    </g>
                  </svg>
                )}

                {tables.length === 0 && layoutItems.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6 text-center">
                    <div className="bg-card/90 border border-theme rounded-2xl px-6 py-4 max-w-sm shadow">
                      <p className="text-sm font-bold text-ink">
                        Salão Vazio ({roomWidth}m × {roomLength}m)
                      </p>
                      <p className="text-xs text-muted mt-1">
                        Clique nos tokens da bandeja ao lado para posicionar mesas, paredes, altar e decoração no mapa.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}