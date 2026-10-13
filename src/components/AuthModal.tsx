import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Lock, Mail, User as UserIcon, Phone, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode, onClose, onSuccess }) => {
  const { login, register, quickDemoLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password, phone || undefined);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role: 'patient' | 'admin') => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoLogin(role);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-xs">
      <div className="bg-[#FCFBF8] rounded-3xl max-w-md w-full border border-[#E8E4DA] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#F7F5EE] border-b border-[#E8E4DA] flex items-center justify-between">
          <div>
            <h2 className="font-bold text-emerald-950 text-base font-serif">
              {mode === 'login' ? 'Patient & Doctor Sign In' : 'Register for OPD Pass'}
            </h2>
            <p className="text-xs text-emerald-900/60 mt-0.5">
              CareFlow Outpatient Department Network
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-800/60 hover:text-emerald-950 hover:bg-emerald-100/50 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Demo Switcher */}
        <div className="px-6 pt-4 pb-1">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              1-Click Demo Profiles
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemo('patient')}
                className="py-1.5 px-2 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-950 transition shadow-2xs text-center"
              >
                Patient (Priya)
              </button>
              <button
                type="button"
                onClick={() => handleDemo('admin')}
                className="py-1.5 px-2 bg-emerald-900 hover:bg-emerald-800 border border-emerald-900 rounded-xl font-bold text-white transition shadow-2xs text-center"
              >
                Admin (Dr. Gupta)
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 pt-3 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block font-bold text-emerald-950 mb-1">
                  Full Legal Name
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-700/60 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Priya Sundaram"
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-emerald-950 mb-1">
                  Mobile Number (for WhatsApp OPD Pass)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-emerald-700/60 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 transition"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-emerald-950 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-emerald-700/60 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@example.com"
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-emerald-950 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-emerald-700/60 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Authenticating...
              </>
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              'Register OPD Profile'
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-xs text-emerald-900/70 hover:text-emerald-950 font-semibold"
            >
              {mode === 'login'
                ? "First time patient? Register here"
                : 'Already registered? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
