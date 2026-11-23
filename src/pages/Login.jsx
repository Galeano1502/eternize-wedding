import { useState } from 'react';
import { Heart, Mail, Lock, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isFirebaseConfigured } from '../services/firebase';

export default function Login() {
  const { loginEmail, registerEmail, loginGoogle, loginGuest } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
            Para conectar o <strong>Eternize</strong> ao banco de dados em tempo real, preencha as variáveis do seu projeto no arquivo{' '}
            <code className="px-1.5 py-0.5 rounded bg-subtle">.env.local</code> na raiz do VS Code e reinicie o servidor (<code className="px-1.5 py-0.5 rounded bg-subtle">npm run dev</code>).
          </p>
          <pre className="p-3.5 rounded-xl bg-subtle text-xs overflow-x-auto">
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
          </pre>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await registerEmail(email, password);
      } else {
        await loginEmail(email, password);
      }
    } catch (err) {
      setError('Não foi possível autenticar. Verifique e-mail, senha e métodos ativos no Firebase Auth.');
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
            Planejador de Casamento sincronizado na nuvem
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-subtle border border-theme text-xs text-ink">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            onClick={() => loginGoogle().catch(() => setError('Ative o login com Google no Console do Firebase.'))}
            className="w-full py-2.5 rounded-xl bg-subtle border border-theme text-ink font-semibold text-sm hover:opacity-90 transition cursor-pointer"
          >
            Continuar com Google
          </button>

          <button
            type="button"
            onClick={() => loginGuest().catch(() => setError('Ative o login Anônimo no Console do Firebase.'))}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary border border-theme text-muted font-medium text-xs hover:text-ink transition cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            Entrar rapidamente (Acesso Anônimo)
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
      </div>
    </div>
  );
}
