import { Users, CheckSquare, Wallet, Briefcase, LayoutGrid, Map, Gift } from 'lucide-react';

const TABS = [
  { id: 'guests', label: 'Administrar Convidados', icon: Users },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'budget', label: 'Orçamento', icon: Wallet },
  { id: 'vendors', label: 'Fornecedores', icon: Briefcase },
  { id: 'tables', label: 'Mesas', icon: LayoutGrid },
  { id: 'layout', label: 'Layout & Planta', icon: Map },
  { id: 'gifts', label: 'Lista de Presentes', icon: Gift },
];

export default function TabNav({ activeTab, onChangeTab, counts }) {
  return (
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 no-print">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const count = counts?.[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                active
                  ? 'bg-accent text-accent-contrast shadow-sm'
                  : 'bg-card text-ink border border-theme hover:bg-subtle'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  active
                    ? 'bg-accent-contrast/20 text-accent-contrast'
                    : 'bg-subtle text-muted'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}