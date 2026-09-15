import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Receipt, 
  ShieldCheck, 
  Sparkles, 
  Database, 
  Zap, 
  CheckCircle2, 
  TrendingUp 
} from 'lucide-react';

interface AppLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

const loadingTips = [
  { icon: Database, text: 'Connecting to Supabase Cloud Database...' },
  { icon: ShieldCheck, text: 'Verifying 256-bit encrypted auth session...' },
  { icon: Receipt, text: 'Loading GST Invoices, Ledger Khata & Inventory...' },
  { icon: Zap, text: 'Preparing fast billing & report dashboard...' }
];

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  message = 'SR Group Bills & Khata',
  subMessage = 'Loading your business account & cloud data...'
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % loadingTips.length);
    }, 1800);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        return prev + Math.floor(Math.random() * 12) + 5;
      });
    }, 300);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
    };
  }, []);

  const CurrentIcon = loadingTips[tipIndex].icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden p-6 select-none">
      
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-slate-800/90 rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-black/60 flex flex-col items-center text-center">
        
        {/* Animated Brand Logo Icon */}
        <div className="relative mb-6">
          {/* Pulsing Outer Rings */}
          <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-md animate-ping opacity-60"></div>
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 blur-lg"></div>

          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-0.5 shadow-xl shadow-blue-600/30">
            <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-10 h-10 text-blue-400 animate-pulse" />
            </div>
          </div>

          {/* Mini active badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-md">
            <Zap className="w-3.5 h-3.5 text-white fill-white" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1 mb-6">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              {message}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Govt. Approved Electrical Contractor & Suppliers
          </p>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full space-y-2 mb-6">
          <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-blue-500/50"
              style={{ width: `${Math.min(progress, 96)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
            <span>Syncing Cloud State</span>
            <span className="text-blue-400 font-semibold">{Math.min(progress, 96)}%</span>
          </div>
        </div>

        {/* Rotating Live Loading Status Tip */}
        <div className="w-full min-h-[44px] bg-slate-950/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2.5 transition-all duration-300">
          <CurrentIcon className="w-4 h-4 text-blue-400 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
          <p className="text-xs text-slate-300 font-medium truncate">
            {loadingTips[tipIndex].text}
          </p>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-2 w-full mt-6 pt-5 border-t border-slate-800/70">
          <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800/40 py-1.5 px-2 rounded-xl border border-slate-700/30">
            <Receipt className="w-3 h-3 text-blue-400" />
            <span>GST Bills</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800/40 py-1.5 px-2 rounded-xl border border-slate-700/30">
            <TrendingUp className="w-3 h-3 text-indigo-400" />
            <span>Khata Book</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800/40 py-1.5 px-2 rounded-xl border border-slate-700/30">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Encrypted</span>
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <p className="relative z-10 text-[11px] text-slate-400 mt-6 font-medium">
        Powered by <span className="text-slate-300 font-semibold">Supabase Cloud</span> • High Security Architecture
      </p>

    </div>
  );
};
