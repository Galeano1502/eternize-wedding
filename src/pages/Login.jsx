import { useState } from 'react';
import { Heart, Mail, Lock, KeyRound, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isFirebaseConfigured } from '../services/firebase';

export default function Login({ onGuestPinLogin }) {
  const { loginEmail, registerEmail, loginGoogle, loginGuest } = useAuth();

  const [mode, setMode] = useState('couple'); // 'couple' | 'guest-pin'
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [weddingCode, setWeddingCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('convite') || params.get('w') || '').toUpperCase();
  });
  const [guestPin, setGuestPin] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-primary text-ink">
        <div className="max-w-lg w-full bg-card border border-theme rounded-2xl p-8 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-subtle flex items-center justify-center text-ink">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Configure seu Firebase</h1>
          <p className="text-sm text-muted leading-relaxed">
            Preencha as variáveis do seu projeto no arquivo{' '}
            <code className="px-1.5 py-0.5 rounded bg-subtle">.env.local</code> na raiz do
            projeto e reinicie o servidor.
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
      setError('Não foi possível autenticar. Verifique e-mail, senha e métodos ativos no Firebase Auth.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestPinSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPin = guestPin.trim();
    if (!cleanPin) {
      setError('Informe o PIN do seu convite.');
      return;
    }

    setSubmitting(true);
    try {
      await loginGuest();
      if (onGuestPinLogin) {
        await onGuestPinLogin({
          pin: cleanPin,
          weddingCode: weddingCode.trim().toUpperCase(),
        });
      }
    } catch (err) {
      setError(err?.message || 'PIN inválido ou não encontrado. Confira o código do seu convite.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary text-ink">
      <div className="max-w-md w-full bg-card border border-theme rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold">Eternize</h1>
          <p className="text-sm text-muted mt-1">
            {mode === 'guest-pin'
              ? 'Acesso exclusivo do convidado com PIN'
              : 'Planejador de Casamento sincronizado na nuvem'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-subtle border border-theme text-xs text-ink">
            {error}
          </div>
        )}

        {mode === 'guest-pin' ? (
          <form onSubmit={handleGuestPinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                PIN do Convidado
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-muted" />
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ex: 4829"
                  value={guestPin}
                  onChange={(e) => setGuestPin(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm tracking-widest font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                Código do Casamento (se não veio no QR Code)
              </label>
              <input
                type="text"
                placeholder="Ex: ABC123"
                value={weddingCode}
                onChange={(e) => setWeddingCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm uppercase focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 transition cursor-pointer"
            >
              {submitting ? 'Validando PIN...' : 'Entrar com PIN'}
            </button>

            <button
              type="button"
              onClick={() => {
                setError('');
                setMode('couple');
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary border border-theme text-muted font-medium text-xs hover:text-ink transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login do casal
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleCoupleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  E-mail do Casal
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-muted" />
                  <input
                    type="email"
                    required
                    placeholder="casal@exemplo.com"
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
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-muted" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-primary border border-theme text-ink text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-accent text-accent-contrast font-semibold text-sm hover:opacity-90 transition cursor-pointer"
              >
                {submitting
                  ? 'Conectando...'
                  : isRegister
                  ? 'Criar Conta do Casamento'
                  : 'Entrar no Planejador'}
              </button>
            </form>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() =>
                  loginGoogle().catch(() =>
                    setError('Ative o login com Google no Console do Firebase.')
                  )
                }
                className="w-full py-2.5 rounded-xl bg-subtle border border-theme text-ink font-semibold text-sm hover:opacity-90 transition cursor-pointer"
              >
                Continuar com Google
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('guest-pin');
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary border border-theme text-ink font-semibold text-xs hover:bg-subtle transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                Convidado (Entrar com PIN)
              </button>
            </div>

            <p className="text-center text-xs text-muted mt-6">
              {isRegister ? 'Já possui conta?' : 'Ainda não tem conta?'}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-bold text-ink underline cursor-pointer"
              >
                {isRegister ? 'Fazer login' : 'Cadastre-se'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}