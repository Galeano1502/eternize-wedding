import { Wallet, Users, CheckSquare, Briefcase } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function KpiCards({ guestStats, checklist, budget, vendors }) {
  const totalClosed = budget.reduce((acc, b) => acc + (Number(b.closed) || 0), 0);
  const totalPaid = budget.reduce((acc, b) => acc + (Number(b.paid) || 0), 0);
  const budgetPct = totalClosed > 0 ? Math.min(100, Math.round((totalPaid / totalClosed) * 100)) : 0;

  const doneTasks = checklist.filter((t) => t.completed).length;
  const totalTasks = checklist.length;
  const tasksPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const hiredVendors = vendors.filter((v) => v.status === 'Contratado').length;

  const cards = [
    {
      title: 'Orçamento Fechado',
      value: formatCurrency(totalClosed),
      subtitle: `Pago: ${formatCurrency(totalPaid)} (${budgetPct}%)`,
      icon: Wallet,
      progress: budgetPct,
    },
    {
      title: 'Convidados Confirmados',
      value: `${guestStats.confirmedPeople} / ${guestStats.totalPeople}`,
      subtitle: `${guestStats.confirmedAdults} adultos • ${guestStats.confirmedChildren} crianças`,
      icon: Users,
      progress:
        guestStats.totalPeople > 0
          ? Math.round((guestStats.confirmedPeople / guestStats.totalPeople) * 100)
          : 0,
    },
    {
      title: 'Checklist Concluído',
      value: `${doneTasks} / ${totalTasks}`,
      subtitle: totalTasks > 0 ? `${tasksPct}% das etapas prontas` : 'Nenhuma tarefa ainda',
      icon: CheckSquare,
      progress: tasksPct,
    },
    {
      title: 'Fornecedores',
      value: `${hiredVendors} / ${vendors.length}`,
      subtitle: vendors.length > 0 ? 'Contratos fechados' : 'Nenhum fornecedor ainda',
      icon: Briefcase,
      progress: vendors.length > 0 ? Math.round((hiredVendors / vendors.length) * 100) : 0,
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 no-print">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-card border border-theme rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {card.title}
                </span>
                <div className="w-8 h-8 rounded-lg bg-subtle flex items-center justify-center text-ink">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-ink">{card.value}</div>
              <div className="text-xs text-muted mt-1">{card.subtitle}</div>
              <div className="w-full h-1.5 bg-subtle rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${card.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
