import {
  Users,
  CheckSquare,
  Wallet,
  Briefcase,
  Armchair,
  LayoutGrid,
  Gift,
  Camera,
} from 'lucide-react';

const TABS = [
  { id: 'guests', label: 'Administrar Convidados', icon: Users },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'budget', label: 'Orçamento', icon: Wallet },
  { id: 'vendors', label: 'Fornecedores', icon: Briefcase },
  { id: 'tables', label: 'Mesas', icon: Armchair },
  { id: 'layout', label: 'Layout & Planta', icon: LayoutGrid },
  { id: 'gifts', label: 'Lista de Presentes', icon: Gift },
  { id: 'photos', label: 'Fotos', icon: Camera },
];

export default function TabNav({ activeTab, onChangeTab, counts = {} }) {
  return (
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 no-print">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-accent text-accent-contrast shadow-xs'
                  : 'bg-card border border-theme text-ink hover:bg-subtle'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof count === 'number' && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-accent-contrast text-accent'
                      : 'bg-subtle text-ink'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}