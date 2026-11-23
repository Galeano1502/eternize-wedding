import { useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, CheckSquare } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

const STAGES = [
  '12+ meses antes',
  '9 a 12 meses antes',
  '6 a 9 meses antes',
  '3 a 6 meses antes',
  '1 a 3 meses antes',
  'Semana do casamento',
];

export default function Checklist({ items, onAdd, onUpdate, onDelete, onNotify }) {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState(STAGES[0]);
  const [dueDate, setDueDate] = useState('');
  const [filterStage, setFilterStage] = useState('todas');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd({
      title: title.trim(),
      stage,
      dueDate,
      completed: false,
    });
    setTitle('');
    setDueDate('');
    onNotify?.('Tarefa adicionada ao checklist!');
  };

  const filtered = items.filter((t) =>
    filterStage === 'todas' ? true : t.stage === filterStage
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Checklist do Casamento</h2>
        <p className="text-sm text-muted">
          Organize todas as etapas até o grande dia.
        </p>
      </div>

      {/* Formulário Rápido */}
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-theme rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <input
          type="text"
          required
          placeholder="Ex: Fechar buffet e degustação..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="md:col-span-2 px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-accent-contrast text-sm font-semibold hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Adicionar Tarefa
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa cadastrada"
          description="Comece adicionando as primeiras tarefas do planejamento acima."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterStage('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                filterStage === 'todas'
                  ? 'bg-accent text-accent-contrast'
                  : 'bg-card border border-theme text-ink'
              }`}
            >
              Todas ({items.length})
            </button>
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStage(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  filterStage === s
                    ? 'bg-accent text-accent-contrast'
                    : 'bg-card border border-theme text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="bg-card border border-theme rounded-2xl divide-y divide-theme">
            {filtered.map((task) => (
              <div
                key={task.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-subtle/40"
              >
                <button
                  onClick={() => onUpdate(task.id, { completed: !task.completed })}
                  className="flex items-center gap-3 text-left flex-1 cursor-pointer"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-ink shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted shrink-0" />
                  )}
                  <div>
                    <div
                      className={`text-sm font-semibold ${
                        task.completed ? 'line-through text-muted' : 'text-ink'
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="text-xs text-muted">
                      {task.stage} {task.dueDate ? `• Prazo: ${task.dueDate}` : ''}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onDelete(task.id);
                    onNotify?.('Tarefa removida.');
                  }}
                  className="p-2 rounded-lg bg-subtle text-ink hover:opacity-80 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
