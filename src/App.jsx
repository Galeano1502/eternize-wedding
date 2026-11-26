import { useEffect, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
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
import {
  seedDemoWeddingData,
  DEMO_WEDDING_ID,
} from './services/demoSeedService';

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

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('guests');
  const [coupleModalOpen, setCoupleModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [guestSession, setGuestSession] = useState(null);
  const [resolvingGuest, setResolvingGuest] = useState(false);

  const uid = user?.uid;
  const { wedding, weddingId, setWeddingId } = useWedding(
    guestSession ? null : uid
  );

  const effectiveWeddingId = guestSession?.weddingId || weddingId;

  const { guests, stats: guestStats } = useGuests(effectiveWeddingId);
  const checklistCol = useCollection(effectiveWeddingId, 'checklist');
  const budgetCol = useCollection(effectiveWeddingId, 'budget');
  const vendorsCol = useCollection(effectiveWeddingId, 'vendors');
  const tablesCol = useCollection(effectiveWeddingId, 'tables');
  const layoutCol = useCollection(effectiveWeddingId, 'layoutItems');
  const giftsCol = useCollection(effectiveWeddingId, 'gifts');
  const photosCol = useCollection(effectiveWeddingId, 'photos');

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
    setResolvingGuest(true);
    try {
      const result = await findGuestByPin({ pin, weddingCode });
      setGuestSession({
        weddingId: result.weddingId,
        wedding: result.weddingData,
        guest: result.guestData,
      });
    } finally {
      setResolvingGuest(false);
    }
  };

  const handleExitGuest = async () => {
    setGuestSession(null);
    if (logout) {
      await logout().catch(() => {});
    }
  };

  const handleDemoLogin = async () => {
    let currentUser = auth.currentUser;
    if (!currentUser) {
      const cred = await signInAnonymously(auth);
      currentUser = cred.user;
    }
    const demoId = await seedDemoWeddingData(currentUser.uid);
    setWeddingId(demoId);
  };

  if (authLoading && !resolvingGuest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-ink">
        <p className="font-serif-display text-xl">Carregando Eternize...</p>
      </div>
    );
  }

  if (guestSession) {
    const liveGuest =
      guests.find((g) => g.id === guestSession.guest?.id) || guestSession.guest;

    return (
      <>
        <GuestPortal
          weddingId={guestSession.weddingId}
          wedding={activeWedding}
          guest={liveGuest}
          guests={guests}
          tables={tablesCol.items}
          layoutItems={layoutCol.items}
          gifts={giftsCol.items}
          photos={photosCol.items}
          onUpdateGift={giftsCol.updateItem}
          onAddPhoto={photosCol.addItem}
          onExit={handleExitGuest}
          onLogout={handleExitGuest}
          onNotify={notify}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (!user || resolvingGuest) {
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
    });
    notify('Backup JSON baixado!');
  };

  const handleClearAll = async () => {
    if (!window.confirm('Tem certeza que deseja zerar todos os dados do casamento?')) {
      return;
    }
    await clearAllWeddingData(weddingId);
    notify('Todos os dados foram zerados.', 'info');
  };

  const isDemo = weddingId === DEMO_WEDDING_ID;

  return (
    <div className="min-h-screen bg-primary text-ink pb-16">
      <Header
        wedding={wedding}
        weddingId={weddingId}
        isDemo={isDemo}
        onResetDemo={
          isDemo
            ? async () => {
                await seedDemoWeddingData(uid, { force: true });
                notify('Dados de demonstração de Bibi & Nick restaurados!');
              }
            : undefined
        }
        onOpenCoupleModal={() => setCoupleModalOpen(true)}
        onExportBackup={handleExportBackup}
        onClearAll={handleClearAll}
        onLogout={logout}
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
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'guests' && (
          <GuestsAdmin
            uid={weddingId}
            wedding={wedding}
            weddingId={weddingId}
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
            weddingId={weddingId}
            gifts={giftsCol.items}
            onAdd={giftsCol.addItem}
            onUpdate={giftsCol.updateItem}
            onDelete={giftsCol.deleteItem}
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