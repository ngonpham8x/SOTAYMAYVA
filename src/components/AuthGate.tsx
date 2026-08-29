import React, { createContext, useContext, useEffect, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut, Mail, ShieldCheck } from 'lucide-react';

interface AuthSession {
  authenticated: boolean;
  email?: string;
  authConfigured?: boolean;
}

interface AppAuthContextValue {
  email: string | null;
  logout: () => Promise<void>;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function useAppAuth(): AppAuthContextValue | null {
  return useContext(AppAuthContext);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể kết nối đăng nhập. Vui lòng thử lại.';
}

export const AuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Không thể kiểm tra phiên đăng nhập.');
        return data as AuthSession;
      })
      .then((data) => {
        if (active) setSession(data);
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
          setSession({ authenticated: false, authConfigured: true });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.authenticated) throw new Error(data.error || 'Email hoặc mật khẩu không đúng.');
      setPassword('');
      setSession({ authenticated: true, email: data.email, authConfigured: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setPassword('');
      setSession({ authenticated: false, authConfigured: true });
    }
  };

  if (!session) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white"><LoaderCircle className="w-8 h-8 animate-spin text-blue-300" aria-label="Đang kiểm tra đăng nhập" /></div>;
  }

  if (session.authenticated) {
    return <AppAuthContext.Provider value={{ email: session.email || null, logout }}>{children}</AppAuthContext.Provider>;
  }

  const missingConfiguration = session.authConfigured === false;
  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(circle_at_top,_#1d4ed8_0,_transparent_42%),linear-gradient(135deg,_#0f172a,_#020617)] flex items-center justify-center p-4 sm:p-6">
      <main className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-white shadow-2xl">
        <div className="bg-slate-900 px-6 pt-7 pb-6 text-center text-white">
          <img src="/somaythongminh.jpg" alt="Sổ May Thông Minh" className="mx-auto h-20 w-20 rounded-2xl object-cover ring-4 ring-white/15 shadow-xl" />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight">Sổ May Thông Minh</h1>
          <p className="mt-1 text-sm text-slate-300">Đăng nhập để mở sổ công việc riêng của tiệm.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 p-5 sm:p-6">
          {missingConfiguration ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">Đăng nhập chưa được cấu hình. Chủ tiệm cần thêm biến bảo mật trong Vercel trước khi mở ứng dụng.</div> : null}
          {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}

          <label className="block text-sm font-bold text-slate-700">
            Email đăng nhập
            <span className="relative mt-1.5 block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="email@cuaban.com" required className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </span>
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Mật khẩu
            <span className="relative mt-1.5 block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-left transition hover:border-blue-200">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              <span className="block text-sm font-bold text-slate-700">Ghi nhớ đăng nhập trên thiết bị này</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">Giữ phiên an toàn đến 30 ngày. Mật khẩu không được lưu trên điện thoại.</span>
            </span>
          </label>
          <button type="submit" disabled={isSubmitting || missingConfiguration} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập vào sổ may'}
          </button>
          <p className="text-center text-xs leading-relaxed text-slate-500">Thông tin đăng nhập chỉ được kiểm tra trên máy chủ bảo mật và không hiển thị trong ứng dụng.</p>
        </form>
      </main>
    </div>
  );
};

export const LogoutControl: React.FC = () => {
  const auth = useAppAuth();
  if (!auth) return null;
  return (
    <button type="button" onClick={() => void auth.logout()} className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors" title={`Đăng xuất ${auth.email || ''}`}>
      <LogOut className="w-4 h-4" />
      <span className="hidden lg:inline">Đăng xuất</span>
    </button>
  );
};
