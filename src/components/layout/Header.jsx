import { useEffect, useState } from 'react';
import {
  CalendarHeart,
  MapPin,
  Sun,
  Moon,
  Settings,
  Download,
  Trash2,
  LogOut,
  Heart,
  Smartphone,
  Share,
  PlusSquare,
  X,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { formatDateBR, getCountdown } from '../../utils/formatters';

export default function Header({
  wedding,
  onOpenCoupleModal,
  onExportBackup,
  onClearAll,
  onLogout,
}) {
  const { theme, toggleTheme } = useTheme();
  const { canPromptNatively, isInstalled, isIOS, triggerInstall } = usePwaInstall();
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  const [countdown, setCountdown] = useState(() =>
    getCountdown(wedding?.weddingDate, wedding?.weddingTime)
  );

  useEffect(() => {
    setCountdown(getCountdown(wedding?.weddingDate, wedding?.weddingTime));
    const timer = setInterval(() => {
      setCountdown(getCountdown(wedding?.weddingDate, wedding?.weddingTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [wedding?.weddingDate, wedding?.weddingTime]);

  const hasCoupleInfo = Boolean(wedding?.coupleNames?.trim());

  const handleInstallClick = async () => {
    if (canPromptNatively) {
      await triggerInstall();
    } else {
      setInstallHelpOpen(true);
    }
  };

  return (
    <>
      <header className="bg-card border-b border-theme no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Identidade & Casal */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-subtle text-xs font-semibold tracking-wider uppercase text-ink">
                <Heart className="w-3.5 h-3.5" />
                Eternize • Planejador de Casamento
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-4xl font-bold text-ink">
                  {hasCoupleInfo ? wedding.coupleNames : 'Seu Casamento'}
                </h1>
                <button
                  onClick={onOpenCoupleModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  {hasCoupleInfo ? 'Editar Dados' : 'Configurar Dados do Casal'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarHeart className="w-4 h-4" />
                  {wedding?.weddingDate
                    ? `${formatDateBR(wedding.weddingDate)}${
                        wedding.weddingTime ? ` às ${wedding.weddingTime}` : ''
                      }`
                    : 'Data não definida'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {wedding?.venue?.trim() || 'Local a definir'}
                </span>
              </div>
            </div>

            {/* Contagem Regressiva & Ações */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="grid grid-cols-4 gap-2 bg-subtle p-2.5 rounded-2xl border border-theme">
                {[
                  { label: 'Dias', value: countdown.days },
                  { label: 'Horas', value: countdown.hours },
                  { label: 'Min', value: countdown.minutes },
                  { label: 'Seg', value: countdown.seconds },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-card px-3 py-1.5 rounded-xl text-center min-w-[54px]"
                  >
                    <div className="text-base sm:text-lg font-bold text-ink leading-tight">
                      {item.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isInstalled && (
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold hover:opacity-90 transition cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    Baixar App
                  </button>
                )}

                <button
                  onClick={toggleTheme}
                  title={
                    theme === 'light'
                      ? 'Mudar para Escuro (Azul Marinho & Bege)'
                      : 'Mudar para Claro (Bege & Azul Marinho)'
                  }
                  className="p-2.5 rounded-xl bg-subtle text-ink hover:opacity-85 transition cursor-pointer"
                >
                  {theme === 'light' ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={onExportBackup}
                  title="Exportar Backup JSON"
                  className="p-2.5 rounded-xl bg-subtle text-ink hover:opacity-85 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={onClearAll}
                  title="Limpar Todos os Dados"
                  className="p-2.5 rounded-xl bg-subtle text-ink hover:opacity-85 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  title="Sair da Conta"
                  className="p-2.5 rounded-xl bg-subtle text-ink hover:opacity-85 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Instrução de Instalação (iOS / Navegadores sem prompt direto) */}
      {installHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-theme rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Instalar Eternize</h3>
              <button
                onClick={() => setInstallHelpOpen(false)}
                className="p-1.5 rounded-lg hover:bg-subtle text-ink cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-muted">
                <li className="flex items-center gap-2.5">
                  <Share className="w-4 h-4 text-ink shrink-0" />
                  <span>
                    1. Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <PlusSquare className="w-4 h-4 text-ink shrink-0" />
                  <span>
                    2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <p className="text-sm text-muted leading-relaxed">
                No menu do seu navegador (três pontinhos no canto superior), selecione{' '}
                <strong className="text-ink">Instalar aplicativo</strong> ou{' '}
                <strong className="text-ink">Adicionar à tela inicial</strong> para baixar o{' '}
                <strong className="text-ink">Eternize</strong> no seu aparelho.
              </p>
            )}

            <button
              onClick={() => setInstallHelpOpen(false)}
              className="w-full py-2.5 rounded-xl bg-accent text-accent-contrast text-xs font-semibold cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}