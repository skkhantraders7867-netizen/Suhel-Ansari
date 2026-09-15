import React, { useState, useEffect } from 'react';
import { 
  Database, Cloud, RefreshCw, CheckCircle2, AlertCircle, 
  Copy, Check, ExternalLink, ShieldCheck, ArrowDownCircle, 
  ArrowUpCircle, HardDrive, Sparkles, X, Terminal, Server,
  Table, Layers, Send
} from 'lucide-react';
import { 
  getCloudSyncState, 
  subscribeToSyncState, 
  CloudSyncState, 
  SUPABASE_SQL_SCHEMA,
  pushUserAccountDataToSupabaseNow,
  fetchUserAccountDataFromSupabase
} from '../utils/supabaseSync';
import { testSupabaseConnection, SUPABASE_PROJECT_ID, SUPABASE_URL } from '../utils/supabaseClient';
import { AuthUser } from '../types';
import { UserAccountData } from '../utils/userDataStorage';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  currentData: UserAccountData;
  onDataRestored?: (data: UserAccountData) => void;
  onClearAllData?: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentData,
  onDataRestored,
  onClearAllData,
}) => {
  const [syncState, setSyncState] = useState<CloudSyncState>(getCloudSyncState());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [showSqlEditorTab, setShowSqlEditorTab] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSyncState(state => setSyncState({ ...state }));
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualPush = async () => {
    if (!currentUser) return;
    setIsManualSyncing(true);
    setSyncMessage(null);
    try {
      const res = await pushUserAccountDataToSupabaseNow(currentUser, currentData);
      setSyncMessage({ success: res.success, text: res.message });
    } catch (e: any) {
      setSyncMessage({ success: false, text: e.message || 'Push failed' });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleManualPull = async () => {
    if (!currentUser || !onDataRestored) return;
    setIsManualSyncing(true);
    setSyncMessage(null);
    try {
      const fetched = await fetchUserAccountDataFromSupabase(currentUser);
      if (fetched) {
        onDataRestored(fetched);
        setSyncMessage({ success: true, text: 'Latest cloud data restored successfully!' });
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Supabase Cloud Database</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-300">
                User data is automatically saved to Supabase (Project: <span className="font-mono text-emerald-300">{SUPABASE_PROJECT_ID}</span>)
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          
          {/* Status Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-950">Cloud Backend Status</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {syncState.status === 'SYNCING' ? 'Syncing...' : syncState.status === 'ERROR' ? 'Needs Schema Setup' : 'Connected & Active'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {syncState.lastSyncedAt 
                    ? `Last saved to cloud at: ${syncState.lastSyncedAt}`
                    : 'Changes auto-sync to Supabase when you create or edit bills & parties.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleManualPush}
              disabled={isManualSyncing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'Pushing Data...' : 'Push All to Supabase Now'}</span>
            </button>
          </div>

          {/* Sync status message feedback */}
          {syncMessage && (
            <div className={`p-3.5 rounded-xl text-xs font-semibold border flex items-start gap-2.5 ${
              syncMessage.success 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              {syncMessage.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span>{syncMessage.text}</span>
              </div>
            </div>
          )}

          {/* Connected User & Synced Inventory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-slate-500" />
                <span>Ready to Sync Records ({currentUser?.email})</span>
              </h3>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Auto-saved per user account
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Invoices &amp; Bills</span>
                <span className="text-lg font-black text-slate-900">{currentData.invoices?.length || 0}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Parties (Khata)</span>
                <span className="text-lg font-black text-slate-900">{currentData.parties?.length || 0}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Stock &amp; Items</span>
                <span className="text-lg font-black text-slate-900">{currentData.items?.length || 0}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Expenses &amp; Cash</span>
                <span className="text-lg font-black text-slate-900">
                  {(currentData.expenses?.length || 0) + (currentData.cashTransactions?.length || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Project Credentials & Diagnostic */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Supabase Project Credentials</span>
              </h3>
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/editor`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 underline underline-offset-2"
              >
                <span>Open Table Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Project ID</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{SUPABASE_PROJECT_ID}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Endpoint URL</span>
                <span className="font-mono text-slate-700 text-[11px] truncate block">{SUPABASE_URL}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing connection...' : 'Test Supabase Connection'}</span>
              </button>

              <span className="text-[11px] text-slate-500">
                Key: <span className="font-mono font-bold text-slate-700">sb_publishable_frnOJ...</span>
              </span>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs font-medium border flex items-start gap-2 ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* 1-Click SQL Script Setup */}
          <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-emerald-50/40">
            <div className="p-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600" />
                <span>Supabase SQL Table Setup Script</span>
              </div>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-2xs"
              >
                {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-900 text-slate-200 text-xs space-y-2.5">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Supabase Dashboard me table create karne ke liye: <a href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql`} target="_blank" rel="noreferrer" className="text-emerald-400 font-bold underline">SQL Editor</a> kholein, <strong>New Query</strong> me paste karein aur <strong>Run</strong> dabayein:
              </p>
              <pre className="p-3 bg-slate-950 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-300/90 leading-relaxed border border-slate-800 max-h-40">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Supabase Cloud Sync Active</span>
          </div>

          <div className="flex items-center gap-2">
            {onClearAllData && (
              <button
                onClick={() => {
                  onClearAllData();
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer"
              >
                Clear All Demo Data
              </button>
            )}
            {onDataRestored && (
              <button
                onClick={handleManualPull}
                disabled={isManualSyncing}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors cursor-pointer"
              >
                Pull Latest from Cloud
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
