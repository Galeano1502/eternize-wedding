import { useState } from 'react';
import {
  Heart,
  Mail,
  Lock,
  KeyRound,
  Sparkles,
  AlertTriangle,
  Sun,
  Moon,
  Loader2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { isFirebaseConfigured } from '../services/firebase';

export default function Login({ onGuestPinLogin, onDemoLogin }) {
  const { loginEmail, registerEmail, loginGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState('couple'); // 'couple' | 'guest'
  const [isRegister, setIsRegister] = useState(false);

  // Campos Casal
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Campos Convidado
  const [pin, setPin] = useState('');
  const [weddingCode, setWeddingCode] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-primary text-ink">
        <div className="max-w-lg w-full bg-card border border-theme rounded-2xl p-8 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-subtle flex items-center justify-center text-ink">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Configure seu Firebase</h1>
          <p className="text-sm text-muted leading-relaxed">
            Para conectar o <strong>Eternize</strong> ao banco de dados em tempo real,
            preencha as variáveis do seu projeto no arquivo{' '}
            <code className="px-1.5 py-0.5 rounded bg-subtle">.env.local</code> e
            reinicie o servidor.
          </p>
        </div>
      </div>
    );
  }

  const handleCoupleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await registerEmail(email, password);
      } else {
        await loginEmail(email, password);
      }
    } catch {
      setError(
        'Não foi possível autenticar. Confira e-mail, senha (mín. 6 caracteres) e métodos ativos no Firebase.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onGuestPinLogin({ pin, weddingCode });
    } catch (err) {
      setError(err?.message || 'PIN não encontrado. Verifique os 4 dígitos do convite.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    if (!onDemoLogin) return;
    setError('');
    setDemoLoading(true);
    try {
      await onDemoLogin();
    } catch (err) {
      console.error(err);
      setError(
        'Não foi possível iniciar o perfil demonstração. Verifique se o login Anônimo está ativo no Firebase Authentication.'
      );
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-primary text-ink relative">
      {/* Botão de tema no canto superior */}
      <button
        type="button"
        onClick={toggleTheme}
        title="Alternar tema"
        className="fixed top-4 right-4 p-2.5 rounded-xl bg-card border border-theme text-ink hover:opacity-85 cursor-pointer shadow-xs"
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      <div className="max-w-md w-full space-y-4">
        {/* Card Principal de Login */}
        <div className="bg-card border border-theme rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold">Eternize</h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Planejador de Casamento sincronizado na nuvem
            </p>
          </div>

          {/* Seletor: Casal vs Convidado */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-subtle border border-theme">
            <button
              type="button"
              onClick={() => {
                setMode('couple');
                setError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'couple'
                  ? 'bg-accent text-accent-contrast shadow-xs'
                  : 'text-ink hover:opacity-80'
              }`}
            >
              Área dos Noivos
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('guest');
                setError('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'guest'
                  ? 'bg-accent text-accent-contrast shadow-xs'
                  : 'text-ink hover:opacity-80'
              }`}
            >
              Convidado (PIN)
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-subtle border border-theme text-xs text-ink">
              {error}
            </div>
          )}

          {mode === 'couple' ? (
            <form onSubmit={handleCoupleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || demoLoading}
                className="w-full py-3 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {submitting
                  ? 'Aguarde...'
                  : isRegister
                  ? 'Criar Conta do Casal'
                  : 'Entrar no Planejador'}
              </button>

              {loginGoogle && (
                <button
                  type="button"
                  disabled={submitting || demoLoading}
                  onClick={loginGoogle}
                  className="w-full py-2.5 rounded-xl bg-subtle border border-theme text-ink font-semibold text-xs hover:opacity-85 cursor-pointer"
                >
                  Continuar com Google
                </button>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                  }}
                  className="text-xs text-muted hover:text-ink underline cursor-pointer"
                >
                  {isRegister
                    ? 'Já tem conta? Faça login'
                    : 'Primeiro acesso? Criar conta gratuita'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  PIN do Convidado (4 dígitos) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Ex: 1001"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-base font-bold tracking-widest focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Código do Casal (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: BIBI27"
                  value={weddingCode}
                  onChange={(e) => setWeddingCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm uppercase focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || demoLoading}
                className="w-full py-3 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Verificando PIN...' : 'Acessar Meu Convite'}
              </button>
            </form>
          )}
        </div>

        {/* Cartão de Acesso Rápido ao Perfil Genérico (Bibi & Nick) */}
        <div className="bg-card border border-theme rounded-2xl p-5 shadow-md space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-subtle text-ink flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
                Perfil Demonstração • Bibi &amp; Nick
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Entre com 1 clique em um perfil já preenchido com dados genéricos
                (convidados, mesas, planta, orçamento, presentes e fotos).
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={demoLoading || submitting}
            onClick={handleDemoAccess}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-subtle border border-theme text-ink text-xs sm:text-sm font-bold hover:opacity-90 disabled:opacity-60 transition cursor-pointer"
          >
            {demoLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparando dados de Bibi &amp; Nick...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Entrar como Bibi &amp; Nick (Demo)
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-muted text-center">
            Dica: no modo demo, use os PINs <strong className="text-ink">1001</strong> a{' '}
            <strong className="text-ink">1008</strong> (código{' '}
            <strong className="text-ink">BIBI27</strong>) para testar a visão do convidado.
          </p>
        </div>
      </div>
    </div>
  );
}