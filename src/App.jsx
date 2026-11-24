import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useWedding } from './hooks/useWedding';
import { useGuests } from './hooks/useGuests';
import { useCollection } from './hooks/useCollection';
import { findGuestByPin } from './services/guestInviteService';
import {
  updateWeddingInfo,
  clearAllWeddingData,
  downloadJsonBackup,
} from './services/weddingService';

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
  const [guestSession, setGuestSession] = useState(null); // { weddingId, wedding, guest }

  const uid = user?.uid;
  const effectiveWeddingId = guestSession?.weddingId || null;

  const { wedding, weddingId, setWeddingId, loading: weddingLoading } = useWedding(
    guestSession ? null : uid
  );

  const activeWeddingId = guestSession ? effectiveWeddingId : weddingId;

  const { guests, stats: guestStats } = useGuests(activeWeddingId);
  const checklistCol = useCollection(guestSession ? null : activeWeddingId, 'checklist');
  const budgetCol = useCollection(guestSession ? null : activeWeddingId, 'budget');
  const vendorsCol = useCollection(guestSession ? null : activeWeddingId, 'vendors');
  const tablesCol = useCollection(activeWeddingId, 'tables');
  const layoutCol = useCollection(activeWeddingId, 'layoutItems');
  const giftsCol = useCollection(activeWeddingId, 'gifts');

  const activeWedding = guestSession
    ? { ...wedding, ...guestSession.wedding, id: activeWeddingId }
    : { ...wedding, id: activeWeddingId };

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

  const handleGuestLogout = async () => {
    setGuestSession(null);
    await logout();
  };

  if (authLoading || (!guestSession && user && weddingLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-ink">
        <p className="font-serif-display text-xl">Carregando Eternize...</p>
      </div>
    );
  }

  if (guestSession) {
    const currentGuest =
      guests.find((g) => g.id === guestSession.guest?.id) || guestSession.guest;

    return (
      <>
        <GuestPortal
          wedding={activeWedding}
          guest={currentGuest}
          guests={guests}
          tables={tablesCol.items}
          layoutItems={layoutCol.items}
          gifts={giftsCol.items}
          onReserveGift={giftsCol.updateItem}
          onLogout={handleGuestLogout}
          onNotify={notify}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (!user) {
    return <Login onGuestPinLogin={handleGuestPinLogin} />;
  }

  const handleExportBackup = () => {
    downloadJsonBackup({
      exportedAt: new Date().toISOString(),
      wedding: activeWedding,
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
    if (!window.confirm('Tem certeza que deseja zerar todos os dados do casamento?')) return;
    await clearAllWeddingData(weddingId);
    notify('Todos os dados foram zerados.', 'info');
  };

  return (
    <div className="min-h-screen bg-primary text-ink pb-16">
      <Header
        wedding={activeWedding}
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
          layout: tablesCol.items.length + layoutCol.items.length,
          gifts: giftsCol.items.length,
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'guests' && (
          <GuestsAdmin
            uid={weddingId}
            wedding={activeWedding}
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
            wedding={activeWedding}
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
      </main>

      <CoupleModal
        isOpen={coupleModalOpen}
        onClose={() => setCoupleModalOpen(false)}
        wedding={activeWedding}
        uid={uid}
        onJoinedWedding={(newId) => {
          setWeddingId(newId);
          notify('Contas vinculadas com sucesso!');
        }}
        onSave={async (data) => {
          await updateWeddingInfo(weddingId, data);
          notify('Dados do casal salvos no Firebase!');
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}