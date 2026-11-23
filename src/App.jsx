import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useWedding } from './hooks/useWedding';
import { useGuests } from './hooks/useGuests';
import { useCollection } from './hooks/useCollection';
import {
  updateWeddingInfo,
  clearAllWeddingData,
  downloadJsonBackup,
} from './services/weddingService';

import Login from './pages/Login';
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

  const uid = user?.uid;
  const { wedding, weddingId, setWeddingId, loading: weddingLoading } = useWedding(uid);
  const { guests, stats: guestStats } = useGuests(weddingId);
  const checklistCol = useCollection(weddingId, 'checklist');
  const budgetCol = useCollection(weddingId, 'budget');
  const vendorsCol = useCollection(weddingId, 'vendors');
  const tablesCol = useCollection(weddingId, 'tables');
  const layoutCol = useCollection(weddingId, 'layoutItems');
  const giftsCol = useCollection(weddingId, 'gifts');

  const notify = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (authLoading || (user && weddingLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary text-ink">
        <p className="font-serif-display text-xl">Carregando Eternize...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
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
    if (!window.confirm('Tem certeza que deseja zerar todos os dados do casamento?')) return;
    await clearAllWeddingData(weddingId);
    notify('Todos os dados foram zerados.', 'info');
  };

  return (
    <div className="min-h-screen bg-primary text-ink pb-16">
      <Header
        wedding={wedding}
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
      </main>

      <CoupleModal
        isOpen={coupleModalOpen}
        onClose={() => setCoupleModalOpen(false)}
        wedding={wedding}
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