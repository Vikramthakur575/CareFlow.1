import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Stethoscope, LogOut, PhoneCall, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (initialMode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { user, logout, quickDemoLogin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E5DD]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          
          {/* Zone 1: Indian Healthcare Brand Wordmark */}
          <div 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-900 flex items-center justify-center text-white shadow-xs transition-colors group-hover:bg-emerald-950">
              <Stethoscope className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-emerald-950 font-serif">
                  CareFlow
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded font-mono uppercase tracking-wide">
                  INDIA
                </span>
              </div>
              <span className="text-[10px] font-medium tracking-wider text-emerald-800/60 uppercase -mt-0.5">
                Hospital OPD Network
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-normal text-emerald-900/80">
            <button
              onClick={() => onNavigate('home')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                currentView === 'home'
                  ? 'text-emerald-950 border-emerald-800 font-bold'
                  : 'border-transparent hover:text-emerald-950 hover:border-emerald-300'
              }`}
            >
              Find Specialists & OPD
            </button>

            {user && (
              <button
                onClick={() => onNavigate('patient-dashboard')}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  currentView === 'patient-dashboard'
                    ? 'text-emerald-950 border-emerald-800 font-bold'
                    : 'border-transparent hover:text-emerald-950 hover:border-emerald-300'
                }`}
              >
                My Consultations & Passes
              </button>
            )}

            {user?.role === 'admin' && (
              <button
                onClick={() => onNavigate('admin-dashboard')}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  currentView === 'admin-dashboard'
                    ? 'text-emerald-950 border-emerald-800 font-bold'
                    : 'border-transparent hover:text-emerald-950 hover:border-emerald-300'
                }`}
              >
                Hospital OPD Ledger
              </button>
            )}
          </nav>

          {/* Zone 3: Actions & Emergency Contact */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* Quick Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-900/60 border-r border-[#E0DCD3] pr-3">
              <span className="text-[11px] font-medium text-emerald-900/40">Demo:</span>
              <button
                onClick={() => quickDemoLogin('patient')}
                className="px-2 py-0.5 text-[11px] font-semibold text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/60 rounded transition-colors"
                title="Log in as demo patient Priya Sundaram"
              >
                Patient (Priya)
              </button>
              <span className="text-emerald-300" aria-hidden="true">·</span>
              <button
                onClick={() => quickDemoLogin('admin')}
                className="px-2 py-0.5 text-[11px] font-semibold text-emerald-900 hover:text-emerald-950 hover:bg-emerald-100/60 rounded transition-colors"
                title="Log in as Medical Director Dr. Ramesh Gupta"
              >
                Admin (Dr. Gupta)
              </button>
            </div>

            {/* Emergency badge */}
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-800 border border-red-200/70 rounded-full text-[11px] font-bold">
              <PhoneCall className="w-3 h-3 text-red-600 animate-pulse" />
              <span>Emergency 108 / 112</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-emerald-950 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium capitalize">
                    {user.role === 'admin' ? 'Medical Director' : 'Verified Patient'}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-emerald-900 text-emerald-100 flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user.name.charAt(0)}
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 text-emerald-700/60 hover:text-emerald-950 hover:bg-emerald-100/60 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:text-emerald-800 transition-colors whitespace-nowrap"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-900 hover:bg-emerald-800 rounded-xl transition-colors whitespace-nowrap shadow-xs"
                >
                  Book OPD Slot
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
