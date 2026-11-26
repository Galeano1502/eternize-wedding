import { useEffect, useMemo, useState } from 'react';
import {
  Heart,
  CalendarHeart,
  MapPin,
  KeyRound,
  Phone,
  CheckCircle2,
  XCircle,
  Gift,
  ExternalLink,
  Users,
  Utensils,
  LogOut,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  LayoutGrid,
  Camera,
} from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency, formatDateBR, getCountdown } from '../utils/formatters';
import LayoutPlanner from './LayoutPlanner';
import WeddingPhotosGallery from '../components/photos/WeddingPhotosGallery';

function normalizeDigits(str) {
  return String(str || '').replace(/\D/g, '');
}

function phoneMatches(storedPhone, inputPhone) {
  const a = normalizeDigits(storedPhone);
  const b = normalizeDigits(inputPhone);
  if (a.length < 8 || b.length < 8) return false;
  return a.slice(-9) === b.slice(-9);
}

export default function GuestPortal({
  weddingId,
  initialPin = '',
  initialGuest = null,
  initialWedding = null,
  isOwnerPreview = false,
  onExitPreview,
}) {
  const { theme, toggleTheme } = useTheme();
  const [authReady, setAuthReady] = useState(Boolean(auth?.currentUser));
  const [authError, setAuthError] = useState('');

  const [wedding, setWedding] = useState(initialWedding);
  const [guests, setGuests] = useState(initialGuest ? [initialGuest] : []);
  const [tables, setTables] = useState([]);
  const [layoutItems, setLayoutItems] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loadingData, setLoadingData] = useState(!initialWedding);

  const [guestTab, setGuestTab] = useState('mesa');
  const [accessInput, setAccessInput] = useState(initialPin || '');
  const [loginError, setLoginError] = useState('');
  const [activeGuestId, setActiveGuestId] = useState(() => {
    if (initialGuest?.id) return initialGuest.id;
    try {
      return localStorage.getItem(`eternize_guest_${weddingId}`) || '';
    } catch {
      return '';
    }
  });

  const [dietaryDraft, setDietaryDraft] = useState(initialGuest?.dietary || '');
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [giftFilter, setGiftFilter] = useState('todos');

  const [countdown, setCountdown] = useState(() =>
    getCountdown(initialWedding?.weddingDate, initialWedding?.weddingTime)
  );

  // 1. Garante sessão autenticada (anônima) para ler/gravar nas regras do Firestore
  useEffect(() => {
    if (!auth) {
      setAuthError('Firebase não configurado.');
      setLoadingData(false);
      return;
    }
    if (auth.currentUser) {
      setAuthReady(true);
      return;
    }
    signInAnonymously(auth)
      .then(() => setAuthReady(true))
      .catch(() => {
        setAuthError(
          'Ative o login Anônimo no Console do Firebase (Authentication > Sign-in method > Anônimo) para liberar o acesso dos convidados.'
        );
        setLoadingData(false);
      });
  }, []);

  // 2. Carrega dados públicos do casamento, mesas, layout, presentes e fotos
  useEffect(() => {
    if (!db || !weddingId || !authReady) return;

    const unsubWedding = onSnapshot(
      doc(db, 'weddings', weddingId),
      (snap) => {
        if (snap.exists()) {
          setWedding(snap.data());
        }
        setLoadingData(false);
      },
      () => setLoadingData(false)
    );

    const unsubGuests = onSnapshot(collection(db, 'weddings', weddingId, 'guests'), (snap) => {
      setGuests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTables = onSnapshot(collection(db, 'weddings', weddingId, 'tables'), (snap) => {
      setTables(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubLayout = onSnapshot(
      collection(db, 'weddings', weddingId, 'layoutItems'),
      (snap) => {
        setLayoutItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubGifts = onSnapshot(collection(db, 'weddings', weddingId, 'gifts'), (snap) => {
      setGifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubPhotos = onSnapshot(collection(db, 'weddings', weddingId, 'photos'), (snap) => {
      setPhotos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubWedding();
      unsubGuests();
      unsubTables();
      unsubLayout();
      unsubGifts();
      unsubPhotos();
    };
  }, [weddingId, authReady]);

  // 3. Auto-login se o QR Code individual já trouxer &pin=XXXX na URL
  useEffect(() => {
    if (!initialPin || !guests.length || activeGuestId) return;
    const found = guests.find(
      (g) => String(g.pin || '').trim() === String(initialPin).trim()
    );
    if (found) {
      setActiveGuestId(found.id);
      try {
        localStorage.setItem(`eternize_guest_${weddingId}`, found.id);
      } catch {
        // ignora storage bloqueado
      }
    }
  }, [initialPin, guests, activeGuestId, weddingId]);

  useEffect(() => {
    setCountdown(getCountdown(wedding?.weddingDate, wedding?.weddingTime));
    const timer = setInterval(() => {
      setCountdown(getCountdown(wedding?.weddingDate, wedding?.weddingTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [wedding?.weddingDate, wedding?.weddingTime]);

  const currentGuest = useMemo(
    () => guests.find((g) => g.id === activeGuestId) || initialGuest || null,
    [guests, activeGuestId, initialGuest]
  );

  useEffect(() => {
    if (currentGuest) {
      setDietaryDraft(currentGuest.dietary || '');
    }
  }, [currentGuest?.id]);

  const assignedTable = useMemo(() => {
    if (!currentGuest?.tableId) return null;
    return tables.find((t) => t.id === currentGuest.tableId) || null;
  }, [currentGuest, tables]);

  const tableCompanions = useMemo(() => {
    if (!assignedTable) return [];
    return guests.filter((g) => g.tableId === assignedTable.id);
  }, [assignedTable, guests]);

  const showToast = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  const handleGuestLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const raw = accessInput.trim();
    if (!raw) return;

    const digits = normalizeDigits(raw);
    const matched = guests.find((g) => {
      if (digits.length === 4 && String(g.pin || '').trim() === digits) {
        return true;
      }
      if (digits.length >= 8 && phoneMatches(g.phone, digits)) {
        return true;
      }
      return false;
    });

    if (!matched) {
      setLoginError(
        'Não encontramos seu convite com esse PIN ou celular. Confira os 4 dígitos no seu convite ou tente o celular com DDD.'
      );
      return;
    }

    setActiveGuestId(matched.id);
    try {
      localStorage.setItem(`eternize_guest_${weddingId}`, matched.id);
    } catch {
      // ignora
    }
  };

  const handleGuestLogout = () => {
    setActiveGuestId('');
    setAccessInput('');
    try {
      localStorage.removeItem(`eternize_guest_${weddingId}`);
    } catch {
      // ignora
    }
    if (onExitPreview) {
      onExitPreview();
    }
  };

  const handleUpdateRsvp = async (newRsvp) => {
    if (!currentGuest) return;
    setSavingRsvp(true);
    try {
      await updateDoc(doc(db, 'weddings', weddingId, 'guests', currentGuest.id), {
        rsvp: newRsvp,
        dietary: dietaryDraft.trim(),
        guestRespondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(
        newRsvp === 'confirmado'
          ? 'Presença confirmada com sucesso! Nos vemos lá!'
          : 'Resposta registrada. Obrigado por avisar!'
      );
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleSaveDietary = async () => {
    if (!currentGuest) return;
    setSavingRsvp(true);
    try {
      await updateDoc(doc(db, 'weddings', weddingId, 'guests', currentGuest.id), {
        dietary: dietaryDraft.trim(),
        updatedAt: serverTimestamp(),
      });
      showToast('Observações alimentares salvas!');
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleToggleGiftReservation = async (gift) => {
    if (!currentGuest) return;
    const status = gift.status || 'disponivel';
    const isMine =
      status !== 'disponivel' &&
      (gift.reservedByGuestId === currentGuest.id ||
        gift.reservedBy?.toLowerCase() === currentGuest.name?.toLowerCase());

    if (status === 'disponivel') {
      await updateDoc(doc(db, 'weddings', weddingId, 'gifts', gift.id), {
        status: 'reservado',
        reservedBy: currentGuest.name,
        reservedByGuestId: currentGuest.id,
        updatedAt: serverTimestamp(),
      });
      showToast(`Presente "${gift.title}" reservado no seu nome!`);
    } else if (isMine) {
      await updateDoc(doc(db, 'weddings', weddingId, 'gifts', gift.id), {
        status: 'disponivel',
        reservedBy: '',
        reservedByGuestId: '',
        updatedAt: serverTimestamp(),
      });
      showToast('Reserva cancelada.');
    }
  };

  const visibleGifts = useMemo(() => {
    if (giftFilter === 'disponivel') {
      return gifts.filter((g) => (g.status || 'disponivel') === 'disponivel');
    }
    return gifts;
  }, [gifts, giftFilter]);

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-ink p-4">
        <p className="font-serif-display text-xl">Carregando convite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-ink pb-16">
      {/* Barra superior discreta */}
      <div className="bg-card border-b border-theme">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink">
            <Heart className="w-3.5 h-3.5" />
            <span>Convite Digital • Eternize</span>
          </div>

          <div className="flex items-center gap-2">
            {isOwnerPreview && onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao Painel dos Noivos
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              title="Alternar tema"
              className="p-2 rounded-xl bg-subtle text-ink hover:opacity-85 cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {currentGuest && (
              <button
                type="button"
                onClick={handleGuestLogout}
                title="Sair do convite"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-subtle text-ink text-xs font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero do Casamento */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-6 text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-subtle border border-theme text-xs font-semibold text-ink">
          <Sparkles className="w-3.5 h-3.5" />
          Você foi convidado(a) para celebrar conosco
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-ink">
          {wedding?.coupleNames?.trim() || 'Nosso Casamento'}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarHeart className="w-4 h-4 text-ink" />
            {wedding?.weddingDate
              ? `${formatDateBR(wedding.weddingDate)}${
                  wedding.weddingTime ? ` às ${wedding.weddingTime}` : ''
                }`
              : 'Data em breve'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-ink" />
            {wedding?.venue?.trim() || 'Local em breve'}
          </span>
        </div>

        {/* Contagem Regressiva */}
        <div className="inline-grid grid-cols-4 gap-2 bg-card border border-theme p-2.5 rounded-2xl shadow-xs">
          {[
            { label: 'Dias', value: countdown.days },
            { label: 'Horas', value: countdown.hours },
            { label: 'Min', value: countdown.minutes },
            { label: 'Seg', value: countdown.seconds },
          ].map((item) => (
            <div key={item.label} className="bg-subtle px-3 py-1.5 rounded-xl min-w-[58px]">
              <div className="text-base sm:text-lg font-bold text-ink">{item.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 space-y-6">
        {authError ? (
          <div className="bg-card border border-theme rounded-2xl p-6 text-center text-sm text-ink">
            {authError}
          </div>
        ) : !currentGuest ? (
          /* TELA DE IDENTIFICAÇÃO DO CONVIDADO */
          <div className="max-w-md mx-auto bg-card border border-theme rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-subtle text-ink flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-ink">Acesse seu Convite</h2>
              <p className="text-xs text-muted leading-relaxed">
                Digite o <strong className="text-ink">PIN de 4 dígitos</strong> impresso no seu
                convite ou o <strong className="text-ink">seu número de celular</strong> com DDD.
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-subtle border border-theme text-xs text-ink">
                {loginError}
              </div>
            )}

            <form onSubmit={handleGuestLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                  PIN de 4 dígitos ou Celular
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: 4829 ou (11) 99999-8888"
                    value={accessInput}
                    onChange={(e) => setAccessInput(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-primary border border-theme text-ink text-base font-semibold tracking-wide focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 cursor-pointer"
              >
                Abrir Meu Convite
              </button>
            </form>
          </div>
        ) : (
          /* ÁREA EXCLUSIVA DO CONVIDADO LOGADO (4 ABAS SOMENTE LEITURA + ENVIO DE FOTOS) */
          <>
            {/* Navegação de Abas do Convidado */}
            <nav className="flex flex-wrap items-center justify-center gap-2 bg-card border border-theme p-2 rounded-2xl shadow-xs">
              {[
                { id: 'mesa', label: 'Minha Mesa', icon: Users },
                { id: 'layout', label: 'Layout do Salão', icon: LayoutGrid },
                { id: 'presentes', label: 'Lista de Presentes', icon: Gift },
                {
                  id: 'fotos',
                  label: `Fotos do Casamento (${photos.length})`,
                  icon: Camera,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = guestTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setGuestTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-accent text-accent-contrast shadow-xs'
                        : 'text-ink hover:bg-subtle'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* ABA 1: MINHA MESA & CONFIRMAÇÃO DE PRESENÇA */}
            {guestTab === 'mesa' && (
              <div className="bg-card border border-theme rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme pb-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Bem-vindo(a)
                    </span>
                    <h2 className="text-2xl font-bold text-ink">{currentGuest.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Convite para {currentGuest.adults ?? 1} adulto(s)
                        {Number(currentGuest.children) > 0
                          ? ` e ${currentGuest.children} criança(s)`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div>
                    {currentGuest.rsvp === 'confirmado' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-contrast text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Presença Confirmada
                      </span>
                    ) : currentGuest.rsvp === 'recusado' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-subtle text-muted text-xs font-bold">
                        <XCircle className="w-4 h-4" /> Não poderá comparecer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-subtle border border-theme text-ink text-xs font-bold">
                        Aguardando sua confirmação
                      </span>
                    )}
                  </div>
                </div>

                {/* Cartão de Mesa Reservada */}
                <div className="bg-subtle/70 border border-theme rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Sua Mesa no Salão
                  </div>
                  {assignedTable ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xl font-bold text-ink">{assignedTable.name}</h3>
                        <button
                          type="button"
                          onClick={() => setGuestTab('layout')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          Ver no Mapa do Salão
                        </button>
                      </div>
                      {tableCompanions.length > 1 && (
                        <p className="text-xs text-muted pt-1">
                          Convidados nesta mesa:{' '}
                          <strong className="text-ink">
                            {tableCompanions.map((c) => c.name).join(', ')}
                          </strong>
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-ink">
                      Sua mesa será definida em breve pelos noivos. Volte aqui perto da data do
                      evento!
                    </p>
                  )}
                </div>

                {/* Botões de Confirmação RSVP */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-ink">
                    Você confirma sua presença no nosso casamento?
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={savingRsvp}
                      onClick={() => handleUpdateRsvp('confirmado')}
                      className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
                        currentGuest.rsvp === 'confirmado'
                          ? 'bg-accent text-accent-contrast shadow-sm'
                          : 'bg-subtle text-ink border border-theme hover:opacity-90'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Sim, eu vou! (Confirmar)
                    </button>

                    <button
                      type="button"
                      disabled={savingRsvp}
                      onClick={() => handleUpdateRsvp('recusado')}
                      className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
                        currentGuest.rsvp === 'recusado'
                          ? 'bg-accent text-accent-contrast shadow-sm'
                          : 'bg-subtle text-ink border border-theme hover:opacity-90'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      Não poderei ir
                    </button>
                  </div>
                </div>

                {/* Campo de Restrições Alimentares */}
                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                    <Utensils className="w-3.5 h-3.5" />
                    Restrições alimentares ou observações (opcional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Ex: Vegetariano, intolerância a lactose, cadeirinha de bebê..."
                      value={dietaryDraft}
                      onChange={(e) => setDietaryDraft(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={savingRsvp}
                      onClick={handleSaveDietary}
                      className="px-4 py-2.5 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold hover:opacity-85 cursor-pointer"
                    >
                      Salvar Observação
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: LAYOUT DO SALÃO (SOMENTE LEITURA) */}
            {guestTab === 'layout' && (
              <LayoutPlanner
                wedding={wedding}
                weddingId={weddingId}
                tables={tables}
                guests={guests}
                layoutItems={layoutItems}
                readOnly={true}
                highlightTableId={currentGuest?.tableId || null}
              />
            )}

            {/* ABA 3: LISTA DE PRESENTES (SOMENTE RESERVA) */}
            {guestTab === 'presentes' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                      <Gift className="w-5 h-5" />
                      Lista de Presentes
                    </h3>
                    <p className="text-xs text-muted">
                      Escolha um item para presentear os noivos e reserve para evitar presentes
                      repetidos
                    </p>
                  </div>

                  {gifts.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setGiftFilter('todos')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                          giftFilter === 'todos'
                            ? 'bg-accent text-accent-contrast'
                            : 'bg-card border border-theme text-ink'
                        }`}
                      >
                        Todos ({gifts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGiftFilter('disponivel')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                          giftFilter === 'disponivel'
                            ? 'bg-accent text-accent-contrast'
                            : 'bg-card border border-theme text-ink'
                        }`}
                      >
                        Disponíveis (
                        {gifts.filter((g) => (g.status || 'disponivel') === 'disponivel').length})
                      </button>
                    </div>
                  )}
                </div>

                {visibleGifts.length === 0 ? (
                  <div className="bg-card border border-theme rounded-2xl p-8 text-center text-sm text-muted">
                    Nenhum presente disponível nesta visualização no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleGifts.map((gift) => {
                      const status = gift.status || 'disponivel';
                      const isAvailable = status === 'disponivel';
                      const isReservedByMe =
                        !isAvailable &&
                        (gift.reservedByGuestId === currentGuest.id ||
                          gift.reservedBy?.toLowerCase() === currentGuest.name?.toLowerCase());

                      return (
                        <div
                          key={gift.id}
                          className="bg-card border border-theme rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs"
                        >
                          <div>
                            {gift.imageUrl ? (
                              <img
                                src={gift.imageUrl}
                                alt={gift.title}
                                className="w-full h-44 object-cover border-b border-theme bg-subtle"
                              />
                            ) : (
                              <div className="w-full h-44 bg-subtle border-b border-theme flex items-center justify-center text-muted">
                                <Gift className="w-10 h-10 opacity-50" />
                              </div>
                            )}

                            <div className="p-4 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                                  {gift.category || 'Presente'}
                                </span>
                                {Number(gift.price) > 0 && (
                                  <span className="text-xs font-bold text-ink">
                                    {formatCurrency(gift.price)}
                                  </span>
                                )}
                              </div>

                              <h4 className="font-bold text-base text-ink leading-snug">
                                {gift.title}
                              </h4>

                              {!isAvailable && (
                                <p className="text-xs text-muted pt-1">
                                  {isReservedByMe
                                    ? 'Reservado por você!'
                                    : 'Já escolhido por outro convidado'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="px-4 pb-4 pt-2 border-t border-theme flex flex-wrap items-center justify-between gap-2">
                            {gift.link && (
                              <a
                                href={gift.link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-subtle text-ink text-xs font-semibold hover:opacity-85"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ver na Loja
                              </a>
                            )}

                            {isAvailable ? (
                              <button
                                type="button"
                                onClick={() => handleToggleGiftReservation(gift)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 cursor-pointer ml-auto"
                              >
                                <Gift className="w-3.5 h-3.5" />
                                Presentear
                              </button>
                            ) : isReservedByMe ? (
                              <button
                                type="button"
                                onClick={() => handleToggleGiftReservation(gift)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-subtle border border-theme text-ink text-xs font-semibold cursor-pointer ml-auto"
                              >
                                Cancelar Reserva
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-muted ml-auto">
                                Indisponível
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA 4: FOTOS DO CASAMENTO (ENVIO E GALERIA DOS CONVIDADOS) */}
            {guestTab === 'fotos' && (
              <WeddingPhotosGallery
                weddingId={weddingId}
                photos={photos}
                uploaderName={currentGuest.name}
                canModerate={false}
                onNotify={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Aviso flutuante */}
      {feedbackMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-accent text-accent-contrast shadow-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}
    </div>
  );
}