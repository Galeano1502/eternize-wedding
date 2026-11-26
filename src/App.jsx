import { useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { Sparkles, RotateCcw, LogOut } from 'lucide-react';
import { auth } from './services/firebase';
import { useAuth } from './contexts/AuthContext';
import { useWedding } from './hooks/useWedding';
import { useGuests } from './hooks/useGuests';
import { useCollection } from './hooks/useCollection';
import {
  updateWeddingInfo,
  clearAllWeddingData,
  downloadJsonBackup,
} from './services/weddingService';
import { findGuestByPin } from './services/guestInviteService';
import { seedDemoWeddingData } from './services/demoSeedService';

import Login from './pages/Login';
import GuestPortal from './pages/GuestPortal';
import Header from './components/layout/Header';
import KpiCards from './components/layout/KpiCards';
import TabNav from './components/layout/TabNav';
import CoupleModal from './components/modals/CoupleModal';
import Toast from './components/ui/Toast';

import GuestsAdmin from './pages/GuestsAdmin';
import Checklist from './pages/Checklist';
import Budget from './pages/Budget';
import Vendors from './pages/Vendors';
import Tables from './pages/Tables';
import LayoutPlanner from './pages/LayoutPlanner';
import GiftRegistry from './pages/GiftRegistry';
import WeddingPhotosGallery from './components/photos/WeddingPhotosGallery';

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('guests');
  const [coupleModalOpen, setCoupleModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [guestSession, setGuestSession] = useState(null);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [demoMode, setDemoMode] = useState(() => {
    try {
      return sessionStorage.getItem('eternize_demo_mode') === '1';
    } catch {
      return false;
    }
  });

  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const inviteWeddingId = searchParams?.get('convite') || '';
  const invitePinParam = searchParams?.get('pin') || '';

  const uid = user?.uid;
  const shouldLoadCoupleWedding =
    !guestSession && !inviteWeddingId && user && (!user.isAnonymous || demoMode);

  const { wedding, weddingId, setWeddingId } = useWedding(
    shouldLoadCoupleWedding ? uid : null
  );
  const { guests, stats: guestStats } = useGuests(weddingId);
  const checklistCol = useCollection(weddingId, 'checklist');
  const budgetCol = useCollection(weddingId, 'budget');
  const vendorsCol = useCollection(weddingId, 'vendors');
  const tablesCol = useCollection(weddingId, 'tables');
  const layoutCol = useCollection(weddingId, 'layoutItems');
  const giftsCol = useCollection(weddingId, 'gifts');
  const photosCol = useCollection(weddingId, 'photos');

  const activeWedding = guestSession
    ? { ...guestSession.wedding, ...wedding }
    : wedding;

  useEffect(() => {
    const coupleLabel = activeWedding?.coupleNames?.trim();
    document.title = coupleLabel
      ? `${coupleLabel} — Eternize`
      : 'Eternize — Planejador de Casamento';
  }, [activeWedding?.coupleNames]);

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleGuestPinLogin = async ({ pin, weddingCode }) => {
    const result = await findGuestByPin({ pin, weddingCode });
    setGuestSession({
      weddingId: result.weddingId,
      wedding: result.weddingData,
      guest: result.guestData,
    });
  };

  const handleDemoLogin = async () => {
    if (!auth) throw new Error('Firebase não configurado.');
    const cred = auth.currentUser
      ? { user: auth.currentUser }
      : await signInAnonymously(auth);
    const demoId = await seedDemoWeddingData(cred.user.uid, { force: false });
    try {
      sessionStorage.setItem('eternize_demo_mode', '1');
    } catch {
      // ignora
    }
    setDemoMode(true);
    setWeddingId(demoId);
    notify('Perfil demonstração Bibi & Nick carregado!');
  };

  const handleRestoreDemoData = async () => {
    if (!uid || resettingDemo) return;
    setResettingDemo(true);
    try {
      const demoId = await seedDemoWeddingData(uid, { force: true });
      setWeddingId(demoId);
      notify('Dados genéricos de Bibi & Nick restaurados!');
    } finally {
      setResettingDemo(false);
    }
  };

  const handleFullLogout = async () => {
    try {
      sessionStorage.removeItem('eternize_demo_mode');
    } catch {
      // ignora
    }
    setDemoMode(false);
    setGuestSession(null);
    await logout();
  };

  // 1. Modo Convidado via QR Code (?convite=...)
  if (inviteWeddingId) {
    return (
      <GuestPortal
        weddingId={inviteWeddingId}
        initialPin={invitePinParam}
        onExitPreview={() => {
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  // 2. Modo Convidado autenticado via PIN na tela de Login
  if (guestSession) {
    return (
      <GuestPortal
        weddingId={guestSession.weddingId}
        initialPin={guestSession.guest?.pin || ''}
        initialGuest={guestSession.guest}
        initialWedding={guestSession.wedding}
        onExitPreview={() => {
          setGuestSession(null);
          logout();
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-ink">
        <p className="font-serif-display text-xl">Carregando Eternize...</p>
      </div>
    );
  }

  if (!user || (user.isAnonymous && !demoMode)) {
    return (
      <Login
        onGuestPinLogin={handleGuestPinLogin}
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  const handleExportBackup = () => {
    downloadJsonBackup({
      exportedAt: new Date().toISOString(),
      wedding,
      guests,
      checklist: checklistCol.items,
      budget: budgetCol.items,
      vendors: vendorsCol.items,
      tables: tablesCol.items,
      layoutItems: layoutCol.items,
      gifts: giftsCol.items,
      photos: photosCol.items,
    });
    notify('Backup JSON baixado!');
  };

  const handleClearAll = async () => {
    if (!window.confirm('Tem certeza que deseja zerar todos os dados do casamento?')) return;
    await clearAllWeddingData(weddingId);
    notify('Todos os dados foram zerados.', 'info');
  };

  return (
    <div className="min-h-screen bg-primary text-ink pb-16">
      {demoMode && (
        <div className="bg-accent text-accent-contrast px-4 py-2 text-xs no-print">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Modo Demonstração • Bibi &amp; Nick (Código: BIBI27 • PINs: 1001 a 1008)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={resettingDemo}
                onClick={handleRestoreDemoData}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-contrast text-accent font-bold hover:opacity-90 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                {resettingDemo ? 'Restaurando...' : 'Restaurar Dados Demo'}
              </button>
              <button
                type="button"
                onClick={handleFullLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-current/30 font-semibold hover:opacity-85 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                Sair do Demo
              </button>
            </div>
          </div>
        </div>
      )}

      <Header
        wedding={wedding}
        onOpenCoupleModal={() => setCoupleModalOpen(true)}
        onExportBackup={handleExportBackup}
        onClearAll={handleClearAll}
        onLogout={handleFullLogout}
      />

      <KpiCards
        guestStats={guestStats}
        checklist={checklistCol.items}
        budget={budgetCol.items}
        vendors={vendorsCol.items}
      />

      <TabNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        counts={{
          guests: guests.length,
          checklist: checklistCol.items.length,
          budget: budgetCol.items.length,
          vendors: vendorsCol.items.length,
          tables: tablesCol.items.length,
          layout: layoutCol.items.length,
          gifts: giftsCol.items.length,
          photos: photosCol.items.length,
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'guests' && (
          <GuestsAdmin
            uid={weddingId}
            wedding={wedding}
            guests={guests}
            stats={guestStats}
            tables={tablesCol.items}
            onNotify={notify}
          />
        )}

        {activeTab === 'checklist' && (
          <Checklist
            items={checklistCol.items}
            onAdd={checklistCol.addItem}
            onUpdate={checklistCol.updateItem}
            onDelete={checklistCol.deleteItem}
            onNotify={notify}
          />
        )}

        {activeTab === 'budget' && (
          <Budget
            items={budgetCol.items}
            onAdd={budgetCol.addItem}
            onDelete={budgetCol.deleteItem}
            onNotify={notify}
          />
        )}

        {activeTab === 'vendors' && (
          <Vendors
            items={vendorsCol.items}
            onAdd={vendorsCol.addItem}
            onDelete={vendorsCol.deleteItem}
            onNotify={notify}
          />
        )}

        {activeTab === 'tables' && (
          <Tables
            uid={weddingId}
            tables={tablesCol.items}
            guests={guests}
            onAdd={tablesCol.addItem}
            onDelete={tablesCol.deleteItem}
            onNotify={notify}
          />
        )}

        {activeTab === 'layout' && (
          <LayoutPlanner
            wedding={wedding}
            weddingId={weddingId}
            tables={tablesCol.items}
            guests={guests}
            layoutItems={layoutCol.items}
            onAddTable={tablesCol.addItem}
            onUpdateTable={tablesCol.updateItem}
            onDeleteTable={tablesCol.deleteItem}
            onAddLayoutItem={layoutCol.addItem}
            onUpdateLayoutItem={layoutCol.updateItem}
            onDeleteLayoutItem={layoutCol.deleteItem}
            onNotify={notify}
          />
        )}

        {activeTab === 'gifts' && (
          <GiftRegistry
            items={giftsCol.items}
            onAdd={giftsCol.addItem}
            onUpdate={giftsCol.updateItem}
            onDelete={giftsCol.deleteItem}
            onNotify={notify}
          />
        )}

        {activeTab === 'photos' && (
          <WeddingPhotosGallery
            weddingId={weddingId}
            photos={photosCol.items}
            uploaderName={wedding?.coupleNames?.trim() || 'Noivos'}
            canModerate={true}
            onNotify={notify}
          />
        )}
      </main>

      <CoupleModal
        isOpen={coupleModalOpen}
        onClose={() => setCoupleModalOpen(false)}
        wedding={wedding}
        uid={uid}
        onJoinedWedding={(newId) => setWeddingId(newId)}
        onSave={async (data) => {
          await updateWeddingInfo(weddingId, data);
          notify('Dados do casal salvos no Firebase!');
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}